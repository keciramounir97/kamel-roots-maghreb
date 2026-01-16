const express = require("express");
const { contact } = require("../controllers/contactController");

const router = express.Router();

router.post("/contact", contact);

module.exports = router;
