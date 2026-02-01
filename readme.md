# 🎨 Real-Time Collaborative Drawing Canvas

> A multi-user drawing application where multiple people can sketch simultaneously on the same canvas with real-time synchronization, global undo/redo, and room-based collaboration.

## 🎯 Built to Demonstrate

- Low-latency WebSocket architecture
- Raw HTML Canvas mastery
- Conflict-aware undo/redo
- Scalable real-time systems
- Production-ready code structure

---

## ✨ Features

### Core
- ✅ Real-time multi-user drawing
- ✅ Brush & eraser tools
- ✅ Color picker + stroke width
- ✅ Ghost cursors for other users
- ✅ Room-based collaboration
- ✅ Late joiners see full canvas
- ✅ Server-authoritative undo/redo
- ✅ Deterministic canvas rebuild
- ✅ Event batching for performance

### Bonus
- ⭐ Stroke batching (~60fps)
- ⭐ Reload restores canvas
- ⭐ Active tool UI indicators
- ⭐ High-DPI canvas scaling
- ⭐ Network-efficient protocol

---

## 📋 Requirements

- Node.js 16+
- npm or yarn
- Modern browser (Chrome, Firefox, Safari, Edge)

---

## 🧠 Architecture Summary

The server is the single source of truth.

**Clients:**
- Draw locally for instant feedback
- Batch stroke segments
- Send over WebSocket
- Replay authoritative state on undo/redo

**Undo & Redo:**
- Tracked per-room on server
- Scoped to requesting user
- Full canvas is recomputed
- Broadcast to all clients

[📖 Full Details →](./ARCHITECTURE.md)

---

## 📂 Project Structure

```
collaborative-canvas/
├── client/
│   └── src/
│       ├── App.tsx
│       ├── websocket.ts
│       └── main.tsx
├── server/
│   └── src/
│       ├── index.ts
│       └── rooms.ts
├── ARCHITECTURE.md
├── README.md
└── package.json
```

---

## 🚀 Quick Start

### 1️⃣ Clone Repository
```bash
git clone <repo-url>
cd collaborative-canvas
```

### 2️⃣ Install Dependencies

**Server:**
```bash
cd server && npm install
```

**Client:**
```bash
cd ../client && npm install
```

### 3️⃣ Run Locally

**Start Server:**
```bash
cd server && npm run dev
```
Server: `http://localhost:4000`

**Start Client:**
```bash
cd client && npm run dev
```
Open: `http://localhost:5173`

---

## 🧪 Testing Multi-User

1. Open app in two browser tabs
2. Draw in one tab → appears instantly in the other
3. Move cursor → ghost dot visible
4. Click **Undo** → removes your last stroke globally
5. Click **Redo** → restores it
6. Refresh page → canvas state reloads

---

## ⚙️ WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | client → server | Join room |
| `room-history` | server → client | Send canvas history |
| `stroke-batch` | client → server | Batched draw segments |
| `stroke-batch` | server → room | Broadcast segments |
| `cursor-move` | client → server | Cursor location |
| `cursor-move` | server → room | Ghost cursor |
| `undo` | client → server | Undo last stroke |
| `redo` | client → server | Redo |
| `canvas-sync` | server → room | Rebuild canvas |

---

## ⚡ Performance Techniques

- Stroke batching (16ms flush)
- Server-authoritative history
- Replay only on undo/redo
- High-DPI canvas scaling
- Minimal redraws
- Stateless clients

---

## 🧩 Conflict Resolution

The server serializes all drawing operations.

**Undo:** Removes last stroke by requesting user without deleting others' work. Canvas is rebuilt deterministically.

**Simultaneous Drawing:** Resolved by arrival order on server and operation replay.

---

## 📈 Production Scaling (1000+ Users)

- Redis pub/sub for Socket.io
- Horizontal node servers
- Sticky sessions
- Canvas state snapshotting
- Database persistence
- CDN for frontend

---

## ⏱️ Timeline

~4–5 days of development

---

## 🐞 Known Limitations

- Canvas is in-memory (no DB persistence yet)
- No authentication
- Single server instance
- Undo is per-user, not per-stroke selection
