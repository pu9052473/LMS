"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("chapters", "courseId", {
      // used to add column in "chapters" table , name: "courseId" which have type "enteger"
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.addConstraint("chapters", {
      fields: ["courseId"], // we tell from we taken value of "courseId"
      type: "foreign key",
      references: {
        table: "courses", // we take value from "courses" table , in which value is "id"
        field: "id",
      },
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("chapters", "courseId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
