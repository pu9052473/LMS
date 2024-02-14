const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/login").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("LMS test suite", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  //test for user cannot access teacher-dashboard without authentication
  test("checking user cannot access teacher-dashboard without authentication", async () => {
    // Send a GET request to the dashboard route without authentication
    let response = await agent.get("/teacherDB");
    expect(response.status).toBe(302);

    response = await request(app).get("/teacherDB");
    expect(response.status).toBe(302);
  });

  //test for signup a new user
  test("Sign-up as a new user", async () => {
    const res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);

    const newUser1 = {
      fullName: "testUser1",
      email: "testuser1@example.com",
      password: "password103",
      role: "Educator",
      _csrf: csrfToken,
    };
    const signupRes1 = await agent.post("/users").send(newUser1);
    expect(signupRes1.statusCode).toBe(302);
  });

  //for signout the current user
  test("Sign-out the current user", async () => {
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);

    res = await agent.get("/teacherDB");
    expect(res.statusCode).toBe(302);

    res = await agent.get("/studentDB");
    expect(res.statusCode).toBe(302);
  });

  // test for see the "teaMyCourse" page
  test("View courses created by a teacher", async () => {
    const agent = request.agent(server);
    await login(agent, "testuser1@example.com", "password103");
    const teaMyCoursesRes = await agent.get("/teaMyCourse");
    expect(teaMyCoursesRes.statusCode).toBe(200);
  });

  // test for create a new course
  test("Create a new course", async () => {
    await login(agent, "testuser1@example.com", "password103");
    const csrfToken = extractCsrfToken(await agent.get("/createCourse"));

    const newCourse = {
      title: "First Course",
      _csrf: csrfToken,
    };

    const createCourseRes = await agent.post("/createCourse").send(newCourse);
    expect(createCourseRes.statusCode).toBe(302);
  });

  // test for create a new chapter
  test("Create a new chapter", async () => {
    await login(agent, "testuser1@example.com", "password103");

    let csrfToken = extractCsrfToken(await agent.get("/createCourse"));

    //create test course
    const createdCourse = {
      courseName: "First Course",
      courseDescription: "Description for the new course.",
      _csrf: csrfToken,
    };

    await agent.post("/createCourse").send(createdCourse);

    //create test chapter
    csrfToken = extractCsrfToken(await agent.get(`/course/${1}/createchapter`));
    // console.log("csrfToken", csrfToken);
    const newChapter = {
      name: "Test Chapter",
      discription: "Description for the new chapter.",
      _csrf: csrfToken,
    };
    const createChapterRes = await agent
      .post(`/course/${1}/createchapter`)
      .send(newChapter);

    expect(createChapterRes.statusCode).toBe(302);
  });

  // test for see student's enrolled courses
  test("View enrolled courses by a student", async () => {
    await login(agent, "student1@example.com", "password123");

    const stuMyCoursesRes = await agent.get("/student/enrolledCourse");
    expect(stuMyCoursesRes.statusCode).toBe(200);
  });

  // test for change password
  test("Change Password", async () => {
    const changepasswordResponse = await agent.get("/changepassword");

    // Extract CSRF token from the response using Cheerio
    const csrfToken = extractCsrfToken(changepasswordResponse);

    const newPassword = "newPass103";

    const changePasswordResponse = await agent.put("/changepassword").send({
      email: "testuser1@example.com",
      password: newPassword,
      _csrf: csrfToken,
    });
    expect(changePasswordResponse.statusCode).toBe(302);
    //login with new password
    await login(agent, "testuser1@example.com", newPassword);

    const loginResponse = await agent.get("/teacherDB");
    expect(loginResponse.statusCode).toBe(200);
  });
});
