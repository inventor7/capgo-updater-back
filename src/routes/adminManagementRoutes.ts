import { Router } from "express";
import { adminManagementController } from "@/controllers";
import { authenticate, authorize } from "@/middleware/auth";

const router: Router = Router();

// App management routes (require authentication)
router.post(
  "/apps",
  authenticate,
  authorize('manage:apps'),
  adminManagementController.createApp.bind(adminManagementController)
);

router.get(
  "/apps",
  authenticate,
  adminManagementController.getUserApps.bind(adminManagementController)
);

// Team management routes (require authentication)
router.post(
  "/teams",
  authenticate,
  authorize('manage:teams'),
  adminManagementController.createTeam.bind(adminManagementController)
);

router.post(
  "/teams/members",
  authenticate,
  authorize('manage:teams'),
  adminManagementController.addUserToTeam.bind(adminManagementController)
);

// Role management routes (require authentication)
router.post(
  "/roles",
  authenticate,
  authorize('manage:roles'),
  adminManagementController.createRole.bind(adminManagementController)
);

router.get(
  "/roles",
  authenticate,
  adminManagementController.getAppRoles.bind(adminManagementController)
);

// User management routes (require admin authentication)
router.get(
  "/users",
  authenticate,
  authorize('manage:users'),
  adminManagementController.getAllUsers.bind(adminManagementController)
);

router.put(
  "/users/:userId",
  authenticate,
  authorize('manage:users'),
  adminManagementController.updateUser.bind(adminManagementController)
);

router.get(
  "/users/:userId/permissions",
  authenticate,
  authorize('read:roles'),
  adminManagementController.getUserPermissions.bind(adminManagementController)
);

export default router;