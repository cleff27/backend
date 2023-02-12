require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
app.use(cors({ credentials: true }));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB");
});
const courseschema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  introduction: String,
  task: [{ value: String }],
  pros: String,
  category: String,
  beginner: String,
  intermediate: String,
  advance: String,
  link: String,
  userid: String,
  vidinfo: { type: Object, required: true },
  liked: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
});
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdCourses: [String],
  liked: [String],
});

userSchema.pre("save", function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) return next(err);
    user.password = hash;
    next();
  });
});

// Create a Mongoose model for your collection
const Course = mongoose.model("Course", courseschema);
const User = mongoose.model("User", userSchema);
app.use(cookieParser());
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

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
app.get("/category/:id", (req, res) => {
  let id = req.params.id;
  Course.find({ category: id }, function (error, courses) {
    if (error) {
      console.error(error);
    } else {
      res.json(courses);
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
  const course = new Course(request.body);
  course
    .save()
    .then((savedObject) => {
      User.findByIdAndUpdate(
        course.userid,
        { $push: { createdCourses: savedObject._id } },
        { new: true },
        (err, updatedUser) => {
          if (err) {
            return res.status(500).send({ error: "Error updating the user" });
          }
        }
      );
      response.send({ message: "Input saved successfully" });
    })
    .catch((error) =>
      response.status(400).send({ error: "Error in creating course" })
    );
});
app.get("/mycourses/:userId", (req, res) => {
  const userId = req.params.userId;
  User.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).send("User not found");
      }
      const courseIds = user.createdCourses;
      Course.find({
        _id: { $in: courseIds },
      })
        .then((courses) => {
          res.send(courses);
        })
        .catch((err) => {
          res.status(500).send(err.message);
        });
    })
    .catch((err) => {
      res.status(500).send(err.message);
    });
});
app.delete("/cards/:id", function (req, res) {
  Course.findByIdAndDelete(req.params.id, function (error, card) {
    if (error) {
      return res.status(500).send({ error: "Error deleting card" });
    }
    if (!card) {
      return res.status(404).send({ error: "Card not found" });
    }
    res.send(card);
  });
});
app.put("/update/:id", function (req, res) {
  Course.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true },
    function (error, updatedObject) {
      if (error) {
        return res.status(500).send({ error: "Error updating object" });
      }
      if (!updatedObject) {
        return res.status(404).send({ error: "Object not found" });
      }
      res.send({ message: "Saved Succesfully" });
    }
  );
});
app.get("/most-liked", function (req, res) {
  Course.find()
    .sort({ liked: -1 })
    .limit(3)
    .exec(function (error, objects) {
      if (error) {
        return res.status(500).send({ error: "Error getting objects" });
      }
      if (!objects) {
        return res.status(404).send({ error: "Objects not found" });
      }
      res.send(objects);
    });
});
app.get("/most-recent", function (req, res) {
  Course.find()
    .sort({ date: -1 })
    .limit(3)
    .exec(function (error, objects) {
      if (error) {
        return res.status(500).send({ error: "Error getting objects" });
      }
      if (!objects) {
        return res.status(404).send({ error: "Objects not found" });
      }
      res.send(objects);
    });
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  const user = new User({ name, email, password });
  user.save((err, user) => {
    if (err) return res.status(400).json({ msg: "Email already exists" });
    res.json({ msg: "User created successfully" });
  });
});
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email }).then((user) => {
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    bcrypt.compare(password, user.password).then((isMatch) => {
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }
      req.session.user = user;
      res.cookie("user", user, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      res.json({ isLoggedIn: true, user });
    });
  });
});
app.post("/logout", (req, res) => {
  res.clearCookie("user");
  req.session.destroy(() => {
    res.send({ success: true });
  });
});
app.get("/check-login", (req, res) => {
  const user = req.cookies.user;
  if (!user) {
    return res.json({ isLoggedIn: false });
  }
  res.json({ isLoggedIn: true, user });
});
app.get("*", (req, res) => {
  res.status(404).send("Page not found");
});

app.listen(process.env.PORT || 5000, () =>
  console.log("Listening on port 5000")
);
