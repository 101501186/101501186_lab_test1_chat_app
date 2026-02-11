require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketio = require("socket.io");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const User = require("./models/User");
const GroupMessage = require("./models/GroupMessage");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


// SIGNUP API
app.post("/signup", async (req, res) => {
  const { username, firstname, lastname, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, firstname, lastname, password: hashed });
  await user.save();
  res.json({ message: "User created" });
});

// LOGIN API
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json("User not found");

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json("Wrong password");

  res.json({ message: "Login success", username });
});

// SOCKET.IO
io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log("Joined room:", room);
  });

  socket.on("chatMessage", async (data) => {
    io.to(data.room).emit("message", data);
    await GroupMessage.create(data);
  });

  socket.on("typing", (data) => {
    socket.to(data.room).emit("typing", data.username);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});
