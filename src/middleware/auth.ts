import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/types";
import supabaseService from "@/services/supabaseService";
import rbacService from "@/services/rbacService";
import logger from "@/utils/logger";

// Middleware to authenticate user using Supabase Auth
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Use Supabase Auth to validate the token
    const { data, error } = await supabaseService.getClient().auth.getUser(token);

    if (error || !data.user) {
      logger.info("Invalid or expired token", { error: error?.message });
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Get user profile from our custom users table
    const userProfiles = await supabaseService.query("users", {
      match: { id: data.user.id },
      select: "id, email, first_name, last_name, phone, is_active, is_verified, created_at, updated_at"
    });

    let userProfile = null;
    if (userProfiles.data && userProfiles.data.length > 0) {
      const dbUser = userProfiles.data[0];
      userProfile = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        phone: dbUser.phone,
        isActive: dbUser.is_active ?? true,
        isVerified: dbUser.is_verified,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
      };
    } else {
      // If no profile exists in our custom table, use Supabase user data
      userProfile = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata?.first_name,
        lastName: data.user.user_metadata?.last_name,
        phone: data.user.phone,
        isActive: true, // Default to active
        isVerified: !!data.user.email_confirmed_at,
        createdAt: data.user.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(), // Updated at might not exist in Supabase user
      };
    }

    // Add user to request object
    const authenticatedReq = req as unknown as AuthenticatedRequest;
    authenticatedReq.user = userProfile;

    logger.info("User authenticated via Supabase Auth", { userId: userProfile.id, ip: req.ip });
    next();
  } catch (error) {
    logger.error("Authentication middleware failed", { error, ip: req.ip });
    res.status(500).json({ error: "Authentication error" });
  }
};

// Middleware to authorize user for specific permissions
export const authorize = (permission: string, appId?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedReq = req as unknown as AuthenticatedRequest;

      if (!authenticatedReq.user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      // Authorize user for the specific permission and app
      const isAuthorized = await rbacService.authorizeUser(
        authenticatedReq.user.id,
        permission as any, // Type assertion since we're accepting a string
        appId
      );

      if (!isAuthorized) {
        res.status(403).json({
          error: `Insufficient permissions. Required: ${permission}`
        });
        return;
      }

      logger.info("User authorized", {
        userId: authenticatedReq.user.id,
        permission,
        appId,
        ip: req.ip
      });

      next();
    } catch (error) {
      logger.error("Authorization middleware failed", { error, ip: req.ip });
      res.status(500).json({ error: "Authorization error" });
    }
  };
};

// Middleware to get user permissions and attach to request
export const getUserPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authenticatedReq = req as unknown as AuthenticatedRequest;

    if (!authenticatedReq.user) {
      // If not authenticated, continue without permissions
      next();
      return;
    }

    // Get user's permissions for the specific app context (if available)
    const appId = req.params.appId || (req.body.appId as string) || (req.query.appId as string);
    const permissions = await rbacService.getUserPermissions(
      authenticatedReq.user.id,
      appId
    );

    // Add permissions to request object
    authenticatedReq.permissions = permissions;

    logger.info("Permissions loaded", {
      userId: authenticatedReq.user.id,
      permissions: permissions.length,
      appId,
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.error("Permission loading middleware failed", { error, ip: req.ip });
    next(); // Continue with request even if permission loading fails
  }
};

// Middleware to ensure user has access to the specific app
export const appAccess = (appIdParam: string = 'appId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedReq = req as unknown as AuthenticatedRequest;

      if (!authenticatedReq.user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      // Get app ID from request parameters, body, or query
      const appId = req.params[appIdParam] ||
                   (req.body[appIdParam] as string) ||
                   (req.query[appIdParam] as string);

      if (!appId) {
        res.status(400).json({ error: `App ID is required (${appIdParam})` });
        return;
      }

      // Get user's apps to check if they have access to this app
      const userApps = await rbacService.getUserApps(authenticatedReq.user.id);
      const hasAppAccess = userApps.some(app => app.id === appId);

      if (!hasAppAccess) {
        res.status(403).json({
          error: `User does not have access to app ${appId}`
        });
        return;
      }

      // Add app to request object (only if found)
      const app = userApps.find(app => app.id === appId);
      if (app) {
        authenticatedReq.app = app;
      }

      logger.info("App access granted", {
        userId: authenticatedReq.user.id,
        appId,
        ip: req.ip
      });

      next();
    } catch (error) {
      logger.error("App access middleware failed", { error, ip: req.ip });
      res.status(500).json({ error: "App access check failed" });
    }
  };
};