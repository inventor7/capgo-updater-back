import { Router } from "express";
import { onboardingController } from "@/controllers";
import { authenticate } from "@/middleware";

const router: Router = Router();

router.use(authenticate);

// POST /api/onboarding
router.post("/", onboardingController.complete.bind(onboardingController));

export default router;
