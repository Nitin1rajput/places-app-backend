const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const placeSchema = Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  address: { type: String, required: true },
  location: { type: Array, required: true },
  creatorId: { type: mongoose.Types.ObjectId, required: true, ref: "user" },
});

module.exports = mongoose.model("place", placeSchema);
