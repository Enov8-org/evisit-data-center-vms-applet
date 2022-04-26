require("dotenv").config();

const express = require("express");
const axios = require("axios");
const knex = require("./database");
const dayjs = require("dayjs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

// Validate the request
const _validate = (requestData) => {
  // Check key card
  if (!requestData?.keyCard || requestData?.keyCard === "") {
    throw new Error("key card id was not provided.");
  }
  // Check if visitor token
  if (!requestData?.visitorToken || requestData?.visitorToken === "") {
    throw new Error("Visitor token was not provided.");
  }
  // Check if access point
  if (!requestData?.accessPoints) {
    throw new Error("Access point was not provided.");
  }
  // Check if access point is empty
  if (requestData?.accessPoints.length === 0) {
    throw new Error("Access points is empty");
  }
};

// Make request to the access control server
const _makeRequest = (url) => {
  console.log(url);
  return axios.get(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.CLOUD_EXCHANGE_ACCESS_CONTROL_SERVER_USERNAME}:${process.env.CLOUD_EXCHANGE_ACCESS_CONTROL_SERVER_PASSWORD}`
      ).toString("base64")}`,
    },
  });
};

// Grant the user access to the device
const grantAccess = async (requestData) => {
  _validate(requestData);

  const { visitorToken, accessPoints, keyCard } = requestData;

  const url = `${
    process.env.CLOUD_EXCHANGE_ACCESS_CONTROL_SERVER
  }action=assign;device=${accessPoints.toString()};id=${keyCard}`;

  // Make request to cloud exchange access control
  try {
    const requestAccess = await _makeRequest(url);
    const successStatus = [200, 201];

    if (!successStatus.includes(requestAccess.status)) {
      throw new Error("Access control servers not available, try again.");
    }

    // log the activity
    await knex("access_control_log").insert({
      visitor_token: visitorToken,
      key_card: keyCard,
      access_points: JSON.stringify(accessPoints),
      time_checked_in: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    });

    return {
      status: requestAccess.status,
      data: requestAccess.data,
    };
  } catch (error) {
    console.log(error.message);
    throw new Error("An error occured while process..");
  }
};

// Revoke user access from the device
const revokeAccess = async (requestData) => {
  _validate(requestData);

  const { visitorToken, accessPoints, keyCard } = requestData;

  const url = `${
    process.env.CLOUD_EXCHANGE_ACCESS_CONTROL_SERVER
  }action=revoke;device=${accessPoints.toString()};id=${keyCard}`;

  // Make request to cloud exchange access control
  try {
    const revokedAccess = await _makeRequest(url);
    const successStatus = [200, 201];

    console.log(revokedAccess.status);

    if (!successStatus.includes(revokedAccess.status)) {
      throw new Error("Access control servers not available, try again.");
    }

    // Check if the visit key
    const visitor_access_log = await knex
      .select("id")
      .from("access_control_log")
      .where({
        visitor_token: visitorToken,
        key_card: keyCard,
      });

    if (visitor_access_log.length !== 0) {
      // log the activity
      await knex("access_control_log")
        .update({
          is_active: false,
          time_checked_out: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        })
        .where({
          visitor_token: visitorToken,
          key_card: keyCard,
        });
    }

    return {
      status: revokedAccess.status,
      data: revokedAccess.data,
    };
  } catch (error) {
    console.log(error.message);
    throw new Error("An error occured while process.");
  }
};

/**
 * Grant access to access control
 */
app.post("/access_control/grant-access", async (req, res) => {
  try {
    const response = await grantAccess(req.body);
    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Request failed", error: error.message });
  }
});

/**
 *  Revoke access to access control
 */
app.post("/access_control/revoke-access", async (req, res) => {
  try {
    const response = await revokeAccess(req.body);
    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Request failed", error: error.message });
  }
});

app.listen(4000, () => console.log("Server started"));
