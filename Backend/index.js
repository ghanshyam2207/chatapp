const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

// ✅ io variable me store karo
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ✅ ab use karo
io.on("connection", (socket) => {
  console.log(`Connection established ID : ${socket.id}`);
  socket.on("send_message", (data) => {
    console.log(data);

    socket.broadcast.emit('receive_message', data);
  });

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.broadcast.emit("stop_typing", data);
  });

  socket.on("delete_message", (data) => {
    socket.broadcast.emit("delete_message", data);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});