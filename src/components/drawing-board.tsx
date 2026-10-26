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

const MIN_CANVAS_HEIGHT = 480;
const CANVAS_GROW_PADDING = 120;
const GRID_STEP = 24;

function maxStrokeY(rows: Stroke[], extra?: Stroke | null): number {
  let maxY = 0;
  const all = extra ? [...rows, extra] : rows;
  for (const stroke of all) {
    for (const p of stroke.points) {
      maxY = Math.max(maxY, p.y);
    }
  }
  return maxY;
}

function heightForContent(rows: Stroke[], extra?: Stroke | null): number {
  const contentBottom = maxStrokeY(rows, extra);
  if (contentBottom <= 0) return 0;
  return Math.ceil(contentBottom + CANVAS_GROW_PADDING);
}

function paintGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#d1d5db";
  for (let y = GRID_STEP; y < height; y += GRID_STEP) {
    for (let x = GRID_STEP; x < width; x += GRID_STEP) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function DrawingBoard({ value, onChange, readOnly = false, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() => parseStrokes(value));
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [padPages, setPadPages] = useState(2);
  const [viewportHeight, setViewportHeight] = useState(MIN_CANVAS_HEIGHT);
  const drawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);

  const padHeight = Math.max(MIN_CANVAS_HEIGHT, viewportHeight * padPages);
  const contentHeight = heightForContent(strokes, currentStroke.current);
  const canvasHeight = Math.max(padHeight, contentHeight);

  const redraw = useCallback(
    (rows: Stroke[], width: number, height: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      paintGrid(ctx, width, height);
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
    },
    []
  );

  useEffect(() => {
    setStrokes(parseStrokes(value));
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    redraw(strokes, canvasWidth, canvasHeight);
  }, [strokes, canvasWidth, canvasHeight, redraw]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const measure = () => {
      const w = Math.max(320, Math.floor(scrollEl.clientWidth));
      const h = Math.max(280, Math.floor(scrollEl.clientHeight));
      setCanvasWidth(w);
      setViewportHeight(h);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, []);

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
    const canvas = canvasRef.current;
    if (canvas) {
      redraw([...strokes, currentStroke.current], canvas.width, canvas.height);
    }
  };

  const onPointerUp = () => {
    if (!drawing.current || !currentStroke.current || readOnly) return;
    drawing.current = false;
    commit([...strokes, currentStroke.current]);
    currentStroke.current = null;
  };

  const undoLast = () => {
    if (readOnly || strokes.length === 0) return;
    commit(strokes.slice(0, -1));
  };

  const clearBoard = () => {
    if (readOnly) return;
    setPadPages(2);
    commit([]);
  };

  const extendPad = () => {
    setPadPages((n) => n + 1);
    requestAnimationFrame(() => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: "smooth" });
    });
  };

  const showExtendHint = !readOnly && canvasHeight <= viewportHeight * padPages + 4;

  const shellClass = className?.trim()
    ? className
    : "h-full min-h-[17.5rem]";

  return (
    <div
      className={`flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm ${shellClass}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">Drawing board</p>
          {!readOnly && (
            <p className="hidden text-[11px] text-muted-foreground/80 sm:block">
              Scroll the pad or extend for more room.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={extendPad}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
              >
                Extend ↓
              </button>
              <button
                type="button"
                onClick={undoLast}
                disabled={strokes.length === 0}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={clearBoard}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-b-xl bg-muted/30"
      >
        <canvas
          ref={canvasRef}
          style={{ width: canvasWidth, height: canvasHeight }}
          className={`block w-full touch-none shadow-sm ${readOnly ? "cursor-default" : "cursor-crosshair"}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {showExtendHint && (
          <div className="pointer-events-none sticky bottom-0 hidden justify-center pb-2 pt-4 sm:flex">
            <span className="rounded-full bg-background/90 px-3 py-1 text-[11px] text-muted-foreground shadow-sm ring-1 ring-border">
              Need more space? Use Extend ↓
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
