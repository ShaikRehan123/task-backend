const express = require("express");
const app = express();
const mysql = require("mysql");
const bodyParser = require("body-parser");
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");
const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      req.body.name.toLowerCase().split(" ").join("_") +
        Math.random(5) * 100 +
        path.extname(file.originalname)
    ); //Appending extension
  },
});
const upload = multer({ storage: storage });
app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
app.use("/uploads", express.static("uploads"));
const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "taskcms",
});

connection.connect(function (err) {
  if (!!err) {
    console.log(err);
  } else {
    console.log("Connected");
  }
});

app.get("/", (req, res) => {
  res.send({
    status: 200,
    message: "Hello Are you Rehan Shaik",
  });
});

app.post("/signup", (req, res) => {
  // console.log(req.body);
  const encryptedPassword = cryptr.encrypt(req.body.password);

  const query = connection.query(
    "INSERT INTO admin SET ?",
    { username: req.body.username, password: encryptedPassword },
    function (error, results, fields) {
      if (error) {
        if (error.code == "ER_DUP_ENTRY") {
          res.send({
            status: 400,
            message: "Duplicate Entry",
            error: error.sqlMessage,
          });
        } else {
          res.send({
            status: 500,
            message: "Server Issue",
            error: error,
          });
        }
      } else {
        const entries = connection.query(
          "SELECT * FROM `admin` WHERE username = ?",
          req.body.username,
          function (error, results, fields) {
            // console.log(results);
            res.send({
              status: 200,
              message: results,
            });
          }
        );
      }
    }
  );
});

app.post("/login", (req, res) => {
  const entries = connection.query(
    "SELECT * FROM `admin` WHERE username = ?",
    req.body.username,
    function (error, results, fields) {
      // console.log(results[0].password);
      if (results == "") {
        // console.log("I am Getting Called");
        res.send({
          status: 400,
          message: "User Not Found",
          error: "User Not Found with this username",
        });
      } else if (req.body.password !== cryptr.decrypt(results[0].password)) {
        res.send({
          status: 400,
          message: "Invalid Password",
          error: "Invalid Password",
        });
      } else {
        res.send({
          status: 200,
          message: results,
        });
      }
    }
  );
});

app.get("/get_all_family", (req, res) => {
  const family = connection.query(
    "SELECT * FROM `family_person`",
    function (error, results, fields) {
      if (error) {
        res.send({
          status: 500,
          message: "Server Issue",
          error: error,
        });
      } else {
        let curedData = [];
        results.map((person) => {
          // console.log(person);
          curedData.push({
            id: person.id,
            album: JSON.parse(person.album),
            name: person.name,
            photograph_url: person.photograph_url,
            description: person.description,
            education_details: person.education_details,
          });
        });
        res.send({
          status: 200,
          message: "Familes Found Successfully",
          data: curedData,
        });
      }
    }
  );
});

const cpUpload = upload.fields([
  { name: "profile-picture", maxCount: 1 },
  { name: "gallery", maxCount: 20 },
]);
app.post("/upload_family", cpUpload, function (req, res, next) {
  let galleriesUrl = [];
  let filename = `${req.protocol}://${req.get("host")}/uploads/${
    req.files["profile-picture"][0].filename
  }`;
  req.files["gallery"].map((file) => {
    galleriesUrl.push(
      `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );
  });
  galleriesUrl = JSON.stringify(galleriesUrl);
  filename = filename;
  const name = req.body.name;
  const description = req.body.about;
  const education_details = `${req.body.education_details}`;
  // console.log(req.body);
  const family = connection.query(
    "INSERT INTO `family_person` (album,name,photograph_url,description,education_details) VALUES (?,?,?,?,?)",
    [galleriesUrl, name, filename, description, education_details],
    function (error, results, fields) {
      if (error) {
        res.send({
          status: 500,
          message: "Server Issue",
          error: error,
        });
      } else {
        const familyperson = connection.query(
          "SELECT * FROM `family_person` WHERE name = ?",
          req.body.name,
          function (error, results, fields) {
            // console.log(results);
            res.send({
              status: 200,
              message: "Added family successfully",
              data: results,
            });
          }
        );
      }
    }
  );
});

app.get("/get_person_by_id", (req, res) => {
  // console.log(req.query.id);
  connection.query(
    "SELECT * FROM `family_person` WHERE id = ?",
    req.query.id,
    function (error, results, fields) {
      if (error) {
        res.send({
          status: 500,
          message: "Server Issue",
          error: error,
        });
      } else {
        if (results == [] || results == "") {
          res.send({
            status: 400,
            message: `Can't Find Family Person with id ${req.query.id}`,
            message: `Can't Find Family Person with id ${req.query.id}`,
          });
        } else {
          let curedData = [];
          results.map((person) => {
            // console.log(person);
            curedData.push({
              id: person.id,
              album: JSON.parse(person.album),
              name: person.name,
              photograph_url: person.photograph_url,
              description: person.description,
              education_details: person.education_details,
            });
          });
          res.send({
            status: 200,
            message: `Successfully found family person`,
            data: curedData,
          });
        }
      }
    }
  );
});

app.put("/update_family", cpUpload, function (req, res, next) {
  let galleriesUrl = [];
  let filename = `${req.protocol}://${req.get("host")}/uploads/${
    req.files["profile-picture"][0].filename
  }`;
  req.files["gallery"].map((file) => {
    galleriesUrl.push(
      `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );
  });
  galleriesUrl = JSON.stringify(galleriesUrl);
  filename = filename;
  const name = req.body.name;
  const description = req.body.about;
  const education_details = `${req.body.education_details}`;
  // console.log(req.body);
  const family = connection.query(
    "UPDATE `family_person` SET album = ?,name = ?,photograph_url = ?,description = ? ,education_details =?  WHERE id = ?",
    [
      galleriesUrl,
      name,
      filename,
      description,
      education_details,
      req.query.id,
    ],
    function (error, results, fields) {
      if (error) {
        res.send({
          status: 500,
          message: "Server Issue",
          error: error,
        });
      } else {
        const familyperson = connection.query(
          "SELECT * FROM `family_person` WHERE name = ?",
          req.body.name,
          function (error, results, fields) {
            // console.log(results);
            res.send({
              status: 200,
              message: "Added family successfully",
              data: results,
            });
          }
        );
      }
    }
  );
});

app.delete("/delete_family", function (req, res) {
  console.log(req.query.id);
  const family = connection.query(
    "DELETE FROM `family_person` WHERE id = ?",
    req.query.id,
    function (error, results, fields) {
      if (error) {
        res.send({
          status: 500,
          message: "Server Issue",
          error: error,
        });
      } else {
        res.send({
          status: 200,
          message: "User Deleted Successfully",
        });
      }
    }
  );
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Listening on Port 8080");
});
