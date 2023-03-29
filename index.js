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

app.route("/").get((req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app
  .route("/api/users")
  .post((req, res) => {
    const { username } = req.body;

    new userModel({
      username: username,
    })
      .save()
      .then((doc) => {
        res.json({ username: doc.username, _id: doc._id });
      });
  })
  .get((req, res) => {
    userModel.find({}).then((docs) => {
      res.json(
        docs.map((element) => {
          return { username: element.username, _id: element._id };
        })
      );
    });
  });

app.post("/api/users/:id/exercises", (req, res) => {
  const { id } = req.params;
  const { description, duration, date } = req.body;

  const dateRegex = /\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])*/g;
  const validatedDate = !dateRegex.test(date) ? new Date().toDateString() : date;

  const exercisesObj = {
    description: description,
    duration: Number(duration),
    date: validatedDate,
  };

  userModel.findByIdAndUpdate(id, { $push: { log: exercisesObj } }, { new: true }).then((doc) => {
    const resJSON = {
      username: doc.username,
      _id: id,
      description: description,
      duration: duration,
      date: validatedDate
    }

    if (!doc) {
      res.json({ error: "User not found" });
    } else {
      res.json(resJSON)
    }
  });

  // console.log(mongoose.Types.ObjectId.isValid(id)) //Possible fix
  //The problem is that your userModel never returns null becouse he assumes that no matter what you searching in the end there mus be array
});

const port = process.env.PORT || 3000;
const listener = app.listen(port, () => {
  console.log(`Your app is listening to localhost:${listener.address().port}`);
  console.log("Press ctrl + c to exit");
});
