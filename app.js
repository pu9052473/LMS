const express = require("express"); // import express module
const app = express(); // create app inside the express module
const { user } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const passport = require("passport");
const ConnectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");
const { json } = require("sequelize");
const { error } = require("console");
const { title } = require("process");

// app.set("views", path.join(__dirname,"views"));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"])); //THE TEXT SHOULD BE OF 32 CHARACTERS ONLY
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs"); // it calls file who have ejs and set that as view engine
app.use(flash());

app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
  })
);

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  // for checking entered user is user from "loged-in-user" or not
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      role: "role",
    },
    (email, password, done) => {
      user
        .findOne({ where: { email: email } })
        .then(async function (user) {
          if (!user) {
            console.log("Not A user");
            return done(null, false);
          }
          const result = await bcrypt.compare(password, user.password);
          if (!result) {
            return done(null, false, { message: "Invalid Password" });
          }
          if (user.role === "Educator") {
            return done(null, user);
          } else if (user.role === "Student") {
            return done(null, user);
          } else {
            return done(null, false);
          }
        })
        .catch((err) => {
          return done(err);
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("serializing user in session ", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  user
    .findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

// for home page
app.get("/", async function (request, response) {
  response.render("home", {
    title: "My School",
  });
});

// for signup page
app.get("/signup", async function (request, response) {
  response.render("signup", {
    title: "SignUp",
    csrfToken: request.csrfToken(),
  });
});

// for signup
app.post("/users", async (request, response) => {
  const { fullName, email, password } = request.body;

  // check if the below details is empty or not
  if (!fullName || !email || !password) {
    request.flash(
      // flash the below written message
      "error",
      "fullName , email and password are must require please fill up"
    );
    return response.redirect("/signup");
  }

  // hashing the password
  const hashedpwd = await bcrypt.hash(request.body.password, saltRounds);
  // console.log(hashedpwd);

  try {
    const users = await user.create({
      role: request.body.role,
      fullName: request.body.fullName,
      email: request.body.email,
      password: hashedpwd,
    });
    request.login(users, (err) => {
      if (err) {
        console.log(err);
      }

      const role = request.body.role;
      if (role === "Educator") {
        response.redirect("EducatorDB");
      } else if (role === "Student") {
        response.redirect("studentDB");
      }
    });
  } catch (error) {
    console.log(error);
  }
});

// for login page
app.get("/login", async function (request, response) {
  if (request.isAuthenticated()) {
    if (request.user.role == "Educator") {
      response.redirect("/EducatorDB");
    } else if (request.user.role == "Student") {
      response.redirect("/studentDB");
    }
  } else {
    response.render("login", {
      title: "Login",
      csrfToken: request.csrfToken(),
    });
  }
});

// for login
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    console.log(request.user);
    if (request.user.role == "Educator") {
      response.redirect("/EducatorDB");
    } else if (request.user.role == "Student") {
      response.redirect("/studentDB");
    } else {
      response.redirect("/");
    }
  }
);

// for changepassword page
app.get("/changepassword", async function (request, response) {
  response.render("changepassword", {
    title: "Change Your Password",
    csrfToken: request.csrfToken(),
  });
});

// for changepassword
app.put("/changepassword", async function (request, response) {
  const userEmail = request.body.email;
  const newPassword = request.body.password;

  if (!userEmail || !newPassword) {
    request.flash("Enater email and password");
  }

  // console.log("newPassword:", newPassword);
  const hashedpwd = await bcrypt.hash(newPassword, saltRounds);
  const currentUser = await user.findOne({
    where: {
      email: userEmail,
    },
  });

  try {
    const afterUpdate = await currentUser.update({ password: hashedpwd });
    // console.log("afterUpdate:", afterUpdate);
    return response.redirect("/login");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

// for signout
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    } else {
      response.redirect("/login");
    }
  });
});

// for educater dashboard
app.get(
  "/EducatorDB",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    if (request.user.role === "Student") {
      response.redirect("/studentDB");
    } else {
      response.render("EducaterDB", {
        title: `${currentUser.fullName}'s Teacher-Dashboard`,
        currentUser,
        csrfToken: request.csrfToken(),
      });
    }
  }
);

// for create course page
app.get(
  "/createCourse",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    response.render("createCourse", {
      title: "create new course",
      csrfToken: request.csrfToken(),
    });
  }
);

// for creating a new course
app.post(
  "/createCourse",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const courseTitle = request.body.title;

    if (!courseTitle) {
      request.flash("error", "Please enter a title of your course");
    }

    try {
      await course.CreateCourse(currentUser.id, courseTitle);
      console.log("course created");
      return response.redirect("/EducatorDB");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

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

// for student dashboard
app.get("/studentDB", async function (request, response) {
  let enrollment = [
    {
      courseID: 6,
      userID: 3,
      id: 1,
    },
    {
      courseID: 6,
      userID: 4,
      id: 1,
    },
    {
      courseID: 7,
      userID: 3,
      id: 1,
    },
  ];
  let Allcourses = [
    {
      id: 6,
      title: "python",
    },
    {
      id: 7,
      title: "Java",
    },
  ];
  response.render("studentDB", {
    title: "Todo Application",
    Allcourses,
    enrollment,
  });
});

// for student's mycourses
app.get("/myCourses", async function (request, response) {
  let enrollment = [
    {
      courseID: 6,
      userID: 3,
      id: 1,
    },
    {
      courseID: 6,
      userID: 4,
      id: 1,
    },
    {
      courseID: 7,
      userID: 3,
      id: 1,
    },
  ];
  let Allcourses = [
    {
      id: 6,
      title: "python",
    },
    {
      id: 7,
      title: "Java",
    },
  ];

  response.render("myCourses", {
    title: "MY Courses",
    enrollment,
    Allcourses,
  });
});

module.exports = app;
