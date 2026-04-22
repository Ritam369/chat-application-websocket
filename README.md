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

## Message seen tick flow

- Server assigns a `messageId` (UUID) to every message and stores it in `seenTracker` Map: `messageId → { senderId, seenBy: Set<socketId> }`.
- Receiver's `IntersectionObserver` fires when 80% of a received message bubble is in view → emits `socket.emit("user-seen", { messageId })`.
- Server catches `socket.on("user-seen")`, adds the viewer's socketId to `seenBy`, then checks if every other connected socket (excluding sender) has seen it.
- If yes → `ioServer.to(senderId).emit("server-message-seen", { messageId })` is emitted only to the original sender.
- Sender catches `socket.on("server-message-seen")`, finds the message element by `data-message-id`, and adds `.tick--visible` → tick animates in.
- No tick if only one socket is connected, or not all others have seen it yet.
- On `disconnect`, server re-runs the seen check — if the disconnected socket was the last blocker, tick fires for the sender.