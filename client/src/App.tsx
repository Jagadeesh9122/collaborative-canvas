import { useEffect, useRef, useState } from "react";
import { socket } from "./websocket";

/* ================= TYPES ================= */

type Point = { x: number; y: number };

type Stroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
};

type StrokeSegment = {
  strokeId: string;
  start: Point;
  end: Point;
  color: string;
  width: number;
  isEraser: boolean;
};

/* ================= COMPONENT ================= */

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const currentStroke = useRef<Stroke | null>(null);
  const pendingSegments = useRef<StrokeSegment[]>([]);


  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(4);

  const [cursors, setCursors] = useState<
    Record<string, { x: number; y: number }>
  >({});

  /* ================= SOCKET SETUP ================= */

useEffect(() => {
  const handleConnect = () => {
    socket.emit("join-room", "default");
    console.log("Connected:", socket.id);
  };

  const handleCursor = ({
    userId,
    x,
    y,
  }: {
    userId: string;
    x: number;
    y: number;
  }) => {
    setCursors((prev) => ({ ...prev, [userId]: { x, y } }));
  };

  const handleStroke = (seg: StrokeSegment) => {
    drawRemoteSegment(seg);
  };

  const handleSync = (segments: StrokeSegment[]) => {
    clearCanvas();
    redrawFromSegments(segments);
  };

  const handleBatch = (segments: StrokeSegment[]) => {
    segments.forEach(drawRemoteSegment);
  };

  socket.on("connect", handleConnect);
  socket.on("cursor-move", handleCursor);
  socket.on("stroke-segment", handleStroke);
  socket.on("canvas-sync", handleSync);
  socket.on("room-history", handleSync);
  socket.on("stroke-batch", handleBatch);

  return () => {
    socket.off("connect", handleConnect);
    socket.off("cursor-move", handleCursor);
    socket.off("stroke-segment", handleStroke);
    socket.off("canvas-sync", handleSync);
    socket.off("room-history", handleSync);
    socket.off("stroke-batch", handleBatch);
  };
}, []);


  /* ================= CANVAS SETUP ================= */

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctxRef.current = ctx;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;

      canvas.style.width = w + "px";
      canvas.style.height = h + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
  const interval = setInterval(() => {
    if (!pendingSegments.current.length) return;

    socket.emit("stroke-batch", {
      roomId: "default",
      segments: pendingSegments.current,
    });

    pendingSegments.current = [];
  }, 16);

  return () => clearInterval(interval);
}, []);


  /* ================= DRAWING ================= */

  function getPoint(e: PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDraw(e: React.PointerEvent) {
    const p = getPoint(e.nativeEvent);

    currentStroke.current = {
      id: crypto.randomUUID(),
      points: [p],
      color,
      width,
      isEraser: tool === "eraser",
    };
  }

  function draw(e: React.PointerEvent) {
  if (!currentStroke.current || !ctxRef.current) return;

  const p = getPoint(e.nativeEvent);
  const stroke = currentStroke.current;

  stroke.points.push(p);

  drawStrokeSegment(stroke);

  const seg: StrokeSegment = {
    strokeId: stroke.id,
    start: stroke.points.at(-2)!,
    end: p,
    color: stroke.color,
    width: stroke.width,
    isEraser: stroke.isEraser,
  };

  // 👇 push into buffer instead of emitting immediately
  pendingSegments.current.push(seg);

  socket.emit("cursor-move", {
    roomId: "default",
    x: p.x,
    y: p.y,
  });
}


  function endDraw() {
    currentStroke.current = null;
  }

  /* ================= RENDER HELPERS ================= */

  function drawStrokeSegment(stroke: Stroke) {
    const ctx = ctxRef.current!;
    const pts = stroke.points;

    if (pts.length < 2) return;

    ctx.save();

    ctx.globalCompositeOperation = stroke.isEraser
      ? "destination-out"
      : "source-over";

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.restore();
  }

  function drawRemoteSegment(seg: StrokeSegment) {
    const ctx = ctxRef.current!;
    ctx.save();

    ctx.globalCompositeOperation = seg.isEraser
      ? "destination-out"
      : "source-over";

    ctx.strokeStyle = seg.color;
    ctx.lineWidth = seg.width;

    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();

    ctx.restore();
  }

  function redrawFromSegments(segments: StrokeSegment[]) {
    const canvas = canvasRef.current!;
    const ctx = ctxRef.current!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    segments.forEach(drawRemoteSegment);
  }

  /* ================= UNDO ================= */

  function undo() {
    socket.emit("undo", "default");
  }

  function clearCanvas() {
  const canvas = canvasRef.current;
  const ctx = ctxRef.current;

  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}


  /* ================= UI ================= */
    /* ================= UI HELPERS ================= */

  const toolButtonStyle = (name: "brush" | "eraser") => ({
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    cursor: "pointer",
    fontWeight: 600,
    background:
      tool === name ? (name === "brush" ? "#4f46e5" : "#dc2626") : "#fff",
    color: tool === name ? "#fff" : "#000",
  });


  return (
    <>
      {Object.entries(cursors).map(([id, pos]) => (
        <div
          key={id}
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            width: 10,
            height: 10,
            background: "red",
            borderRadius: "50%",
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      ))}

            <div
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          background: "#eee",
          padding: 10,
          borderRadius: 8,
          display: "flex",
          gap: 8,
          zIndex: 10,
          alignItems: "center",
        }}
      >
        {/* Tool Selection */}
        <button
          style={toolButtonStyle("brush")}
          onClick={() => setTool("brush")}
        >
          Brush
        </button>

        <button
          style={toolButtonStyle("eraser")}
          onClick={() => setTool("eraser")}
        >
          Eraser
        </button>

        {/* Color Picker */}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        {/* Stroke Width */}
        <input
          type="range"
          min={1}
          max={30}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />

        {/* History Controls */}
        <button onClick={undo}>Undo</button>
        <button onClick={() => socket.emit("redo", "default")}>Redo</button>
      </div>


      <canvas
        ref={canvasRef}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        style={{
          display: "block",
          background: "#fff",
          touchAction: "none",
        }}
      />
    </>
  );
}
