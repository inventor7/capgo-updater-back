import { Router } from "express";
import { channelController } from "@/controllers";
import { authenticate, authorize } from "@/middleware/auth";

const router: Router = Router();

// Public channel assignment endpoint for app integration
// This allows apps to register themselves with a channel without authentication
router.post(
  "/channel_self",
  channelController.assignChannel.bind(channelController)
);

// Public endpoints to get channel information
router.get(
  "/channel",
  channelController.getDeviceChannel.bind(channelController)
);

router.get(
  "/channels",
  channelController.getAvailableChannels.bind(channelController)
);

// Authenticated channel management endpoints
// These allow users with proper permissions to manage channels
router.post(
  "/channels",
  authenticate,
  authorize('write:channels'),
  channelController.assignChannel.bind(channelController)
);

// Additional authenticated endpoints can be added here as needed

export default router;