const express = require("express");
const app = express();
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const generateAccessToken = require("./genAccessToken");
const validToken = require("./validToken");

require("dotenv").config();

// middleware setup
app.use(express.json());

// getting info from env
const db_host = process.env.DB_HOST;
const db_user = process.env.DB_USER;
const db_password = process.env.DB_PASSWORD;
const db_database = process.env.DB_DATABASE;
const db_port = process.env.DB_PORT;
const port = process.env.PORT;

const db = mysql.createPool({
  connectionLimit: 100,
  host: db_host,
  user: db_user,
  password: db_password,
  database: db_database,
  port: db_port,
});

db.getConnection((err, connection) => {
  if (err) {
    throw err;
  }
  console.log("DataBase connection successful: " + connection.threadId);
});

// hashing passwords,signUp users
app.post("/signUp", async (req, res) => {
  const { userName, firstName, lastName, password, email } = req.body;
  const hashPassword = await bcrypt.hash(password, 10);

  db.getConnection(async (err, connection) => {
    if (err) {
      throw err;
    }
    const sqlSearch = "SELECT * FROM userInfo WHERE userName = ?";
    const search_query = mysql.format(sqlSearch, [userName]);
    const sqlInsert = "INSERT INTO userInfo VALUES (0,?,?,?,?,?)";
    const insert_query = mysql.format(sqlInsert, [
      userName,
      firstName,
      lastName,
      hashPassword,
      email,
    ]);

    await connection.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("---Search Results---");
      console.log(result.length);

      if (result.length != 0) {
        connection.release();
        console.log("---User Already Exists---");
        res.send("User Already Exists");
      } else {
        await connection.query(insert_query, (err, result) => {
          if (err) throw err;
          console.log("---New User Created---");
          console.log(result.insertId);
          res.send("New User Created");
        });
      }
    });
  });
});

// log in users

app.post("/login", (req, res) => {
  const { userName, password } = req.body;

  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM userInfo WHERE userName=?";
    const serach_query = mysql.format(sqlSearch, [userName]);

    connection.query(serach_query, async (err, result) => {
      connection.release();
      if (err) throw err;
      if (result.length == 0) {
        console.log("---User does not exist---");
        res.send("User does not exist");
      } else {
        const hashPassword = result[0].password;
        // const userID = result[0].userID;
        if (await bcrypt.compare(password, hashPassword)) {
          console.log("---Log In Successful---");
          console.log("---Generating Access Token---");
          const token = generateAccessToken({ userName: userName });
          console.log(token);
          // res.send(token);
          res.send(`accessToken:${token}  ${userName} logged in successfully`);
        } else {
          console.log("---Password Incorrect----");
          res.send("Password Incorrect");
        }
      }
    });
  });
});

// app.get("/create-post", validToken, (req, res) => {
//   console.log("Token is valid");
//   console.log(req.userName.userName);
//   res.send(`${req.userName.userName} successfully accessed post`);
// });

// creating APIs

//show all users
app.get("/show-users", validToken, async (req, res) => {
  // const showUsers = "SELECT * FROM userInfo";
  await db.query("SELECT * FROM userInfo", (err, rows) => {
    if (err) {
      return res.status(404).send(err);
    }
    return res.status(200).send(rows);
  });
});

// show specific showUsers
app.get("/show-user", validToken, async (req, res) => {
  const { userName } = req.body;
  const showUser = mysql.format("SELECT * FROM userInfo WHERE userName=?", [
    userName,
  ]);
  await db.query(showUser, (err, result) => {
    if (err) {
      return res.status(404).send(err);
    }
    return res.status(200).send(result);
  });
});

//create post

app.listen(port, () => {
  console.log(`Server Started On Port ${port}`);
});
