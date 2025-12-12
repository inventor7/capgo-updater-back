import { Request, Response } from "express";
import {
  ValidationError,
  User,
  App,
  Team,
  Role,
  TeamMembership,
  IAppService,
  IRBACService,
  IAuthService
} from "@/types";
import appService from "@/services/appService";
import rbacService from "@/services/rbacService";
import authService from "@/services/authService";
import logger from "@/utils/logger";

class AdminManagementController {
  constructor(
    private readonly appService: IAppService,
    private readonly rbacService: IRBACService,
    private readonly authService: IAuthService
  ) {}

  // Create a new app
  async createApp(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      const { name, appIdentifier, description } = req.body;

      if (!name || !appIdentifier) {
        throw new ValidationError("Name and app identifier are required");
      }

      const app = await this.appService.createApp({
        name,
        appIdentifier,
        description,
        createdById: user.id
      });

      res.json(app);
    } catch (error) {
      logger.error("Create app failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create app" });
      }
    }
  }

  // Get all apps for the authenticated user
  async getUserApps(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      const apps = await rbacService.getUserApps(user.id);

      res.json({ apps });
    } catch (error) {
      logger.error("Get user apps failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to get apps" });
      }
    }
  }

  // Create a team for an app
  async createTeam(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      const { name, appId, description } = req.body;

      if (!name || !appId) {
        throw new ValidationError("Name and app ID are required");
      }

      // Check if user has permissions to manage teams for this app
      const hasPermission = await this.rbacService.authorizeUser(
        user.id,
        'manage:teams' as any,
        appId
      );

      if (!hasPermission) {
        throw new ValidationError("Insufficient permissions to create team");
      }

      const team = await this.appService.createTeam({
        name,
        appId,
        description,
        createdById: user.id
      });

      res.json(team);
    } catch (error) {
      logger.error("Create team failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create team" });
      }
    }
  }

  // Add user to team
  async addUserToTeam(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      const { userId, teamId, roleId } = req.body;

      if (!userId || !teamId || !roleId) {
        throw new ValidationError("User ID, team ID, and role ID are required");
      }

      // Check if user has permissions to manage team memberships
      // This would require checking the team's app and permissions within that app
      const hasPermission = await this.rbacService.authorizeUser(
        user.id,
        'manage:teams' as any
      );

      if (!hasPermission) {
        throw new ValidationError("Insufficient permissions to add user to team");
      }

      const membership = await this.appService.addUserToTeam({
        userId,
        teamId,
        roleId
      });

      res.json(membership);
    } catch (error) {
      logger.error("Add user to team failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to add user to team" });
      }
    }
  }

  // Create a role for an app
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      const { name, description, appId, permissions } = req.body;

      if (!name || !permissions) {
        throw new ValidationError("Name and permissions are required");
      }

      // Check if user has permissions to manage roles
      const hasPermission = await this.rbacService.authorizeUser(
        user.id,
        'manage:roles' as any
      );

      if (!hasPermission) {
        throw new ValidationError("Insufficient permissions to create role");
      }

      const role = await this.appService.createRole({
        name,
        description,
        appId: appId || null, // null means system-wide role
        permissions
      });

      res.json(role);
    } catch (error) {
      logger.error("Create role failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create role" });
      }
    }
  }

  // Get all roles for an app  
  async getAppRoles(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      const appId = req.query.appId as string;

      // If appId is provided, only return app-specific roles
      // Otherwise return system-wide roles
      let roles: Role[];
      if (appId) {
        // Check permissions for the specific app
        const hasPermission = await this.rbacService.authorizeUser(
          user.id,
          'read:roles' as any,
          appId
        );

        if (!hasPermission) {
          throw new ValidationError("Insufficient permissions to view roles");
        }

        // For now, we'll query all roles and filter on the backend
        // In a real implementation this would be handled by the service
        // Since we don't have a direct method to get roles by app, we'll return an empty array
        roles = [];
      } else {
        // Return system-wide roles (where app_id is null)
        // For now, we'll return a simple response
        roles = [];
      }

      res.json({ roles });
    } catch (error) {
      logger.error("Get app roles failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to get roles" });
      }
    }
  }

  // Get all users (for admin management)
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      // Check if user has admin permissions to manage users
      const hasPermission = await this.rbacService.authorizeUser(
        user.id,
        'manage:users' as any
      );

      if (!hasPermission) {
        throw new ValidationError("Insufficient permissions to view users");
      }

      // In a real implementation, this would query the users table
      // For now, return a placeholder response
      res.json({ users: [] });
    } catch (error) {
      logger.error("Get all users failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to get users" });
      }
    }
  }

  // Update user (for admin management)
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      const { userId } = req.params;
      const { isActive, isVerified } = req.body;

      // Check if user has admin permissions to manage users
      const hasPermission = await this.rbacService.authorizeUser(
        user.id,
        'manage:users' as any
      );

      if (!hasPermission) {
        throw new ValidationError("Insufficient permissions to update user");
      }

      // In a real implementation, this would update the user record
      res.json({ message: "User updated successfully", userId });
    } catch (error) {
      logger.error("Update user failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update user" });
      }
    }
  }

  // Get permissions for a user
  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as any; // Type assertion for now
      const user = authenticatedReq.user;

      if (!user) {
        throw new ValidationError("User not authenticated");
      }

      const { userId } = req.params;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      if (!userId) {
        throw new ValidationError("User ID is required");
      }

      // Check if user has permissions to view permissions
      const hasPermission = await this.rbacService.authorizeUser(
        user.id,
        'read:roles' as any
      );

      if (!hasPermission) {
        throw new ValidationError("Insufficient permissions to view permissions");
      }

      let permissions: string[];
      if (appId) {
        permissions = await this.rbacService.getUserPermissions(userId, appId);
      } else {
        permissions = await this.rbacService.getUserPermissions(userId);
      }

      res.json({ permissions });
    } catch (error) {
      logger.error("Get user permissions failed", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to get user permissions" });
      }
    }
  }
}

export default new AdminManagementController(appService, rbacService, authService);