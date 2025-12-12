import { App, Team, Role, TeamMembership, User } from "@/types";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";
import { ValidationError } from "@/types";

class AppService {
  // Create a new app
  async createApp(appData: {
    name: string;
    appIdentifier: string;
    description?: string;
    createdById: string;
  }): Promise<App> {
    try {
      logger.info("Creating new app", { 
        name: appData.name, 
        appIdentifier: appData.appIdentifier,
        createdById: appData.createdById 
      });

      // Check if app identifier already exists
      const existingApps = await supabaseService.query("apps", {
        match: { app_identifier: appData.appIdentifier },
        select: "id"
      });

      if (existingApps.data && existingApps.data.length > 0) {
        throw new ValidationError("App identifier already exists");
      }

      // Create the app
      const newApp = await supabaseService.insert("apps", [{
        name: appData.name,
        app_identifier: appData.appIdentifier,
        description: appData.description,
        created_by: appData.createdById
      }]);

      if (!newApp || newApp.length === 0) {
        throw new ValidationError("Failed to create app");
      }

      const result: App = {
        id: newApp[0].id,
        name: newApp[0].name,
        appIdentifier: newApp[0].app_identifier,
        description: newApp[0].description,
        createdById: newApp[0].created_by,
        createdAt: newApp[0].created_at,
        updatedAt: newApp[0].updated_at,
      };

      logger.info("App created successfully", { appId: result.id });
      return result;
    } catch (error) {
      logger.error("App creation failed", { error, ...appData });
      throw error;
    }
  }

  // Get an app by ID
  async getAppById(appId: string): Promise<App | null> {
    try {
      logger.info("Getting app by ID", { appId });

      const result = await supabaseService.query("apps", {
        match: { id: appId },
        select: "id, name, app_identifier, description, created_by, created_at, updated_at"
      });

      if (!result.data || result.data.length === 0) {
        logger.info("App not found", { appId });
        return null;
      }

      const app = result.data[0];
      return {
        id: app.id,
        name: app.name,
        appIdentifier: app.app_identifier,
        description: app.description,
        createdById: app.created_by,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
      };
    } catch (error) {
      logger.error("Getting app by ID failed", { error, appId });
      throw error;
    }
  }

  // Get apps by user ID
  async getUserApps(userId: string): Promise<App[]> {
    try {
      logger.info("Getting apps by user ID", { userId });

      // First get teams that the user is part of
      const teamMemberships = await supabaseService.query(
        "team_memberships",
        {
          match: { user_id: userId },
          select: "team_id"
        }
      );

      if (!teamMemberships.data || teamMemberships.data.length === 0) {
        logger.info("No teams found for user", { userId });
        return [];
      }

      // Get team IDs
      const teamIds = teamMemberships.data?.map((m: any) => m.team_id) || [];

      // Get teams
      const teams = await supabaseService.query("teams", {
        match: { id: teamIds[0] }, // Handle first ID initially
        select: "id, app_id, name, description, created_at, updated_at"
      });

      // Handle multiple teams if needed
      let allTeams: Team[] = [];
      if (teamIds.length > 1) {
        const additionalTeamsPromises = teamIds.slice(1).map((teamId: string) =>
          supabaseService.query("teams", {
            match: { id: teamId },
            select: "id, app_id, name, description, created_at, updated_at"
          })
        );
        
        const additionalTeamsResults = await Promise.all(additionalTeamsPromises);
        allTeams = [
          ...(teams.data || []),
          ...additionalTeamsResults.flatMap(result => result.data || [])
        ];
      } else {
        allTeams = teams.data || [];
      }

      // Extract app IDs
      const appIds = allTeams.map(t => t.appId);

      if (appIds.length === 0) {
        return [];
      }

      // Get apps
      const apps = await supabaseService.query("apps", {
        match: { id: appIds[0] },
        select: "id, name, app_identifier, description, created_by, created_at, updated_at"
      });

      // Handle multiple apps if needed
      let allApps: App[] = [];
      if (appIds.length > 1) {
        const additionalAppsPromises = appIds.slice(1).map((appId: string) =>
          supabaseService.query("apps", {
            match: { id: appId },
            select: "id, name, app_identifier, description, created_by, created_at, updated_at"
          })
        );
        
        const additionalAppsResults = await Promise.all(additionalAppsPromises);
        allApps = [
          ...(apps.data || []),
          ...additionalAppsResults.flatMap(result => result.data || [])
        ];
      } else {
        allApps = apps.data || [];
      }

      logger.info("Retrieved apps for user", { userId, appCount: allApps.length });
      return allApps;
    } catch (error) {
      logger.error("Getting user apps failed", { error, userId });
      throw error;
    }
  }

  // Create a team for an app
  async createTeam(teamData: {
    name: string;
    appId: string;
    description?: string;
    createdById: string;
  }): Promise<Team> {
    try {
      logger.info("Creating new team", { 
        name: teamData.name, 
        appId: teamData.appId,
        createdById: teamData.createdById 
      });

      // Verify app exists and user has permission
      const app = await this.getAppById(teamData.appId);
      if (!app) {
        throw new ValidationError("App not found");
      }

      // Create the team
      const newTeam = await supabaseService.insert("teams", [{
        name: teamData.name,
        app_id: teamData.appId,
        description: teamData.description,
        created_by: teamData.createdById
      }]);

      if (!newTeam || newTeam.length === 0) {
        throw new ValidationError("Failed to create team");
      }

      const result: Team = {
        id: newTeam[0].id,
        name: newTeam[0].name,
        appId: newTeam[0].app_id,
        description: newTeam[0].description,
        createdById: newTeam[0].created_by,
        createdAt: newTeam[0].created_at,
        updatedAt: newTeam[0].updated_at,
      };

      logger.info("Team created successfully", { teamId: result.id });
      return result;
    } catch (error) {
      logger.error("Team creation failed", { error, ...teamData });
      throw error;
    }
  }

  // Add user to team with specific role
  async addUserToTeam(membershipData: {
    userId: string;
    teamId: string;
    roleId: string;
  }): Promise<TeamMembership> {
    try {
      logger.info("Adding user to team", { 
        userId: membershipData.userId,
        teamId: membershipData.teamId,
        roleId: membershipData.roleId
      });

      // Verify user, team, and role exist
      // This could include additional validation to ensure user has permission to add others

      // Create team membership
      const newMembership = await supabaseService.insert("team_memberships", [{
        user_id: membershipData.userId,
        team_id: membershipData.teamId,
        role_id: membershipData.roleId
      }]);

      if (!newMembership || newMembership.length === 0) {
        throw new ValidationError("Failed to add user to team");
      }

      const result: TeamMembership = {
        id: newMembership[0].id,
        userId: newMembership[0].user_id,
        teamId: newMembership[0].team_id,
        roleId: newMembership[0].role_id,
        joinedAt: newMembership[0].joined_at,
      };

      logger.info("User added to team successfully", { membershipId: result.id });
      return result;
    } catch (error) {
      logger.error("Adding user to team failed", { error, ...membershipData });
      throw error;
    }
  }

  // Create a custom role for an app
  async createRole(roleData: {
    name: string;
    description?: string;
    appId: string; // app-specific role, null for system-wide
    permissions: string[];
  }): Promise<Role> {
    try {
      logger.info("Creating new role", { 
        name: roleData.name, 
        appId: roleData.appId,
        permissionCount: roleData.permissions.length
      });

      // Create the role
      const newRole = await supabaseService.insert("roles", [{
        name: roleData.name,
        description: roleData.description,
        app_id: roleData.appId,
        permissions: roleData.permissions
      }]);

      if (!newRole || newRole.length === 0) {
        throw new ValidationError("Failed to create role");
      }

      const result: Role = {
        id: newRole[0].id,
        name: newRole[0].name,
        description: newRole[0].description,
        appId: newRole[0].app_id,
        permissions: newRole[0].permissions as string[],
        createdAt: newRole[0].created_at,
        updatedAt: newRole[0].updated_at,
      };

      logger.info("Role created successfully", { roleId: result.id });
      return result;
    } catch (error) {
      logger.error("Role creation failed", { error, ...roleData });
      throw error;
    }
  }
}

export default new AppService();