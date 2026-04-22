# WebSocket-based basic chat application

- Implemented server-side logic in index.js using Express and Socket.IO
- Created a static HTML interface for the chat application in public/index.html
- Added user message handling and broadcasting with timestamps and sender IDs
- Included typing indicator functionality for real-time user feedback

## Socket flow (short)

- Client sends chat message via `socket.emit("user-message", { text })` in `public/index.html`.
- Server catches it with `socket.on("user-message")` in `index.js`, adds `timestamp (hh:mm)` + `senderId`, then emits `ioServer.emit("server-message", payload)` to all clients.
- Clients catch it using `socket.on("server-message")` and append message as sent/received in UI.
- While typing, client emits debounced `socket.emit("user-typing", ...)`.
- Server catches `socket.on("user-typing")` and broadcasts to others only with `socket.broadcast.emit("server-user-typing", { socketId })`.
- Other clients catch `socket.on("server-user-typing")`, that shows typing indicator.