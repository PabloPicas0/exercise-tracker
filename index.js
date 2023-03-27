require("dotenv").config();
const bodyParser = require("body-parser");

const express = require("express");
const cors = require("cors");

const mongoose = require("mongoose");

const app = express();

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  log: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});

const userModel = mongoose.model("userModel", userSchema);

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", (req, res) => {
  const { username } = req.body;

  new userModel({
    username: username,
  })
    .save()
    .then((doc) => {
      res.json({ username: doc.username, _id: doc._id });
    });
});

app.post("/", (req, res) => {
  const { id, description, duration, date } = req.body;
  const exercisesObj = {
    description: description,
    duration: Number(duration),
    date: date || new Date().toDateString(),
  };

  userModel.findByIdAndUpdate(id, { log: [exercisesObj] }).then((doc) => {
    return res.redirect(`/api/users/${id}/exercises`);
  });
});

app.get("/api/users/:id/exercises", (req, res) => {
  const { id } = req.params;

  userModel.findById(id).then((doc) => {
    if (!doc) {
      return res.json("User doesn't exists");
    } else {
      const { description, duration, date } = doc.log[0];

      return res.json({
        username: doc.username,
        description: description,
        duration: duration,
        date: date,
        _id: doc._id,
      });
    }
  });
});

app.get("/api/users", (req, res) => {
  userModel.find({}).then((docs) => {
    res.json(
      docs.map((element) => {
        return { username: element.username, _id: element._id };
      })
    );
  });
});

const port = process.env.PORT || 3000;
const listener = app.listen(port, () => {
  console.log(`Your app is listening to localhost:${listener.address().port}`);
  console.log("Press ctrl + c to exit");
});
