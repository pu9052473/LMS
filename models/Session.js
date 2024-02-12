// models/Session.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/config.json"); // Adjust the path as needed

const Session = sequelize.define("Session", {
  sid: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  expires: {
    type: DataTypes.DATE,
  },
  data: {
    type: DataTypes.TEXT,
  },
});

module.exports = Session;
