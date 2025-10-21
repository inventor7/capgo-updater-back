import express, { Application } from "express";
import path from "path";

import {
  securityHeaders,
 corsMiddleware,
  rateLimiter,
  sanitizeRequest,
} from "../middleware/security";
import { requestLogger } from "../utils/logger";

export const configureMiddleware = (app: Application): void => {
  // Trust proxy for accurate IP addresses
  app.set("trust proxy", 1);

  // Security middleware
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(rateLimiter);

  // Body parsing middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Logging middleware
  app.use(requestLogger);

  // Request sanitization
  app.use(sanitizeRequest);

  // Static file serving
  app.use("/bundles", express.static(path.join(__dirname, "..", "uploads")));
};
