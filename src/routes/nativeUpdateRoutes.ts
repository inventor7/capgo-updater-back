import { Router } from "express";
import { nativeUpdateController } from "@/controllers";
import { rateLimiter } from "@/middleware/security";

const router: Router = Router();

router.use(rateLimiter);

router.get(
  "/native-updates/check",
  nativeUpdateController.checkNativeUpdate.bind(nativeUpdateController),
);

router.post(
  "/native-updates/log",
  nativeUpdateController.logNativeUpdate.bind(nativeUpdateController),
);

export default router;
