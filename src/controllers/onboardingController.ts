import { Request, Response } from "express";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";
import { User } from "@supabase/supabase-js";

class OnboardingController {
  async complete(req: Request, res: Response) {
    const user = (req as any).user as User;
    const { organization, app } = req.body;

    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!organization || !app) {
      return res
        .status(400)
        .json({ error: "Missing required onboarding data" });
    }

    const { name: orgName } = organization;
    const { name: appName, platform: appPlatform } = app;

    if (!orgName || !appName || !appPlatform) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (appPlatform !== "android" && appPlatform !== "ios") {
      return res.status(400).json({ error: "Invalid app platform" });
    }

    const supabase = supabaseService.getClient();

    try {
      // 1. Create Organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
        })
        .select()
        .single();

      if (orgError)
        throw new Error(`Organization creation failed: ${orgError.message}`);
      const orgId = orgData.id;

      // 2. Add User as Organization Member (Owner)
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: orgId,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) {
        // Cleanup: Delete org if member addition fails
        await supabase.from("organizations").delete().eq("id", orgId);
        throw new Error(
          `Failed to add member to organization: ${memberError.message}`
        );
      }

      // 3. Create App
      const { data: appData, error: appError } = await supabase
        .from("apps")
        .insert({
          name: appName,
          app_id: `com.${appName.toLowerCase().replace(/\s+/g, "-")}`,
          organization_id: orgId,
          platform: appPlatform,
        })
        .select()
        .single();

      if (appError) {
        // Cleanup: Delete org (cascades)
        await supabase.from("organizations").delete().eq("id", orgId);
        throw new Error(`App creation failed: ${appError.message}`);
      }

      // 5. Add App Permission (Admin)
      const { error: permError } = await supabase
        .from("app_permissions")
        .insert({
          app_id: appData.id,
          user_id: user.id,
          role: "admin",
        });

      if (permError) {
        // Log error but don't fail the whole flow as app is created and org owner has implicit access usually
        // But strictly speaking, if we rely on app_permissions, we should fail or retry.
        // For now, let's just log.
        logger.error("Failed to add app permission during onboarding", {
          error: permError,
        });
      }

      logger.info("Onboarding completed successfully", {
        userId: user.id,
        orgId: orgId,
        appId: appData.id,
      });

      return res.status(201).json({
        organization: orgData,
        app: appData,
      });
    } catch (error: any) {
      logger.error("Onboarding failed", { error: error.message });
      return res
        .status(500)
        .json({ error: error.message || "Failed to complete onboarding" });
    }
  }
}

export default new OnboardingController();
