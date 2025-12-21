import { Request, Response, NextFunction } from "express";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";

export type OrgRole = "owner" | "admin" | "member";

/**
 * Middleware to check if user is a member of an organization
 * @param requiredRoles - Optional array of roles that are allowed (e.g., ['owner', 'admin'])
 * @param orgIdSource - Where to get the org ID from: 'params' (req.params.id), 'query', or 'body'
 */
export const checkOrgMembership = (
  requiredRoles?: OrgRole[],
  orgIdSource: "params" | "query" | "body" = "params"
) => {
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

      // Get organization ID from the specified source
      let orgId: string | undefined;
      switch (orgIdSource) {
        case "params":
          orgId = req.params.id;
          break;
        case "query":
          orgId = req.query.organization_id as string;
          break;
        case "body":
          orgId = req.body.organization_id;
          break;
      }

      if (!orgId) {
        res.status(400).json({ error: "Organization ID is required" });
        return;
      }

      // Check membership
      const { data, error } = await supabaseService
        .getClient()
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        logger.warn("Org membership check failed", { userId, orgId, error });
        res.status(403).json({ error: "Not a member of this organization" });
        return;
      }

      // Check role if required
      if (requiredRoles && !requiredRoles.includes(data.role as OrgRole)) {
        logger.warn("Insufficient org role", {
          userId,
          orgId,
          userRole: data.role,
          required: requiredRoles,
        });
        res.status(403).json({
          error: `Insufficient permissions. Required role: ${requiredRoles.join(
            " or "
          )}`,
        });
        return;
      }

      // Attach role to request for downstream use
      (req as any).orgRole = data.role;
      (req as any).orgId = orgId;
      next();
    } catch (error) {
      logger.error("Organization membership check error", { error });
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
};

/**
 * Middleware to check if user is an org admin (owner or admin role)
 * Convenience wrapper around checkOrgMembership
 */
export const requireOrgAdmin = (
  orgIdSource: "params" | "query" | "body" = "params"
) => checkOrgMembership(["owner", "admin"], orgIdSource);

/**
 * Middleware to check if user is the org owner
 */
export const requireOrgOwner = (
  orgIdSource: "params" | "query" | "body" = "params"
) => checkOrgMembership(["owner"], orgIdSource);
