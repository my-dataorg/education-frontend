"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Stroke = {
  color: string;
  width: number;
  points: { x: number; y: number }[];
};

type Props = {
  value: string;
  onChange: (json: string) => void;
  readOnly?: boolean;
  className?: string;
};

function parseStrokes(raw: string): Stroke[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as Stroke[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function DrawingBoard({ value, onChange, readOnly = false, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() => parseStrokes(value));
  const drawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);

  const redraw = useCallback((rows: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const stroke of rows) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    setStrokes(parseStrokes(value));
  }, [value]);

  useEffect(() => {
    redraw(strokes);
  }, [strokes, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(280, Math.floor(rect.height));
      redraw(strokes);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [strokes, redraw]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const commit = (next: Stroke[]) => {
    setStrokes(next);
    onChange(JSON.stringify(next));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    drawing.current = true;
    currentStroke.current = {
      color: "#111827",
      width: 3,
      points: [pointFromEvent(event)],
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !currentStroke.current || readOnly) return;
    currentStroke.current.points.push(pointFromEvent(event));
    redraw([...strokes, currentStroke.current]);
  };

  const onPointerUp = () => {
    if (!drawing.current || !currentStroke.current || readOnly) return;
    drawing.current = false;
    commit([...strokes, currentStroke.current]);
    currentStroke.current = null;
  };

  const clearBoard = () => {
    if (readOnly) return;
    commit([]);
  };

  return (
    <div className={`flex h-full min-h-[280px] flex-col rounded-xl border border-border bg-card ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground">Drawing board</p>
        {!readOnly && (
          <button
            type="button"
            onClick={clearBoard}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className={`h-full w-full flex-1 touch-none ${readOnly ? "cursor-default" : "cursor-crosshair"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </div>
  );
}
