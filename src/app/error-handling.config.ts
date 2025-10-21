import { Application } from "express";

import { errorHandler, notFoundHandler } from "../middleware/errorHandler";

export const setupErrorHandling = (app: Application): void => {
  // 404 handler
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);
};
