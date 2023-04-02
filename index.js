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

  // We want to search db only when the user enter some kind of valid id
  // If he don't do that we dont even bother
  if (mongoose.Types.ObjectId.isValid(id)) {
    userModel
      .findByIdAndUpdate(id, { $push: { log: exercisesObj } }, { new: true })
      .then((doc) => {
        if (!doc) {
          return res.json({ error: "User not found" });
        }

        const resObj = {
          username: doc.username,
          description: description,
          duration: Number(duration),
          date: validatedDate,
          _id: id,
        };

        return res.json(resObj);
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    return res.json({ error: "Invalid id" });
  }
});

app.get("/api/users/:_id/logs", (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  if (mongoose.Types.ObjectId.isValid(_id)) {
    userModel
      .findById(_id)
      .then((doc) => {
        if (!doc) {
          res.json({ error: "User not found" });
        }

        const { _id, username, log } = doc;

        const filterByDates = log.filter((item) => {
          // Time offset is needed to have constant miliseconds
          const timeOffset = " 00:00:00";
          const itemDate = new Date(item.date + timeOffset).getTime();
          const fromDate = new Date(from + timeOffset).getTime();
          const toDate = new Date(to + timeOffset).getTime();

          if (fromDate && toDate) {
            return itemDate >= fromDate && itemDate <= toDate;
          }
          if (fromDate && !toDate) {
            return itemDate >= fromDate;
          }
          if (!fromDate && toDate) {
            return itemDate <= toDate;
          }
          if (!fromDate && !toDate) {
            return itemDate;
          }
        });

        const filterByNumber = limit !== undefined ? filterByDates.slice(0, Number(limit)) : null;

        const logResponse = {
          username: username,
          _id: _id.toString(),
          count: log.length,
          log: filterByNumber || filterByDates,
        };

        res.json(logResponse);
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    res.json({ error: "Cannot GET - invalid ID" });
  }
});

const port = process.env.PORT || 3000;
const listener = app.listen(port, () => {
  console.log(`Your app is listening to localhost:${listener.address().port}`);
  console.log("Press ctrl + c to exit");
});
