type Segment = any;

type Stroke = {
  id: string;
  userId: string;
  segments: Segment[];
};

type Room = {
  strokes: Stroke[];
  redoStack: Stroke[];
};



const rooms = new Map<string, Room>();

export function getRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { strokes: [], redoStack: [] });

  }
  return rooms.get(roomId)!;
}

export function addSegment(
  roomId: string,
  userId: string,
  segment: Segment
) {
  const room = getRoom(roomId);

  let stroke = room.strokes.find((s) => s.id === segment.strokeId);

  if (!stroke) {
    stroke = {
      id: segment.strokeId,
      userId,
      segments: [],
    };
    room.strokes.push(stroke);
  }

  stroke.segments.push(segment);
}

export function undoLast(roomId: string, userId: string) {
  const room = getRoom(roomId);

  for (let i = room.strokes.length - 1; i >= 0; i--) {
    if (room.strokes[i].userId === userId) {
      const [removed] = room.strokes.splice(i, 1);
      room.redoStack.push(removed);
      return;
    }
  }
}

export function redoLast(roomId: string) {
  const room = getRoom(roomId);

  const stroke = room.redoStack.pop();
  if (!stroke) return;

  room.strokes.push(stroke);
}


export function getAllSegments(roomId: string) {
  return getRoom(roomId).strokes.flatMap((s) => s.segments);
}
