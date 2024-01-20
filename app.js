const express = require("express"); // import express module
const app = express(); // create app inside the express module
const path = require("path");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs"); // it calls file who have ejs and set that as view engine

// for home , mean course page
app.get("/", async function (request, response) {
  response.render("course", {
    title: "Todo Application",
  });
});

// for chapter
app.get("/chapter", async function (request, response) {
  response.render("chapter", {
    title: "Todo Application",
  });
});

// for cretae chapter
app.get("/createchp", async function (request, response) {
  response.render("createchp", {
    title: "Todo Application",
  });
});

// for chapter page
app.get("/chpage", async function (request, response) {
  response.render("chpage", {
    title: "Todo Application",
  });
});

// for cretae chapter page
app.get("/createchpage", async function (request, response) {
  response.render("createchpage", {
    title: "Todo Application",
  });
});

// for reports
app.get("/report", async function (request, response) {
  response.render("report", {
    title: "Todo Application",
  });
});

// for educater dashboard
app.get("/educaterDB", async function (request, response) {
  response.render("educaterDB", {
    title: "Todo Application",
  });
});

app.listen(3000, () => {
  // the server port at this present
  console.log("Started express server at port 3000");
});
