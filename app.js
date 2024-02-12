const express = require("express"); // import express module
const app = express(); // create app inside the express module
const { user, course, chapter, page, enrollment } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const passport = require("passport");
const ConnectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const sequelize = require("./config/config.json"); // Adjust the path as needed
const Session = require("./models/Session"); // Adjust the path as needed
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

// app.use(
//   session({
//     secret: "my-super-secret-key-21728172615261562",
//     cookie: {
//       maxAge: 24 * 60 * 60 * 1000, //24hrs
//     },
//   })
// );

const sessionStore = new SequelizeStore({
  db: sequelize,
  expiration: 24 * 60 * 60 * 1000, // Session expiration time (optional)
});

app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: { secure: true }, // Set to true if using HTTPS
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
    // console.log(request.user);
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
    const AllCourses = await course.findAll();

    let allCoursesWithEnrollment = [];

    for (let course of AllCourses) {
      const enrollmentCount = await enrollment.count({
        where: { courseId: course.id }, // this count the number of userId , who have the courseId of the current course
        distinct: true,
        col: "userId",
      });

      const teacherOfCourse = await user.findByPk(course.userId); // this take all courses who have userId

      allCoursesWithEnrollment.push({
        // we push the bellow details into the "allCoursesWithEnrollment"
        id: course.id,
        teacherOfCourseFullName: teacherOfCourse.fullName,
        courseTitle: course.title,
        enrollmentCount: enrollmentCount,
      });
    }

    const sortedAllCourses = allCoursesWithEnrollment.sort(
      // sort the courses according to there "enrollmentCount"
      (a, b) => b.enrollmentCount - a.enrollmentCount
    );

    // console.log("sortedAllCourses: ", sortedAllCourses);

    if (request.user.role === "Student") {
      response.redirect("/studentDB");
    } else {
      response.render("EducaterDB", {
        title: `${currentUser.fullName}'s Teacher-Dashboard`,
        currentUser,
        sortedAllCourses,
        csrfToken: request.csrfToken(),
      });
    }
  }
);

// for teacher's my-course
app.get(
  "/teaMyCourse",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const loggedInUserId = currentUser.id;
    const AllCourses = await course.getCourse(loggedInUserId);

    let allCoursesWithEnrollment = [];

    for (let course of AllCourses) {
      const enrollmentCount = await enrollment.count({
        where: { courseId: course.id }, // this count the number of userId , who have the courseId of the current course
        distinct: true,
        col: "userId",
      });

      const teacherOfCourse = await user.findByPk(course.userId);

      allCoursesWithEnrollment.push({
        id: course.id,
        teacherOfCourseFullName: teacherOfCourse.fullName,
        courseTitle: course.title,
        enrollmentCount,
      });
    }

    const sortedAllCourses = allCoursesWithEnrollment.sort(
      // sort the courses according to there "enrollmentCount"
      (a, b) => b.enrollmentCount - a.enrollmentCount
    );

    response.render("TeaMyCourse", {
      title: `${currentUser.fullName}'s Course`,
      sortedAllCourses,
      currentUser,
      csrfToken: request.csrfToken(),
    });
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
      await course.create({
        title: courseTitle,
        userId: currentUser.id,
      });
      // console.log("course created");
      return response.redirect("/EducatorDB");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// page for viewing chapter
app.get(
  "/course/:id",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const courseTobeEdited = await course.findByPk(request.params.id);
    const chapterOfCourse = await chapter.findAll({
      where: {
        courseId: courseTobeEdited.id,
      },
      order: [["id", "ASC"]],
    });
    // console.log("current course:", courseTobeEdited.id);
    // console.log("chapters:", chapterOfCourse);

    response.render("chapter", {
      title: `${courseTobeEdited.title}`,
      courseTobeEdited,
      chapterOfCourse,
      currentUser,
      csrfToken: request.csrfToken(),
    });
  }
);

// for delete a course
app.delete(
  "/course/:id/delete",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentCourse = await course.findByPk(request.params.id);
    try {
      const deleteEnrolledCourse = await enrollment.destroy({
        where: {
          courseId: currentCourse.id,
        },
      });

      const deleteCourse = await course.destroy({
        where: {
          id: currentCourse.id,
        },
      });

      // console.log("deleted current course", deleteCourse);
      response.send(deleteCourse ? true : false);
    } catch (error) {
      console.log("Error accurs while deleting the course", deleteCourse);
      return response.status(422).json(error);
    }
  }
);

// for cretae chapter page
app.get(
  "/course/:id/createChapter",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const courseTobeEdited = await course.findByPk(request.params.id);
    const courseId = request.params.id;
    const chapterOfCourse = await chapter.findAll({
      where: {
        courseId: courseTobeEdited.id,
      },
      order: [["id", "ASC"]],
    });

    // console.log("current course:", courseTobeEdited.id);

    response.render("createchp", {
      title: `Create chapter for ${courseTobeEdited.title}`,
      courseTobeEdited,
      courseId,
      chapterOfCourse,
      csrfToken: request.csrfToken(),
    });
  }
);

// for post the created chapter
app.post(
  "/course/:id/createChapter",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const courseTobeEdited = await course.findByPk(request.params.id);

    // console.log("Current Course:", courseTobeEdited);

    const courseId = request.params.id;
    const ChapterName = request.body.name;
    const ChapterDiscription = request.body.discription;

    // console.log("course id:", courseId);
    // console.log("chapterName:", ChapterName);
    // console.log("Description:", ChapterDiscription);

    if (!ChapterName || !ChapterDiscription) {
      request.flash(
        "error",
        "You have to must fill up chapter's name and discription"
      );
      return response.redirect(`/course/${courseId}/createChapter`);
    }

    try {
      await chapter.createChapter({
        name: ChapterName,
        discription: ChapterDiscription,
        courseId,
      });

      return response.redirect(`/course/${courseId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// for display chapter-list
app.get(
  "/course/:id/chapterList",
  // ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const courseTobeEdited = await course.findByPk(request.params.id);
    const courseId = request.params.id;
    const chapterOfCourse = await chapter.findAll({
      where: {
        courseId: courseTobeEdited.id,
      },
      order: [["id", "ASC"]],
    });

    // console.log("current course:", courseTobeEdited.id);
    // console.log("chapters:", chapterOfCourse);

    response.render("chapterList", {
      title: ` ${courseTobeEdited.title}'s chapter-list`,
      courseTobeEdited,
      courseId,
      chapterOfCourse,
      csrfToken: request.csrfToken(),
    });
  }
);

// for chapter page
app.get(
  "/chapter/:id",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const CurrentChapter = await chapter.findByPk(request.params.id);
    const currentCourse = await course.findAll({
      where: {
        id: CurrentChapter.courseId,
      },
    });
    // console.log("currentCourse:", currentCourse);
    const pagesOfChapter = await page.findAll({
      where: {
        chapterId: CurrentChapter.id,
      },
      order: [["id", "ASC"]],
    });
    // console.log("pagesOfChapter:", pagesOfChapter);
    response.render("chpage", {
      title: `${CurrentChapter.name}`,
      currentUser,
      currentCourse,
      CurrentChapter,
      pagesOfChapter,
      csrfToken: request.csrfToken(),
    });
  }
);

// for page to create page
app.get(
  "/chapter/:id/createPage",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const CurrentChapter = await chapter.findByPk(request.params.id);
    const currentCourse = await course.findAll({
      where: {
        id: CurrentChapter.courseId,
      },
    });

    response.render("createchpage", {
      title: `${CurrentChapter.name}`,
      CurrentChapter,
      currentCourse,
      csrfToken: request.csrfToken(),
    });
  }
);

// for creating page
app.post(
  "/chapter/:id/createPage",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const chapterToBeEdited = await chapter.findByPk(request.params.id);
    const chapterId = chapterToBeEdited.id;
    const pageTitle = request.body.title;
    const pageContent = request.body.content;

    // console.log("chapterToBeEdited:", chapterToBeEdited);
    // console.log("chapterId:", chapterId);
    // console.log("pageTitle:", pageTitle);
    // console.log("pageContent:", pageContent);

    if (!pageTitle || !pageContent) {
      request.flash(
        "error",
        "You have to must fill up page's title and content"
      );
      return response.redirect(`/chapter/${chapterId}/createPage`);
    }

    try {
      await page.create({
        title: pageTitle,
        content: pageContent,
        chapterId,
      });
      return response.redirect(`/chapter/${chapterId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// for delete the chapter
app.delete(
  "/chapter/:id/delete",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const CurrentChapter = await chapter.findByPk(request.params.id);
    try {
      const deleteEnrolledChapter = await enrollment.destroy({
        where: { chapterId: CurrentChapter.id },
      });

      const deleteChapter = await chapter.destroy({
        where: { id: CurrentChapter.id },
      });

      console.log("deleted chapter, succesfully", deleteChapter);
      response.send(deleteChapter ? true : false);
    } catch (error) {
      console.log("Error occur while deleting the chapter", error);
      return response.status(422).json(error);
    }
  }
);

// for display list of pages
app.get(
  "/chapter/:id/pageList",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const CurrentChapter = await chapter.findByPk(request.params.id);
    const currentCourse = await course.findAll({
      where: {
        id: CurrentChapter.courseId,
      },
    });
    // console.log("currentCourse:", currentCourse);
    const pagesOfChapter = await page.findAll({
      where: {
        chapterId: CurrentChapter.id,
      },
      order: [["id", "ASC"]],
    });
    // console.log("pagesOfChapter:", pagesOfChapter);
    response.render("pageList", {
      title: `${CurrentChapter.name}'s chapter-list`,
      currentUser,
      currentCourse,
      CurrentChapter,
      pagesOfChapter,
      csrfToken: request.csrfToken(),
    });
  }
);

// for display content of page
app.get(
  "/chapter/:id/pageContent",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const currentPage = await page.findByPk(request.params.id);
    const CurrentChapter = await chapter.findOne({
      where: {
        id: currentPage.chapterId,
      },
      order: [["id", "ASC"]],
    });
    // console.log("CurrentChapter:", CurrentChapter);

    const currentCourse = await course.findOne({
      where: {
        id: CurrentChapter.courseId,
      },
      order: [["id", "ASC"]],
    });
    // console.log("currentCourse:", currentCourse);

    const completedPageStatus = await enrollment.findOne({
      where: {
        userId: currentUser.id,
        courseId: currentCourse.id,
        chapterId: CurrentChapter.id,
        pageId: currentPage.id,
        completed: true,
      },
    });
    console.log("completedPageStatus:", completedPageStatus);

    const enrollmentStatus = await enrollment.findOne({
      where: {
        userId: currentUser.id,
        courseId: currentCourse.id,
      },
    });
    console.log("enrollmentStatus:", enrollmentStatus);

    response.render("pageContent", {
      title: `${currentPage.title}`,
      currentUser,
      currentCourse,
      CurrentChapter,
      currentPage,
      completedPageStatus,
      enrollmentStatus,
      csrfToken: request.csrfToken(),
    });
  }
);

// for deleting a page
app.delete(
  "/page/:id/delete",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentPage = await page.findByPk(request.params.id);
    try {
      // const deleteEnrollmentPage = await enrollment.destroy({
      //   wehre: {
      //     pageId: currentPage.id,
      //   },
      // });

      const deletePage = await page.destroy({
        where: {
          id: currentPage.id,
        },
      });

      // console.log("deleteEnrollmentPage:", deleteEnrollmentPage);
      console.log("deletePage:", deletePage);
      response.send(deletePage ? true : false);
    } catch (error) {
      console.log("Error occur while deleting the page", error);
      return response.status(422).json(error);
    }
  }
);

// for reports
app.get(
  "/report",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const loggedInUserId = currentUser.id;
    const AllCourses = await course.getCourse(loggedInUserId);

    let allCoursesWithEnrollment = [];

    for (let Course of AllCourses) {
      const enrollmentCount = await enrollment.count({
        where: { courseId: Course.id },
        distinct: true,
        col: "userId",
      });

      const teacherOfCourse = await user.findByPk(Course.userId);

      allCoursesWithEnrollment.push({
        id: Course.id,
        courseTitle: Course.title,
        teacherOfCourseFullName: teacherOfCourse.fullName,
        enrollmentCount: enrollmentCount,
      });
    }

    const sortedAllCourses = allCoursesWithEnrollment.sort(
      (a, b) => b.enrollmentCount - a.enrollmentCount
    );

    response.render("report", {
      title: `${currentUser.fullName}'s courses report`,
      sortedAllCourses,
      csrfToken: request.csrfToken(),
    });
  }
);

// for student dashboard
app.get(
  "/studentDB",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const AllCourses = await course.findAll();

    let allCoursesWithEnrollment = [];

    for (let course of AllCourses) {
      const enrollmentCount = await enrollment.count({
        where: { courseId: course.id },
        distinct: true,
        col: "userId",
      });

      const teacherOfCourse = await user.findByPk(course.userId);

      allCoursesWithEnrollment.push({
        id: course.id,
        teacherOfCourseFullName: teacherOfCourse.fullName,
        courseTitle: course.title,
        enrollmentCount,
      });
    }

    const sortedAllCourses = allCoursesWithEnrollment.sort(
      (a, b) => b.enrollmentCount - a.enrollmentCount
    );

    if (currentUser.role === "Educator") {
      response.redirect("/EducatorDB");
    } else {
      response.render("studentDB", {
        title: `${currentUser.fullName}'s Student_Dashboard`,
        currentUser,
        sortedAllCourses,
        csrfToken: request.csrfToken(),
      });
    }
  }
);

// for enrolling the student
app.post(
  "/enroll/:courseId",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const courseId = request.params.courseId;
    // console.log("courseId:", courseId);

    const currentUserId = request.query.currentUserId;
    // console.log("currentUserId:", currentUserId);

    // checking that user is already enroold in course or not
    const existingEnrolledCourse = await enrollment.findOne({
      where: {
        userId: currentUserId,
        courseId,
      },
    });
    // console.log("existingEnrolledCourse:", existingEnrolledCourse);

    if (existingEnrolledCourse) {
      return response
        .status(404)
        .json({ message: "You are allready enrolled in this course" });
    }

    try {
      const enrollmentCheck = await enrollment.CreateEnrollment(
        currentUserId,
        courseId
      );
      // console.log("enrollmentCheck:", enrollmentCheck);
      response.redirect("/studentDB");
    } catch (error) {
      console.log(error);
      return response.status(402).json(error);
    }
  }
);

// for marking page as completed
app.post(
  "/chapter/:id/markAsCompleted",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const currentUser = request.user;
      const currentPage = await page.findByPk(request.params.id);
      const CurrentChapter = await chapter.findAll({
        where: { id: currentPage.chapterId },
        order: [["id", "ASC"]],
      });
      const currentCourse = await course.findAll({
        where: { id: CurrentChapter[0].courseId },
        order: [["id", "ASC"]],
      });

      const userId = currentUser.id;
      const courseId = currentCourse[0].id;
      const chapterId = CurrentChapter[0].id;
      const pageId = currentPage.id;

      console.log(userId);
      console.log(courseId);
      console.log(chapterId);
      console.log(pageId);

      await enrollment.create({
        userId: userId,
        courseId: courseId,
        chapterId: chapterId,
        pageId: pageId,
        completed: true,
      });

      response.redirect(`/chapter/${pageId}/pageContent`);
    } catch (error) {
      console.log("Error occur while marking page as completed");
      response
        .status(500)
        .send("An error occures while marking page as completed");
    }
  }
);

// for student's my-course
app.get(
  "/student/enrolledCourse",
  ConnectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const currentUser = request.user;
    const currentUserId = currentUser.id;
    const AllCourses = await course.findAll();

    try {
      const enrolledCourse = await enrollment.findAll({
        where: { userId: currentUserId },
      });
      console.log("enrolledCourse:", enrolledCourse);

      // to find the total numbers of completed page
      const courseWithPageInformation = [];
      for (let StuEnrolledCourse of enrolledCourse) {
        const Course = await course.findByPk(StuEnrolledCourse.courseId, {
          // this take the course from "enrollment" table who have current user's courseId
          include: [
            {
              model: chapter, // in which, we are including the chapters with this course , and then
              include: [page], // we include pages associated with this chapters
            },
          ],
        });
        console.log("Course:", Course);

        // this checks if the course is retrived or not
        if (Course) {
          // this check the course is allready in "courseWithPageInformation[]" array pr not
          const existingCourse = courseWithPageInformation.find(
            (c) => c.courseId === Course.id
          );

          // if the course is not in the "courseWithPageInformation[]"  then
          if (!existingCourse) {
            // colculate the total numbers of pages
            const totalPage = Course.chapters.reduce(
              (total, chapter) => total + chapter.pages.length,
              0
            );

            // culculate the total numbers of completed pages
            const completedPageCount = await enrollment.count({
              where: {
                userId: currentUserId,
                courseId: Course.id,
                completed: true,
              },
            });
            console.log("completedPageCount:", completedPageCount);

            let progressReport = (completedPageCount / totalPage) * 100;

            const teacherOfCourse = await user.findOne({
              where: { id: Course.userId },
            });
            console.log("teacherOfCourse:", teacherOfCourse);

            // push all the data if the course is not exist in the "courseWithPageInformation[]"
            courseWithPageInformation.push({
              userId: teacherOfCourse.id,
              courseId: Course.id,
              courseTitle: Course.title,
              completedPageCount: completedPageCount,
              totalPage: totalPage,
              progressReport: progressReport,
            });
          }
        }
      }
      console.log("courseWithPageInformation:", courseWithPageInformation);

      // we do this for take the all requiare details in the one array
      let allCoursesWithEnrollment = [];
      for (let Course of AllCourses) {
        const enrollmentCount = await enrollment.count({
          where: { courseId: Course.id },
          distinct: true,
          col: "userId",
        });

        const teacherOfCourse = await user.findByPk(Course.userId);

        allCoursesWithEnrollment.push({
          id: Course.id,
          teacherOfCourseFullName: teacherOfCourse.fullName,
          courseTitle: course.title,
          enrollmentCount: enrollmentCount,
        });
      }

      const sortedAllCourses = allCoursesWithEnrollment.sort(
        (a, b) => b.enrollmentCount - a.enrollmentCount
      );

      const existingUser = await user.findAll();
      console.log(existingUser);

      response.render("StuMyCourse", {
        title: `${currentUser.fullName}'s enrolled courses`,
        currentUser,
        courses: courseWithPageInformation,
        users: existingUser,
        sortedCourses: sortedAllCourses,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.log(error);
      return response.status(402).json(error);
    }
  }
);

sequelize.sync();

module.exports = app;
