const express = require("express");
const {
  listPublicTreePersons,
  getPublicPerson,
  listMyTreePersons,
  getMyPerson,
  createMyPerson,
  updateMyPerson,
  saveMyPerson,
  deleteMyPerson,
} = require("../controllers/personController");
const { authMiddleware, requireAnyPermission } = require("../middlewares/auth");

const router = express.Router();

router.get("/trees/:treeId/persons", listPublicTreePersons);
router.get("/persons/:id", getPublicPerson);

router.get(
  "/my/trees/:treeId/persons",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  listMyTreePersons
);
router.get(
  "/my/persons/:id",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  getMyPerson
);
router.post(
  "/my/trees/:treeId/persons",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  createMyPerson
);
router.put(
  "/my/trees/:treeId/persons/:id",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  updateMyPerson
);
router.post(
  "/my/trees/:treeId/persons/:id/save",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  saveMyPerson
);
router.delete(
  "/my/trees/:treeId/persons/:id",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  deleteMyPerson
);

module.exports = router;
