"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class enrollment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static CreateEnrollment(userId, courseId) {
      return this.create({
        userId: userId,
        courseId: courseId,
      });
    }
  }
  enrollment.init(
    {
      userId: DataTypes.INTEGER,
      courseId: DataTypes.INTEGER,
      chapterId: DataTypes.INTEGER,
      pageId: DataTypes.INTEGER,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "enrollment",
    }
  );
  return enrollment;
};
