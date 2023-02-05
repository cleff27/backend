const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://aadarsh:test123@cluster0.4ryob.mongodb.net/careerDB",
  { useNewUrlParser: true, useUnifiedTopology: true }
);
const courseschema = new mongoose.Schema({
  title: String,
  content: String,
});

// Create a Mongoose model for your collection
const Course = mongoose.model("Course", courseschema);

app.get("/course/:id", (req, res) => {
  let id = req.params.id;
  Course.findOne({ _id: id }, function (err, result) {
    if (!err) {
      res.json(result);
    } else {
      console.log(err);
    }
  });
});
app.get("/thumbnail", (req, res) => {
  Course.find({}, function (err, result) {
    if (!err) {
      res.json(result);
    } else {
      console.log(err);
    }
  });
});
app.post("/create", (request, response) => {
  const input = new Course({
    title: request.body.title,
    content: request.body.content,
  });

  input
    .save()
    .then(() => response.send({ message: "Input saved successfully" }))
    .catch((error) => response.status(400).send(error));
});
app.listen(5000, () => console.log("Listening on port 5000"));
