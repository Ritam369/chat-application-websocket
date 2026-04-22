import http from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import express from "express";
import { randomUUID } from "node:crypto";
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

  // messageId → { senderId: socketId, seenBy: Set<socketId> }
  const seenTracker = new Map();

  function checkAllSeen(messageId) {
    const entry = seenTracker.get(messageId);
    if (!entry) return;

    const otherSockets = [...ioServer.sockets.sockets.keys()].filter(
      (id) => id !== entry.senderId
    );

    // Only emit tick if there's at least one other socket and all have seen it
    if (otherSockets.length > 0 && otherSockets.every((id) => entry.seenBy.has(id))) {
      ioServer.to(entry.senderId).emit("server-message-seen", { messageId });
      seenTracker.delete(messageId);
    }
  }

  ioServer.on("connection", (socket) => {
    console.log("a new socket has connected", socket.id);

    socket.on("user-message", (data) => {
      console.log("Received message:", data);
      const messageId = randomUUID();
      const messagePayload = {
        messageId,
        text: data?.text ?? "",
        timestamp: getTimeHHMM(),
        senderId: socket.id,
      };
      seenTracker.set(messageId, { senderId: socket.id, seenBy: new Set() });
      ioServer.emit("server-message", messagePayload);
    });

    //client sends → { text }
    // server receives → adds messageId + timestamp + senderId → broadcasts { messageId, text, timestamp, senderId }
    // client receives → server-message with all 4 fields

    socket.on("user-seen", ({ messageId }) => {
      const entry = seenTracker.get(messageId);
      if (!entry || entry.senderId === socket.id) return;
      entry.seenBy.add(socket.id);
      checkAllSeen(messageId);
    });

    socket.on("user-typing", () => {
      socket.broadcast.emit("server-user-typing", { socketId: socket.id });
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
      // Re-check all tracked messages — disconnected socket may have been the last blocker
      for (const messageId of seenTracker.keys()) {
        checkAllSeen(messageId);
      }
    });
  });

  const port = process.env.PORT || 8000;

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

main();
