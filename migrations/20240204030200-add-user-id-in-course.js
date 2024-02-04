"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("courses", "userId", {
      // used to add column in "courses" table , name: "userId" which have type "enteger"
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.addConstraint("courses", {
      fields: ["userId"], // we tell from we taken value of "userId"
      type: "foreign key",
      references: {
        table: "users", // we take value from "users" table , in which value is "id"
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
    await queryInterface.removeColumn("courses", "userId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
