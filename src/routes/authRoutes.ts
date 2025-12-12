import { Router } from "express";
import { authController } from "@/controllers";
import { rateLimiter } from "@/middleware/security";

const router: Router = Router();

// Public routes (no authentication required)
router.use(rateLimiter);

// Registration and login routes
router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login.bind(authController));
router.post("/logout", authController.logout.bind(authController));
router.get("/session", authController.getSession.bind(authController));

export default router;