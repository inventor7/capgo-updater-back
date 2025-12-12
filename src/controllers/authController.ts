import { Request, Response } from "express";
import {
  UserRegistration,
  UserLogin,
  ValidationError,
} from "@/types";
import authService from "@/services/authService";
import logger from "@/utils/logger";

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      logger.info("Registration request received", {
        email,
        firstName,
        lastName,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Validation
      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      if (password.length < 6) {
        throw new ValidationError("Password must be at least 6 characters long");
      }

      // Register user with Supabase Auth
      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
      });

      logger.info("User registered successfully", {
        userId: result.user.id,
        email: result.user.email,
      });

      res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        success: true,
      });
    } catch (error) {
      logger.error("Registration failed", {
        error: error instanceof Error ? error.message : String(error),
        email: req.body.email,
        ip: req.ip,
      });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Registration failed" });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      logger.info("Login request received", {
        email,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Validation
      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      // Authenticate user with Supabase Auth
      const result = await authService.login({
        email,
        password,
      });

      logger.info("User login successful", {
        userId: result.user.id,
        email: result.user.email,
      });

      res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        success: true,
      });
    } catch (error) {
      logger.error("Login failed", {
        error: error instanceof Error ? error.message : String(error),
        email: req.body.email,
        ip: req.ip,
      });
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Login failed" });
      }
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      await authService.logout();
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      logger.error("Logout failed", {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
      });
      res.status(500).json({ error: "Logout failed" });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      logger.info("Token refresh request received", {
        ip: req.ip,
      });

      // Extract token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // With Supabase Auth, this is handled automatically
      // We'll return the current session info
      const result = await authService.refreshToken(token);

      if (result) {
        logger.info("Session retrieved successfully", {
          userId: result.user.id,
        });

        res.json({
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          },
          success: true,
        });
      } else {
        res.status(401).json({ error: "No active session found" });
      }
    } catch (error) {
      logger.error("Session retrieval failed", {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
      });
      res.status(500).json({ error: "Session retrieval failed" });
    }
  }

  // Endpoint to get current user session (useful for frontend)
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      // Extract token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ authenticated: false });
        return;
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      const result = await authService.refreshToken(token);

      if (result && result.user) {
        res.json({
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          },
          authenticated: true,
        });
      } else {
        res.status(401).json({ authenticated: false });
      }
    } catch (error) {
      logger.error("Get session failed", {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
      });
      res.status(500).json({ error: "Get session failed" });
    }
  }
}

export default new AuthController();