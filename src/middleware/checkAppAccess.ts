import { Request, Response, NextFunction } from "express";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";

export type AppRole = "admin" | "developer" | "tester" | "viewer";

/**
 * Middleware to check if user has access to an app
 * Access is granted if:
 * 1. User has a direct entry in app_permissions OR
 * 2. User is an owner/admin of the app's organization
 *
 * @param requiredRoles - Optional array of app roles required (e.g., ['admin', 'developer'])
 */
export const checkAppAccess = (requiredRoles?: AppRole[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const appId = req.params.id;
      if (!appId) {
        res.status(400).json({ error: "App ID is required" });
        return;
      }

      // 1. Check direct app permission
      const { data: permission } = await supabaseService
        .getClient()
        .from("app_permissions")
        .select("role")
        .eq("app_id", appId)
        .eq("user_id", userId)
        .single();

      if (permission) {
        // Has direct permission, check role if required
        if (
          requiredRoles &&
          !requiredRoles.includes(permission.role as AppRole)
        ) {
          res.status(403).json({
            error: `Insufficient app permissions. Required: ${requiredRoles.join(
              " or "
            )}`,
          });
          return;
        }
        (req as any).appRole = permission.role;
        (req as any).appId = appId;
        return next();
      }

      // 2. Fallback: Check if user is org admin for app's organization
      const { data: app } = await supabaseService
        .getClient()
        .from("apps")
        .select("organization_id")
        .eq("id", appId)
        .single();

      if (!app) {
        res.status(404).json({ error: "App not found" });
        return;
      }

      const { data: orgMember } = await supabaseService
        .getClient()
        .from("organization_members")
        .select("role")
        .eq("organization_id", app.organization_id)
        .eq("user_id", userId)
        .in("role", ["owner", "admin"])
        .single();

      if (!orgMember) {
        logger.warn("App access denied", { userId, appId });
        res.status(403).json({ error: "No access to this app" });
        return;
      }

      // Org admins get admin-level access to all org apps
      // But if specific roles are required and 'admin' is not in them, deny
      if (requiredRoles && !requiredRoles.includes("admin")) {
        res.status(403).json({
          error: `Insufficient app permissions. Required: ${requiredRoles.join(
            " or "
          )}`,
        });
        return;
      }

      (req as any).appRole = "admin"; // Org admins get admin access
      (req as any).appId = appId;
      (req as any).orgRole = orgMember.role;
      next();
    } catch (error) {
      logger.error("App access check error", { error });
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
};

/**
 * Convenience middleware: require admin role for the app
 */
export const requireAppAdmin = () => checkAppAccess(["admin"]);

/**
 * Convenience middleware: require at least developer access
 */
export const requireAppDeveloper = () => checkAppAccess(["admin", "developer"]);

/**
 * Convenience middleware: allow any viewer or above
 */
export const requireAppViewer = () =>
  checkAppAccess(["admin", "developer", "tester", "viewer"]);
