import { Router } from "express";
import envVarController from "@/controllers/envVarController";
import { authenticate } from "@/middleware/auth";

const router: Router = Router();

router.use(authenticate);

router.get("/", envVarController.getEnvVars.bind(envVarController));
router.post("/", envVarController.createEnvVar.bind(envVarController));
router.post("/bulk", envVarController.createBulkEnvVars.bind(envVarController));
router.post("/parse", envVarController.parseEnvContent.bind(envVarController));
router.put("/:id", envVarController.updateEnvVar.bind(envVarController));
router.delete("/:id", envVarController.deleteEnvVar.bind(envVarController));
router.get("/:id/reveal", envVarController.revealSecret.bind(envVarController));

export default router;
