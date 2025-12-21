import { Request, Response } from "express";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";

class AppController {
  /**
   * Get all apps accessible to user
   * GET /api/apps
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Query apps manually based on permissions to avoid RPC issues with auth.uid() in backend

      // 1. Get direct app permissions
      const perms = await supabaseService.query("app_permissions", {
        select: "app_id",
        eq: { user_id: userId },
      });
      const directAppIds = (perms.data || []).map((p: any) => p.app_id);

      // 2. Get org admin memberships (Owners/Admins see all apps in those orgs)
      const { data: orgMembers, error: orgError } = await supabaseService
        .getClient()
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"]);

      if (orgError) throw orgError;

      const orgIds = (orgMembers || []).map((o: any) => o.organization_id);

      // 3. Build dynamic query
      const filters: string[] = [];
      if (directAppIds.length > 0) {
        filters.push(`id.in.(${directAppIds.join(",")})`);
      }
      if (orgIds.length > 0) {
        filters.push(`organization_id.in.(${orgIds.join(",")})`);
      }

      if (filters.length === 0) {
        res.json([]);
        return;
      }

      const { data, error } = await supabaseService
        .getClient()
        .from("apps")
        .select("*")
        .or(filters.join(","));

      if (error) throw error;
      res.json(data);
    } catch (error) {
      logger.error("List apps failed", { error });
      res.status(500).json({ error: "Failed to list apps" });
    }
  }

  /**
   * Get app details
   * GET /api/apps/:id
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await supabaseService.query("apps", {
        select: "*",
        eq: { id },
      });

      if (!result.data || result.data.length === 0) {
        res.status(404).json({ error: "App not found" });
        return;
      }
      // TODO: Check permission again here?
      // Middleware should handle general auth, but permission specific to this app?
      // YES. Logic: can_access_app.

      res.json(result.data[0]);
    } catch (error) {
      logger.error("Get app failed", { error });
      res.status(500).json({ error: "Failed to get app" });
    }
  }

  /**
   * Create new app
   * POST /api/apps
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, app_id, organization_id, platform, icon_url } = req.body;
      const userId = (req as any).user?.id;

      if (!name || !app_id || !organization_id) {
        res.status(400).json({
          error: "Name, app_id and organization_id are required",
        });
        return;
      }

      const result = await supabaseService.insert("apps", {
        name,
        app_id,
        organization_id,
        platform: platform || "all",
        icon_url,
      });
      const app = result[0];

      // Add 'admin' permission to creator for this app
      await supabaseService.insert("app_permissions", {
        app_id: app.id,
        user_id: userId,
        role: "admin",
      });

      res.status(201).json(app);
    } catch (error) {
      logger.error("Create app failed", { error });
      res.status(500).json({ error: "Failed to create app" });
    }
  }

  /**
   * Update app
   * PUT /api/apps/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      delete updateData.id;

      // Ensure updated_at is set
      const dataToUpdate = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      const result = await supabaseService.update("apps", dataToUpdate, { id });

      if (!result || result.length === 0) {
        res.status(404).json({ error: "App not found" });
        return;
      }

      res.json(result[0]);
    } catch (error) {
      logger.error("Update app failed", { error });
      res.status(500).json({ error: "Failed to update app" });
    }
  }

  /**
   * Get app permissions
   * GET /api/apps/:id/permissions
   */
  async getPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseService
        .getClient()
        .from("app_permissions")
        .select("*, users(id, email, full_name, avatar_url)")
        .eq("app_id", id);

      if (error) throw error;
      res.json(data);
    } catch (error) {
      logger.error("Get app permissions failed", { error });
      res.status(500).json({ error: "Failed to get app permissions" });
    }
  }

  /**
   * Set app permission for a user
   * POST /api/apps/:id/permissions
   */
  async setPermission(req: Request, res: Response): Promise<void> {
    try {
      const { id: appId } = req.params;
      const { user_id, role } = req.body;

      if (!user_id || !role) {
        res.status(400).json({ error: "user_id and role are required" });
        return;
      }

      // Upsert permission
      const { data, error } = await supabaseService
        .getClient()
        .from("app_permissions")
        .upsert(
          {
            app_id: appId,
            user_id,
            role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "app_id,user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      logger.error("Set app permission failed", { error });
      res.status(500).json({ error: "Failed to set app permission" });
    }
  }

  /**
   * Remove app permission for a user
   * DELETE /api/apps/:id/permissions/:userId
   */
  async removePermission(req: Request, res: Response): Promise<void> {
    try {
      const { id: appId, userId } = req.params;

      const { error } = await supabaseService
        .getClient()
        .from("app_permissions")
        .delete()
        .match({ app_id: appId, user_id: userId });

      if (error) throw error;
      res.status(204).send();
    } catch (error) {
      logger.error("Remove app permission failed", { error });
      res.status(500).json({ error: "Failed to remove app permission" });
    }
  }

  /**
   * Delete app
   * DELETE /api/apps/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await supabaseService.delete("apps", { id });
      res.status(204).send();
    } catch (error) {
      logger.error("Delete app failed", { error });
      res.status(500).json({ error: "Failed to delete app" });
    }
  }
}

export default new AppController();
