const express = require("express");
const router = express.Router();

const sourceAuth = require("./sourceAuth");
const destinationAuth = require("./destinationAuth");

router.use(sourceAuth);
router.use(destinationAuth);

module.exports = router;
