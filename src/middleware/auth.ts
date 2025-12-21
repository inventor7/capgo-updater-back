import { Request, Response, NextFunction } from "express";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error,
    } = await supabaseService.getClient().auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    (req as any).user = user;
    next();
  } catch (error) {
    logger.error("Authentication check failed", { error });
    res
      .status(500)
      .json({ error: "Internal server error during authentication" });
  }
};
