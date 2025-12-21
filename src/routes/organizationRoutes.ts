import { Router } from "express";
import { organizationController } from "@/controllers";
import {
  authenticate,
  checkOrgMembership,
  requireOrgAdmin,
} from "@/middleware";

const router: Router = Router();

// All org routes require authentication
router.use(authenticate);

// List organizations (user's own memberships - no additional check needed)
router.get("/", organizationController.list.bind(organizationController));

// Create organization (any authenticated user can create)
router.post("/", organizationController.create.bind(organizationController));

// Get organization details (must be a member)
router.get(
  "/:id",
  checkOrgMembership(),
  organizationController.get.bind(organizationController)
);

// Get organization members (must be a member)
router.get(
  "/:id/members",
  checkOrgMembership(),
  organizationController.getMembers.bind(organizationController)
);

// Add member to organization (must be admin or owner)
router.post(
  "/:id/members",
  requireOrgAdmin(),
  organizationController.addMember.bind(organizationController)
);

// Update member role (must be admin or owner)
router.put(
  "/:id/members/:userId",
  requireOrgAdmin(),
  organizationController.updateMemberRole.bind(organizationController)
);

// Remove member (must be admin or owner)
router.delete(
  "/:id/members/:userId",
  requireOrgAdmin(),
  organizationController.removeMember.bind(organizationController)
);

export default router;
