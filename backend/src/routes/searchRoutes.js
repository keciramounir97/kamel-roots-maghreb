const express = require("express");
const { search } = require("../controllers/searchController");
const { suggest } = require("../controllers/searchPageController");

const router = express.Router();

router.get("/search", search);
router.get("/search/suggest", suggest);

module.exports = router;
