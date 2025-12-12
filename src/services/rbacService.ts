import { IRBACService, User, App, Role, Team, TeamMembership, Permission } from "@/types";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";

class RBACService implements IRBACService {
  async authenticateToken(token: string): Promise<User | null> {
    try {
      logger.info("Authenticating token", { hasToken: !!token });

      // Find session by token
      const sessions = await supabaseService.query("user_sessions", {
        match: { token },
        select: "user_id, expires_at"
      });

      if (!sessions.data || sessions.data.length === 0) {
        logger.info("No session found for token");
        return null;
      }

      const session = sessions.data[0];

      // Check if session is expired
      const expiryDate = new Date(session.expires_at);
      if (expiryDate < new Date()) {
        logger.info("Session token expired");
        // Delete expired session
        await supabaseService.delete("user_sessions", { id: session.id });
        return null;
      }

      // Update last accessed
      await supabaseService.update("user_sessions", {
        last_accessed: new Date().toISOString()
      }, { id: session.id });

      // Get user information
      const users = await supabaseService.query("users", {
        match: { id: session.user_id, is_active: true },
        select: "id, email, first_name, last_name, phone, is_active, is_verified, created_at, updated_at"
      });

      if (!users.data || users.data.length === 0) {
        logger.warn("User for token not found or inactive", { userId: session.user_id });
        return null;
      }

      const user = users.data[0];
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        isActive: user.is_active,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      logger.error("Token authentication failed", { error, hasToken: !!token });
      return null;
    }
  }

  async authorizeUser(userId: string, permission: Permission, appId?: string): Promise<boolean> {
    try {
      logger.info("Authorizing user", { userId, permission, appId });

      // Get user permissions for the specific app or system-wide
      const userPermissions = await this.getUserPermissions(userId, appId);

      // Check if user has the required permission
      // Support wildcard permissions
      if (userPermissions.includes('*')) {
        return true;
      }

      // Check exact permission match
      if (userPermissions.includes(permission)) {
        return true;
      }

      // Check for wildcard category permissions (e.g., "read:*" for "read:app")
      const category = permission.split(':')[0];
      if (userPermissions.includes(`${category}:*`)) {
        return true;
      }

      logger.info("User not authorized", { userId, permission, appId });
      return false;
    } catch (error) {
      logger.error("Authorization check failed", { error, userId, permission, appId });
      return false;
    }
  }

  async getUserPermissions(userId: string, appId?: string): Promise<string[]> {
    try {
      logger.info("Getting user permissions", { userId, appId });

      // Get all roles associated with the user for the specific app or system-wide
      const memberships = await supabaseService.query(
        "team_memberships",
        {
          select: "role_id",
          match: { user_id: userId }
        }
      );

      if (!memberships.data || memberships.data.length === 0) {
        logger.info("No team memberships found for user", { userId });
        return [];
      }

      // Get the role IDs from memberships
      const roleIds = memberships.data?.map((m: any) => m.role_id) || [];

      // Get roles that match either specific app or system-wide (app_id is null)
      let roleQuery: any = {
        select: "permissions, app_id",
        match: { id: roleIds[0] } // Start with the first ID
      };

      // Handle multiple IDs by using 'in' operator
      if (roleIds.length > 1) {
        // For 'in' queries, we need to handle this differently based on the Supabase service implementation
        // This might need adjustment based on your actual service
        const rolesPromises = roleIds.map((roleId: string) =>
          supabaseService.query("roles", {
            select: "permissions, app_id",
            match: { id: roleId }
          })
        );
        
        const rolesResults = await Promise.all(rolesPromises);
        const allRoles = rolesResults.flatMap(result => result.data || []);
        
        // Filter roles based on app context
        const filteredRoles = allRoles.filter((role: any) =>
          (appId && role.app_id === appId) || (!appId && role.app_id === null)
        );

        const allPermissions = filteredRoles.flatMap((role: any) =>
          (role.permissions as string[]) || []
        );

        // Remove duplicates and return
        return [...new Set(allPermissions)] as string[];
      } else {
        // Handle single ID case
        const roles = await supabaseService.query("roles", {
          select: "permissions, app_id",
          match: { id: roleIds[0] }
        });

        // Filter roles based on app context
        const filteredRoles = (roles.data || []).filter((role: any) =>
          (appId && role.app_id === appId) || (!appId && role.app_id === null)
        );

        const allPermissions = filteredRoles.flatMap((role: any) =>
          (role.permissions as string[]) || []
        );

        return [...new Set(allPermissions)] as string[];
      }
    } catch (error) {
      logger.error("Getting user permissions failed", { error, userId, appId });
      return [];
    }
  }

  async getUserApps(userId: string): Promise<App[]> {
    try {
      logger.info("Getting user apps", { userId });

      // Get user teams
      const memberships = await supabaseService.query(
        "team_memberships",
        {
          select: "team_id",
          match: { user_id: userId }
        }
      );

      if (!memberships.data || memberships.data.length === 0) {
        return [];
      }

      // Get team IDs
      const teamIds = memberships.data?.map((m: any) => m.team_id) || [];

      // Get teams
      const teams = await supabaseService.query("teams", {
        select: "app_id",
        match: { id: teamIds[0] } // Start with first ID
      });

      if (!teams.data || teams.data.length === 0) {
        return [];
      }

      // Get app IDs from teams
      const appIds = teams.data?.map((t: any) => t.app_id) || [];

      // Get apps
      const apps = await supabaseService.query("apps", {
        select: "id, name, app_identifier, description, created_at, updated_at",
        match: { id: appIds[0] }
      });

      // Handle multiple apps if needed
      if (appIds.length > 1) {
        const allAppsPromises = appIds.map((appId: string) =>
          supabaseService.query("apps", {
            select: "id, name, app_identifier, description, created_at, updated_at",
            match: { id: appId }
          })
        );
        
        const allAppsResults = await Promise.all(allAppsPromises);
        const allApps = allAppsResults.flatMap(result => result.data || []);
        
        return allApps;
      } else {
        return apps.data || [];
      }
    } catch (error) {
      logger.error("Getting user apps failed", { error, userId });
      return [];
    }
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    try {
      logger.info("Getting user teams", { userId });

      // Get user memberships
      const memberships = await supabaseService.query(
        "team_memberships",
        {
          select: "team_id",
          match: { user_id: userId }
        }
      );

      if (!memberships.data || memberships.data.length === 0) {
        return [];
      }

      // Get team IDs
      const teamIds = memberships.data?.map((m: any) => m.team_id) || [];

      // Get teams
      const teams = await supabaseService.query("teams", {
        select: "id, name, app_id, description, created_at, updated_at",
        match: { id: teamIds[0] } // Start with first team ID
      });

      // Handle multiple teams if needed
      if (teamIds.length > 1) {
        const allTeamsPromises = teamIds.map((teamId: string) =>
          supabaseService.query("teams", {
            select: "id, name, app_id, description, created_at, updated_at",
            match: { id: teamId }
          })
        );
        
        const allTeamsResults = await Promise.all(allTeamsPromises);
        const allTeams = allTeamsResults.flatMap(result => result.data || []);
        
        return allTeams;
      } else {
        return teams.data || [];
      }
    } catch (error) {
      logger.error("Getting user teams failed", { error, userId });
      return [];
    }
  }
}

export default new RBACService();