const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

const usersControllers = require("../controllers/users.controller");
const fileUpload = require("../middleware/file-upload");

router.get("/", usersControllers.getAllUsers);

// POST

router.post(
  "/login",
  [check("email").normalizeEmail()],
  usersControllers.login
);
router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  usersControllers.signup
);

module.exports = router;
