import http from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import express from "express";
import "dotenv/config";

function getTimeHHMM() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function main() {

  const app = express();
  app.use(express.static(path.resolve("./public")));

  const server = http.createServer(app);
  const ioServer = new Server();
  ioServer.attach(server);

  ioServer.on("connection", (socket) => {
    console.log("a new socket has connected", socket.id);

    socket.on("user-message", (data) => {
      console.log("Received message:", data);
      const messagePayload = {
        text: data?.text ?? "",
        timestamp: getTimeHHMM(),
        senderId: socket.id,
      };
      ioServer.emit("server-message", messagePayload);
    });

    //client sends → { text }
    // server receives → adds timestamp + senderId → broadcasts { text, timestamp, senderId }
    // client receives → server-message with all 3 fields


    socket.on("user-typing", () => {
      socket.broadcast.emit("server-user-typing", { socketId: socket.id });
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  const port = process.env.PORT || 8000;

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

main();
