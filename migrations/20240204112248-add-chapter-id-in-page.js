"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("pages", "chapterId", {
      // used to add column in "pages" table , name: "chapterId" which have type "enteger"
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.addConstraint("pages", {
      fields: ["chapterId"], // we tell from we taken value of "chapterId"
      type: "foreign key",
      references: {
        table: "chapters", // we take value from "chapters" table , in which value is "id"
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
    await queryInterface.removeColumn("pages", "chapterId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
