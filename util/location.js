var MapboxClient = require("mapbox");
const HttpError = require("../models/http.error");
const API_KEY = process.env.MAPBOX_TOKEN;

const client = new MapboxClient(API_KEY);

async function getCoordsForAddress(address) {
  const response = await client.geocodeForward(address);

  if (!response || response.status !== 200) {
    const error = new HttpError(
      "Could not find location for the specific address",
      422
    );
    throw error;
  }
  var data = response.entity; // data is the geocoding result as parsed JSON

  const coordinates = data.features[0].center;
  return coordinates;
}

module.exports = getCoordsForAddress;
