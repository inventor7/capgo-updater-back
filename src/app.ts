import express, { Application } from "express";
import path from "path";

// Import configuration and utilities
import config from "./config";
import logger, { requestLogger } from "./utils/logger";

// Import middleware
import {
  securityHeaders,
  corsMiddleware,
  rateLimiter,
  sanitizeRequest,
} from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Import routes
import apiRoutes from "./routes";

// Create Express application
const app: Application = express();

// Trust proxy for accurate IP addresses
app.set("trust proxy", 1);

// Security middleware
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(rateLimiter);

// Logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request sanitization
app.use(sanitizeRequest);

// Static file serving
app.use("/bundles", express.static(path.join(__dirname, "..", "uploads")));

// API routes
app.use("/", apiRoutes);

// Admin interface
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "admin-csp-compliant.html"));
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Server configuration
let server: Application;

// Always use HTTP server
server = app;
logger.info("Starting HTTP server");

// Start server
const startServer = () => {
  server.listen(config.port, () => {
    logger.info("Server started successfully", {
      port: config.port,
      environment: config.environment,
      supabaseUrl: config.supabase.url,
      bucketName: config.supabase.bucketName,
    });

    console.log(
      `🚀 Capgo self-hosted update server running on port ${config.port}`
    );
    console.log(`📝 Environment: ${config.environment}`);
    console.log(`🔗 Admin interface: http://localhost:${config.port}`);
    console.log(`📊 Health check: http://localhost:${config.port}/health`);
  });
};

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down server...");
  process.exit(0);
});

export default app;
export { startServer };
