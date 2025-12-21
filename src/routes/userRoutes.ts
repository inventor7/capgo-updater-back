import { Router } from "express";
import { userController } from "@/controllers";
import { authenticate } from "@/middleware";

const router: Router = Router();

router.use(authenticate);

// User Profile
router.get("/profile", userController.getProfile.bind(userController));
router.put("/profile", userController.updateProfile.bind(userController));

// Dashboard Context
router.get(
  "/dashboard/context",
  userController.getDashboardContext.bind(userController)
);

export default router;
