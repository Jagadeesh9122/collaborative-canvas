# 🏗️ Real-Time Collaborative Canvas — Architecture

This document explains the system design, real-time protocol, undo/redo strategy, performance decisions, and scaling approach for the collaborative drawing canvas.

The project is intentionally built using the raw HTML Canvas API and WebSockets to demonstrate low-level rendering and realtime synchronization skills.

## 🎯 Design Goals

- Real-time multi-user drawing
- Deterministic canvas state
- Server-authoritative history
- Conflict-safe undo/redo
- Low-latency streaming
- Scalable room-based architecture
- Minimal redraws
- Easy to reason about in interviews

## 🔄 High-Level Architecture

```
┌──────────┐       WebSocket        ┌─────────────┐
│  Client  │  ─────────────────▶  │   Server    │
│ (Canvas) │                      │ (Socket.io) │
└──────────┘  ◀─────────────────  └─────────────┘
          Broadcast to room
```

Clients draw locally for instant feedback.

The server:

- Stores authoritative stroke history
- Serializes operations
- Broadcasts updates
- Handles undo/redo
- Synchronizes late joiners

## 📊 Data Flow

### Normal Drawing

1. User drags pointer on canvas
2. Client creates stroke segments
3. Segments are buffered locally
4. Every ~16ms segments are batched
5. Batch sent to server via WebSocket
6. Server stores segments in room history
7. Server broadcasts batch to room
8. Other clients render immediately

### Undo / Redo

1. Client sends undo or redo event
2. Server updates authoritative history
3. Server recomputes full canvas state
4. Server emits canvas-sync
5. Clients clear canvas
6. Clients replay all remaining segments

This guarantees consistency for all users.

### Late Join / Refresh

1. Client joins room
2. Server sends room-history
3. Client redraws entire canvas from segments

## 📡 WebSocket Protocol

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| join-room | client → server | roomId | Join a canvas room |
| room-history | server → client | segments[] | Full canvas replay |
| stroke-batch | client → server | roomId, segments[] | Batched draw segments |
| stroke-batch | server → room | segments[] | Broadcast batch |
| cursor-move | client → server | roomId, x, y | Cursor position |
| cursor-move | server → room | userId, x, y | Ghost cursors |
| undo | client → server | roomId | Undo last stroke |
| redo | client → server | roomId | Redo |
| canvas-sync | server → room | segments[] | Rebuild canvas |

## 🧠 State Model

Each room stores:

```typescript
Room {
  strokes: Stroke[];
  redoStack: Stroke[];
}

Stroke {
  id: string;
  userId: string;
  segments: Segment[];
}
```

Segments are immutable drawing operations.

Canvas state is never stored as pixels — it is always recomputed by replaying operations.

## ↩️ Undo / Redo Strategy

### Undo

- Removes the most recent stroke created by the requesting user
- Pushes it onto redoStack
- Triggers full canvas rebuild

### Redo

- Pops from redoStack
- Re-inserts into strokes
- Rebuilds canvas

When a new stroke begins, redoStack is cleared.

## ⚔️ Conflict Resolution

This system does not attempt pixel-level merging.

Instead:

- Server serializes all operations
- Arrival order defines final result
- Undo is scoped per-user
- Canvas rebuild guarantees determinism

This avoids race conditions and keeps logic simple and explainable.

## ⚡ Performance Decisions

### Stroke Batching

Pointer events are buffered and flushed every ~16ms (~60fps) to avoid network saturation.

### Incremental Rendering

Clients draw incoming segments immediately instead of redrawing full canvas.

### Full Replay Only on Undo

Canvas is rebuilt only when undo/redo occurs — not during normal drawing.

### High-DPI Canvas

Canvas is scaled using devicePixelRatio for crisp rendering.

## 📈 Scaling to 1000+ Users

For production deployment:

- Redis pub/sub adapter for Socket.io
- Horizontal Node.js servers
- Sticky sessions via load balancer
- Room sharding
- Periodic snapshotting of canvas state
- Database persistence (Postgres / Redis)
- CDN for frontend

## 🧪 Failure Handling

- Client reconnect → requests room history
- Server crash → rooms reset (in-memory only)
- Malformed packets ignored
- Defensive null checks on client

## 🚧 Known Limitations

- No authentication layer
- No database persistence
- Single-node server
- No access control per room
- No snapshot compression yet
