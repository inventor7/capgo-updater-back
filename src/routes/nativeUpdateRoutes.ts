import { Router } from "express";
import { nativeUpdateController } from "@/controllers";
import { rateLimiter } from "@/middleware/security";

const router: Router = Router();

// Apply rate limiting
router.use(rateLimiter);

// Client API endpoints
router.get(
  "/native-updates/check",
  nativeUpdateController.checkNativeUpdate.bind(nativeUpdateController)
);

router.post(
  "/native-updates/log",
  nativeUpdateController.logNativeUpdate.bind(nativeUpdateController)
);

// Admin upload endpoint
router.post(
  "/admin/native-upload",
  nativeUpdateController.getUploadMiddleware(),
  nativeUpdateController.uploadNativeUpdate.bind(nativeUpdateController)
);

// Dashboard API endpoints
router.get(
  "/dashboard/native-updates",
  nativeUpdateController.getNativeUpdates.bind(nativeUpdateController)
);

router.put(
  "/dashboard/native-updates/:id",
  nativeUpdateController.updateNativeUpdate.bind(nativeUpdateController)
);

router.delete(
  "/dashboard/native-updates/:id",
  nativeUpdateController.deleteNativeUpdate.bind(nativeUpdateController)
);

export default router;
