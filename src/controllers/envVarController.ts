import { Request, Response } from "express";
import { ValidationError, ISupabaseService } from "@/types";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";

export interface EnvVar {
  id?: string;
  app_id: string;
  key: string;
  value: string;
  value_type: "string" | "number" | "boolean" | "json";
  environment: "production" | "staging" | "development" | "all";
  channel?: string | null;
  is_secret: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EnvVarCreateRequest {
  key: string;
  value: string;
  value_type?: "string" | "number" | "boolean" | "json";
  environment: string;
  channel?: string;
  is_secret?: boolean;
  description?: string;
}

class EnvVarController {
  constructor(private readonly supabaseService: ISupabaseService) {}

  private async resolveAppUuid(appIdString: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from("apps")
        .select("id")
        .eq("app_id", appIdString)
        .maybeSingle();
      if (error) return null;
      return data?.id || null;
    } catch {
      return null;
    }
  }

  async getEnvVars(req: Request, res: Response): Promise<void> {
    try {
      const { app_id, environment } = req.query;

      if (!app_id) {
        throw new ValidationError("app_id is required");
      }

      const appUuid = await this.resolveAppUuid(app_id as string);
      if (!appUuid) {
        res.json([]);
        return;
      }

      let query = this.supabaseService
        .getClient()
        .from("app_env_vars")
        .select("*")
        .eq("app_id", appUuid)
        .order("key", { ascending: true });

      if (environment) {
        query = query.eq("environment", environment);
      }

      const { data, error } = await query;
      if (error) throw error;

      const result = (data || []).map((v: EnvVar) => ({
        ...v,
        value: v.is_secret ? "••••••••" : v.value,
        _hasSecret: v.is_secret,
      }));

      res.json(result);
    } catch (error) {
      logger.error("Failed to fetch env vars", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: "Failed to fetch environment variables" });
      }
    }
  }

  async createEnvVar(req: Request, res: Response): Promise<void> {
    try {
      const { app_id } = req.query;
      const envVarData: EnvVarCreateRequest = req.body;

      if (!app_id) {
        throw new ValidationError("app_id is required");
      }

      if (!envVarData.key || !envVarData.value || !envVarData.environment) {
        throw new ValidationError("key, value, and environment are required");
      }

      const appUuid = await this.resolveAppUuid(app_id as string);
      if (!appUuid) {
        throw new ValidationError("App not found");
      }

      const record: Omit<EnvVar, "id" | "created_at" | "updated_at"> = {
        app_id: appUuid,
        key: envVarData.key.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
        value: envVarData.value,
        value_type: envVarData.value_type || "string",
        environment: envVarData.environment as EnvVar["environment"],
        channel: envVarData.channel || null,
        is_secret: envVarData.is_secret || false,
        description: envVarData.description || null,
      };

      const { data, error } = await this.supabaseService
        .getClient()
        .from("app_env_vars")
        .insert(record)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ValidationError(
            "Variable with this key already exists for this environment/channel"
          );
        }
        throw error;
      }

      logger.info("Created env var", { key: record.key, app_id: appUuid });
      res.status(201).json(data);
    } catch (error) {
      logger.error("Failed to create env var", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: "Failed to create environment variable" });
      }
    }
  }

  async createBulkEnvVars(req: Request, res: Response): Promise<void> {
    try {
      const { app_id } = req.query;
      const { variables, environment } = req.body as {
        variables: Array<{ key: string; value: string; is_secret?: boolean }>;
        environment: string;
      };

      if (!app_id || !variables || !environment) {
        throw new ValidationError(
          "app_id, variables, and environment are required"
        );
      }

      const appUuid = await this.resolveAppUuid(app_id as string);
      if (!appUuid) {
        throw new ValidationError("App not found");
      }

      const records = variables.map((v) => ({
        app_id: appUuid,
        key: v.key.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
        value: v.value,
        value_type: "string" as const,
        environment,
        channel: null,
        is_secret: v.is_secret || false,
        description: null,
      }));

      const { data, error } = await this.supabaseService
        .getClient()
        .from("app_env_vars")
        .upsert(records, { onConflict: "app_id,key,environment,channel" })
        .select();

      if (error) throw error;

      logger.info("Bulk created env vars", {
        count: records.length,
        app_id: appUuid,
      });
      res.status(201).json({ created: data?.length || 0, variables: data });
    } catch (error) {
      logger.error("Failed to bulk create env vars", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: "Failed to import environment variables" });
      }
    }
  }

  async updateEnvVar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.key) {
        updateData.key = updateData.key
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, "_");
      }

      const { data, error } = await this.supabaseService
        .getClient()
        .from("app_env_vars")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new ValidationError("Environment variable not found");

      logger.info("Updated env var", { id });
      res.json(data);
    } catch (error) {
      logger.error("Failed to update env var", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: "Failed to update environment variable" });
      }
    }
  }

  async deleteEnvVar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { error } = await this.supabaseService
        .getClient()
        .from("app_env_vars")
        .delete()
        .eq("id", id);

      if (error) throw error;

      logger.info("Deleted env var", { id });
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete env var", { error });
      res.status(500).json({ error: "Failed to delete environment variable" });
    }
  }

  async revealSecret(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data, error } = await this.supabaseService
        .getClient()
        .from("app_env_vars")
        .select("value")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new ValidationError("Environment variable not found");

      res.json({ value: data.value });
    } catch (error) {
      logger.error("Failed to reveal secret", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to reveal secret" });
      }
    }
  }

  async parseEnvContent(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body as { content: string };

      if (!content) {
        throw new ValidationError("content is required");
      }

      const lines = content.split("\n");
      const variables: Array<{ key: string; value: string }> = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/i);
        if (match) {
          let value = match[2] || "";
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          variables.push({
            key: match[1]!.toUpperCase(),
            value,
          });
        }
      }

      res.json({ variables, count: variables.length });
    } catch (error) {
      logger.error("Failed to parse env content", { error });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to parse content" });
      }
    }
  }
}

export default new EnvVarController(supabaseService);
