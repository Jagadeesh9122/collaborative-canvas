import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  addSegment,
  undoLast,
  redoLast,
  getAllSegments,
} from "./rooms";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);

    const history = getAllSegments(roomId);
    socket.emit("room-history", history);
  });

  socket.on(
    "stroke-segment",
    (payload: { roomId: string; segment: any }) => {
      addSegment(payload.roomId, socket.id, payload.segment);
      socket.to(payload.roomId).emit("stroke-segment", payload.segment);
    }
  );

  socket.on("redo", (roomId: string) => {
  redoLast(roomId);

  const segments = getAllSegments(roomId);
  io.to(roomId).emit("canvas-sync", segments);
});


  socket.on("undo", (roomId: string) => {
    undoLast(roomId, socket.id);

    const segments = getAllSegments(roomId);
    io.to(roomId).emit("canvas-sync", segments);
  });

  socket.on(
    "cursor-move",
    (payload: { roomId: string; x: number; y: number }) => {
      socket.to(payload.roomId).emit("cursor-move", {
        userId: socket.id,
        x: payload.x,
        y: payload.y,
      });
    }
  );

  socket.on(
  "stroke-batch",
  (payload: { roomId: string; segments: any[] }) => {
    payload.segments.forEach((seg) =>
      addSegment(payload.roomId, socket.id, seg)
    );

    socket
      .to(payload.roomId)
      .emit("stroke-batch", payload.segments);
  }
);


  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log("Socket server running on port", PORT);
});

