import { Router } from "express";
import updateRoutes from "./updateRoutes";
import statsRoutes from "./statsRoutes";
import channelRoutes from "./channelRoutes";
import adminRoutes from "./adminRoutes";
import healthRoutes from "./healthRoutes";
import { healthController } from "@/controllers";

const router: Router = Router();

router.use("/", updateRoutes);
router.use("/", statsRoutes);
router.use("/", channelRoutes);
router.use("/", adminRoutes);
router.use("/", healthRoutes);

router.get("/health", healthController.basicHealthCheck.bind(healthController));

export default router;
