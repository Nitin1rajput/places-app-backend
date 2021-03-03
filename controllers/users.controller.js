const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http.error");

const User = require("../models/user.model");

exports.getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (error) {
    const err = new HttpError(
      "Fetching users failed, please try again later",
      500
    );
    return next(err);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    const err = new HttpError("Loging up failed, please try again", 500);
    return next(err);
  }
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    const err = new HttpError("Something went wrong", 500);
    return next(err);
  }
  if (!isValidPassword) {
    return next(new HttpError("incorrect email or password", 403));
  }
  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    const err = new HttpError("Logging In Failed", 500);
    return next(err);
  }
  res.status(200).json({
    message: "Logged In",
    user: existingUser.email,
    token,
    userId: existingUser.id,
  });
};

exports.signup = async (req, res, next) => {
  console.log(req.body);
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return next(new HttpError("Invalid input, please check your data", 422));
  }
  const { name, email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    const err = new HttpError("Siging up failed, please try again", 500);
    return next(err);
  }
  if (existingUser) {
    const err = new HttpError("User exist already, login instead", 422);
    return next(err);
  }
  let hashedPasswod;
  try {
    hashedPasswod = await bcrypt.hash(password, 12);
  } catch (error) {
    const err = new HttpError("Internal Server Error", 500);
    return next(err);
  }
  const createdUser = new User({
    name,
    email,
    password: hashedPasswod,
    places: [],
    image: req.file.path,
  });
  try {
    await createdUser.save();
  } catch (error) {
    const err = new HttpError(
      "Error creating user, please try again later",
      500
    );
    return next(err);
  }
  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    const err = new HttpError(
      "Error creating user, please try again later",
      500
    );
    return next(err);
  }
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token });
};
