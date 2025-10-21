import logger from "../utils/logger";

export const setupGracefulShutdown = (): void => {
  const shutdownHandler = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
  process.on("SIGINT", () => shutdownHandler("SIGINT"));
};
