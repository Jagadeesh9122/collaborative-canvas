export type Point = { x: number; y: number };

export type StrokeSegment = {
  strokeId: string;
  start: Point;
  end: Point;
  color: string;
  width: number;
  isEraser: boolean;
};
