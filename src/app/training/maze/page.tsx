"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */

type WallKey = "top" | "right" | "bottom" | "left";

type Cell = {
  r: number;
  c: number;
  walls: Record<WallKey, boolean>;
};

/* ----------------------------------------------------
   PROPER SHUFFLE (Fisher–Yates)
---------------------------------------------------- */

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ----------------------------------------------------
   MAZE GENERATION (Improved DFS)
---------------------------------------------------- */

function generateMaze(rows = 12, cols = 12): Cell[][] {
  const maze: Cell[][] = [];

  for (let r = 0; r < rows; r++) {
    maze[r] = [];
    for (let c = 0; c < cols; c++) {
      maze[r][c] = {
        r,
        c,
        walls: { top: true, right: true, bottom: true, left: true },
      };
    }
  }

  const visited = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  function carve(r: number, c: number) {
    visited.add(key(r, c));

    const directions = shuffle([
      [-1, 0, "top", "bottom"],
      [1, 0, "bottom", "top"],
      [0, -1, "left", "right"],
      [0, 1, "right", "left"],
    ] as [number, number, WallKey, WallKey][]);

    for (const [dr, dc, wall, opposite] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !visited.has(key(nr, nc))
      ) {
        maze[r][c].walls[wall] = false;
        maze[nr][nc].walls[opposite] = false;
        carve(nr, nc);
      }
    }
  }

  carve(0, 0);
  return maze;
}

/* ----------------------------------------------------
   BFS SHORTEST PATH
---------------------------------------------------- */

function shortestPathLength(maze: Cell[][]): number {
  const rows = maze.length;
  const cols = maze[0].length;

  const visited = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const queue: [number, number, number][] = [[0, 0, 0]];

  while (queue.length) {
    const [r, c, dist] = queue.shift()!;
    if (r === rows - 1 && c === cols - 1) return dist;

    if (visited.has(key(r, c))) continue;
    visited.add(key(r, c));

    const w = maze[r][c].walls;

    if (!w.top) queue.push([r - 1, c, dist + 1]);
    if (!w.bottom) queue.push([r + 1, c, dist + 1]);
    if (!w.left) queue.push([r, c - 1, dist + 1]);
    if (!w.right) queue.push([r, c + 1, dist + 1]);
  }

  return -1;
}

/* ----------------------------------------------------
   THEMES
---------------------------------------------------- */

const THEMES = {
  amber: {
    bg: "from-black via-indigo-950 to-amber-500",
    cell: "bg-slate-900/70",
    player: "bg-white text-black",
    goal: "bg-yellow-400 text-black",
  },
  neon: {
    bg: "from-black via-purple-900 to-pink-600",
    cell: "bg-slate-900/80",
    player: "bg-pink-400 text-black",
    goal: "bg-blue-100 text-black",
  },
  ocean: {
    bg: "from-blue-900 via-cyan-800 to-teal-500",
    cell: "bg-slate-900/70",
    player: "bg-cyan-400 text-black",
    goal: "bg-pink-400 text-black",
  },
};

type ThemeKey = keyof typeof THEMES;

/* ----------------------------------------------------
   MAIN
---------------------------------------------------- */

export default function MazeSolverPro() {
  const router = useRouter();

  const rows = 12;
  const cols = 12;

  const [maze, setMaze] = useState<Cell[][]>(() =>
    generateMaze(rows, cols)
  );
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [steps, setSteps] = useState(0);
  const [minSteps, setMinSteps] = useState(0);
  const [win, setWin] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("amber");
  const [fog, setFog] = useState(false);

  const visitedCells = useRef<Set<string>>(new Set(["0,0"]));
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMinSteps(shortestPathLength(maze));
  }, [maze]);

  const move = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      if (win) return;

      const [r, c] = pos;
      const w = maze[r][c].walls;
      let newPos: [number, number] | null = null;

      if (dir === "up" && !w.top) newPos = [r - 1, c];
      if (dir === "down" && !w.bottom) newPos = [r + 1, c];
      if (dir === "left" && !w.left) newPos = [r, c - 1];
      if (dir === "right" && !w.right) newPos = [r, c + 1];

      if (newPos) {
        setPos(newPos);
        setSteps((s) => s + 1);
        visitedCells.current.add(`${newPos[0]},${newPos[1]}`);
      }
    },
    [maze, pos, win]
  );

  /* Keyboard */
  useEffect(() => {
  function handleKey(e: KeyboardEvent) {
    const active = document.activeElement;
    const isFormElement =
      active instanceof HTMLInputElement ||
      active instanceof HTMLSelectElement ||
      active instanceof HTMLTextAreaElement;

    if (isFormElement) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      move("up");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move("down");
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      move("left");
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move("right");
    }
  }

  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [move]);


  /* Swipe */
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) move("right");
      if (dx < -30) move("left");
    } else {
      if (dy > 30) move("down");
      if (dy < -30) move("up");
    }
  }

  useEffect(() => {
    const [r, c] = pos;
    if (r === rows - 1 && c === cols - 1) setWin(true);
  }, [pos]);

  function reset() {
    const m = generateMaze(rows, cols);
    setMaze(m);
    setPos([0, 0]);
    setSteps(0);
    setWin(false);
    visitedCells.current = new Set(["0,0"]);
    setMinSteps(shortestPathLength(m));
  }

  const efficiency =
    steps === 0 ? 0 : Math.round((minSteps / steps) * 100);

  const currentTheme = THEMES[theme];

  return (
    <main
      className={`min-h-screen bg-gradient-to-br ${currentTheme.bg} text-white flex flex-col items-center py-10 px-4`}
    >
      <div className="flex justify-between w-full max-w-3xl mb-6">
        <button
          onClick={() => router.push("/training")}
          className="text-sm underline text-white/70 hover:text-white"
        >
          ← Go Back
        </button>

        <div className="flex gap-3 text-xs">
          <div className="flex gap-2">
  {(["amber", "neon", "ocean"] as ThemeKey[]).map((t) => (
    <button
      key={t}
      onClick={() => setTheme(t)}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition
        ${
          theme === t
            ? "bg-white text-black"
            : "bg-white/10 border border-white/30 hover:bg-white/20"
        }
      `}
    >
      {t}
    </button>
  ))}
</div>


          <button
            onClick={() => setFog((f) => !f)}
            className="bg-white/10 border border-white/30 rounded px-2 py-1"
          >
            Fog: {fog ? "On" : "Off"}
          </button>
        </div>
      </div>

      <h1 className="text-3xl font-extrabold mb-4">🧩 Maze Solver</h1>

      <div className="flex gap-6 text-sm mb-6">
        <span>Steps: {steps}</span>
        <span>Optimal: {minSteps}</span>
        <span>Efficiency: {efficiency}%</span>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="w-full max-w-md aspect-square bg-white/10 p-2 rounded-2xl border border-white/20 shadow-2xl"
      >
        <div
          className="grid w-full h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
          }}
        >
          {maze.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = pos[0] === r && pos[1] === c;
              const isGoal = r === rows - 1 && c === cols - 1;

              const seen =
                visitedCells.current.has(`${r},${c}`) ||
                (Math.abs(pos[0] - r) + Math.abs(pos[1] - c) <= 1);

              const hidden = fog && !seen;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`aspect-square flex items-center justify-center text-xs font-bold transition-all duration-150
                    ${hidden ? "bg-black" : currentTheme.cell}
                    ${
                      isPlayer
                        ? currentTheme.player + " scale-105"
                        : isGoal
                        ? currentTheme.goal
                        : ""
                    }`}
                  style={{
                    borderTop: cell.walls.top
                      ? "2px solid rgba(255,255,255,0.4)"
                      : "1px solid transparent",
                    borderBottom: cell.walls.bottom
                      ? "2px solid rgba(255,255,255,0.4)"
                      : "1px solid transparent",
                    borderLeft: cell.walls.left
                      ? "2px solid rgba(255,255,255,0.4)"
                      : "1px solid transparent",
                    borderRight: cell.walls.right
                      ? "2px solid rgba(255,255,255,0.4)"
                      : "1px solid transparent",
                  }}
                >
                  {!hidden && (isPlayer ? "A" : isGoal ? "B" : "")}
                </div>
              );
            })
          )}
        </div>
      </div>

      {win && (
        <div className="mt-6 text-center">
          <p className="text-2xl font-bold text-emerald-300">
            🎉 You reached the goal!
          </p>
        </div>
      )}

      <button
        onClick={reset}
        className="mt-6 px-5 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition"
      >
        New Maze
      </button>
    </main>
  );
}
