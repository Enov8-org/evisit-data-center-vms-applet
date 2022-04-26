const databaseConnection = require("../knexfile");
const knex = require("knex")(databaseConnection[process.env.ENVIROMENT]);

module.exports = knex;
