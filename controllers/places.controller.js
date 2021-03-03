const fs = require("fs");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http.error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place.model");
const User = require("../models/user.model");

exports.getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    return next(err);
  }

  if (!place) {
    return next(new HttpError("Could not find a place for provided id", 404));
  }
  res.json({
    message: "succesfully get",
    place: place.toObject({ getters: true }),
  });
};

exports.getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    return next(err);
  }
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(new Error("Could not find a place for provided user id", 404));
  }
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

exports.createPlace = async (req, res, next) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    next(new HttpError("Invalid input, please check your data", 422));
  }
  const { title, description, address, creatorId } = req.body;
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (err) {
    return next(error);
  }
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creatorId: req.userData.userId,
  });
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }
  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    const err = new HttpError("Creating place failed, please try again", 500);
    return next(err);
  }
  res.status(201).json({ place: createdPlace });
};

exports.updatePlace = async (req, res, next) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    throw new HttpError("Invalid input, please check your data", 422);
  }
  const { title, description } = req.body;
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    return next(err);
  }
  if (place.creatorId.toString() !== req.userData.userId) {
    const err = new HttpError("You are not allowed to change the place", 401);
    return next(err);
  }
  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, please try again later",
      500
    );
    return next(err);
  }
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

exports.deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId).populate("creatorId");
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    return next(err);
  }
  if (!place) {
    const err = new HttpError("Could not find place for this id", 404);
    return next(err);
  }

  if (place.creatorId.id.toString() !== req.userData.userId) {
    const err = new HttpError("You are not allowed to delete the place", 401);
    return next(err);
  }

  const imagePath = place.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creatorId.places.pull(place);
    await place.creatorId.save({ session: sess });
    await sess.commitTransaction();
    console.log("Deleting..");
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, please try again later",
      500
    );
    return next(err);
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Successfully deleted" });
};
