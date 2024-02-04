"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      course.belongsTo(models.user, {
        foreignKey: "userId",
      });
    }

    static getCourse(userId) {
      return this.findAll({
        where: {
          userId,
        },
        order: [["id", "ASC"]],
      });
    }

    static CreateCourse(userId, title) {
      return this.create({
        userId,
        title,
      });
    }
  }

  course.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
        },
      },
    },
    {
      sequelize,
      modelName: "course",
    }
  );
  return course;
};
