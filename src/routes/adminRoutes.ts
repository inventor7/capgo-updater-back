import { Router } from "express";
import { adminController, channelController } from "@/controllers";
import { rateLimiter } from "@/middleware/security";
import { authenticate, authorize } from "@/middleware/auth";

const router: Router = Router();

router.use(rateLimiter);

// Upload requires authentication and appropriate permissions
router.post(
  "/admin/upload",
  authenticate,
  authorize('write:updates'),
  adminController.getUploadMiddleware(),
  adminController.uploadBundle.bind(adminController)
);

// Dashboard stats (requires auth)
router.get(
  "/dashboard/stats",
  authenticate,
  authorize('read:stats'),
  adminController.getDashboardStats.bind(adminController)
);

// Dashboard bundles (requires auth)
router.get(
  "/dashboard/bundles",
  authenticate,
  authorize('read:updates'),
  adminController.getBundles.bind(adminController)
);
router.post(
  "/dashboard/bundles",
  authenticate,
  authorize('write:updates'),
  adminController.createBundle.bind(adminController)
);
router.put(
  "/dashboard/bundles/:id",
  authenticate,
  authorize('write:updates'),
  adminController.updateBundle.bind(adminController)
);
router.delete(
  "/dashboard/bundles/:id",
  authenticate,
  authorize('manage:updates'),
  adminController.deleteBundle.bind(adminController)
);

// Dashboard channels (requires auth)
router.get(
  "/dashboard/channels",
  authenticate,
  authorize('read:channels'),
  adminController.getChannels.bind(adminController)
);
router.delete(
  "/dashboard/channels/:id",
  authenticate,
  authorize('manage:channels'),
  adminController.deleteChannel.bind(adminController)
);

// Dashboard devices (requires auth)
router.get(
  "/dashboard/devices",
  authenticate,
  authorize('read:devices'),
  adminController.getDevices.bind(adminController)
);
router.put(
  "/dashboard/devices/:id/channel",
  authenticate,
  authorize('write:devices'),
  adminController.updateDeviceChannel.bind(adminController)
);
router.delete(
  "/dashboard/devices/:id",
  authenticate,
  authorize('manage:devices'),
  adminController.deleteDevice.bind(adminController)
);

// Dashboard stats data (requires auth)
router.get(
  "/dashboard/stats-data",
  authenticate,
  authorize('read:stats'),
  adminController.getStatsData.bind(adminController)
);

// User profile endpoint
router.get(
  "/user/profile",
  authenticate,
  adminController.getUserProfile.bind(adminController)
);

export default router;
