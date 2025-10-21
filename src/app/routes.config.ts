import { Application, Request, Response } from "express";

import apiRoutes from "../routes";

export const setupRoutes = (app: Application): void => {
  // API routes
  app.use("/api", apiRoutes);

  // Admin interface
  app.get("/", (req: Request, res: Response) => {
    res.sendFile(
      require("path").join(__dirname, "..", "admin-csp-compliant.html")
    );
  });

  // Health check
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });
};
