import { Request, Response } from "express";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";

class UserController {
  /**
   * Get current user profile
   * GET /api/users/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const result = await supabaseService.query("users", {
        select: "*",
        eq: { id: userId },
      });

      if (!result.data || result.data.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json(result.data[0]);
    } catch (error) {
      logger.error("Get profile failed", { error });
      res.status(500).json({ error: "Failed to get profile" });
    }
  }

  /**
   * Update current user profile
   * PUT /api/users/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { full_name, avatar_url } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const result = await supabaseService.update(
        "users",
        {
          full_name,
          avatar_url,
          updated_at: new Date().toISOString(),
        },
        { id: userId }
      );

      res.json(result[0]);
    } catch (error) {
      logger.error("Update profile failed", { error });
      res.status(500).json({ error: "Failed to update profile" });
    }
  }

  /**
   * Get combined dashboard context (user, org)
   * GET /api/dashboard/context
   */
  async getDashboardContext(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // 1. Get User
      const userRes = await supabaseService.query("users", {
        select: "*",
        eq: { id: userId },
      });
      const user = userRes.data?.[0] || null;

      // 2. Get Orgs (via membership)
      const orgMembersRes = await supabaseService
        .getClient()
        .from("organization_members")
        .select("role, organization:organizations(*)")
        .eq("user_id", userId);

      const organizations = (orgMembersRes.data || []).map((item: any) => ({
        ...item.organization,
        role: item.role, // include user's role in the org object for convenience
      }));

      res.json({
        user,
        organizations,
      });
    } catch (error) {
      logger.error("Get dashboard context failed", { error });
      res.status(500).json({ error: "Failed to get dashboard context" });
    }
  }
}

export default new UserController();
