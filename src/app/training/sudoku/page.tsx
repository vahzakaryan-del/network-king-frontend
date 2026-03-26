"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Cell = {
  value: number | null;
  fixed: boolean;
};

/* ---- MULTIPLE PUZZLES ---- */
const puzzles: (number | null)[][][] = [
  [
    [5, 3, null, null, 7, null, null, null, null],
    [6, null, null, 1, 9, 5, null, null, null],
    [null, 9, 8, null, null, null, null, 6, null],
    [8, null, null, null, 6, null, null, null, 3],
    [4, null, null, 8, null, 3, null, null, 1],
    [7, null, null, null, 2, null, null, null, 6],
    [null, 6, null, null, null, null, 2, 8, null],
    [null, null, null, 4, 1, 9, null, null, 5],
    [null, null, null, null, 8, null, null, 7, 9],
  ],
  [
    [null, null, 4, 8, null, null, null, 1, 7],
    [6, null, null, null, null, 3, null, null, null],
    [null, null, 2, null, 6, null, 5, null, null],
    [8, 2, null, 1, null, null, null, null, null],
    [null, null, null, null, 3, null, null, null, null],
    [null, null, null, null, null, 6, null, 4, 1],
    [null, null, 1, null, 5, null, 3, null, null],
    [null, null, null, 3, null, null, null, null, 6],
    [4, 3, null, null, null, 1, 7, null, null],
  ],
  [
    [null, 7, null, null, 4, null, null, 8, null],
    [1, null, 9, null, null, 2, 3, null, null],
    [null, null, null, 6, null, null, null, 2, 5],
    [7, 2, null, null, null, null, 1, null, null],
    [null, null, 5, null, 2, null, 9, null, null],
    [null, null, 8, null, null, null, null, 5, 3],
    [5, 9, null, null, null, 4, null, null, null],
    [null, null, 7, 2, null, null, 6, null, 1],
    [null, 1, null, null, 9, null, null, 7, null],
  ],
  [
    [null, null, 8, 1, null, 4, null, null, 6],
    [null, 4, null, null, null, null, 2, null, null],
    [6, null, null, null, 8, 3, null, 1, null],
    [null, 5, null, null, 1, null, 8, null, null],
    [4, null, null, 3, null, 7, null, null, 5],
    [null, null, 3, null, 5, null, null, 7, null],
    [null, 8, null, 7, 3, null, null, null, 2],
    [null, null, 4, null, null, null, null, 5, null],
    [7, null, null, 6, null, 1, 3, null, null],
  ],
  [
    [2, null, null, null, null, 9, 6, null, null],
    [null, null, 6, null, null, null, null, 4, 1],
    [null, 1, 9, 4, null, null, null, null, null],
    [null, null, null, 9, 3, null, null, null, 8],
    [6, null, null, null, null, null, null, null, 3],
    [4, null, null, null, 6, 2, null, null, null],
    [null, null, null, null, null, 7, 9, 2, null],
    [9, 4, null, null, null, null, 1, null, null],
    [null, null, 1, 6, null, null, null, null, 7],
  ],
  [
    [null, null, 5, null, 2, null, 4, null, null],
    [7, 2, null, null, null, null, null, 3, null],
    [null, null, 3, null, 4, null, 8, null, 1],
    [4, null, null, null, null, 8, null, 1, null],
    [null, null, 6, 4, null, 3, 9, null, null],
    [null, 3, null, 2, null, null, null, null, 7],
    [9, null, 7, null, 1, null, 5, null, null],
    [null, 5, null, null, null, null, null, 9, 3],
    [null, null, 4, null, 7, null, 2, null, null],
  ],
  [
    [null, 6, null, null, 8, null, null, 2, null],
    [null, null, 2, 5, null, null, 7, null, null],
    [1, null, null, null, null, 6, null, null, 4],
    [null, null, 5, null, null, null, 9, null, null],
    [4, null, null, null, 5, null, null, null, 1],
    [null, null, 1, null, null, null, 4, null, null],
    [7, null, null, 1, null, null, null, null, 3],
    [null, null, 4, null, null, 5, 1, null, null],
    [null, 9, null, null, 3, null, null, 8, null],
  ],
  [
    [null, null, 7, null, 9, 5, null, null, 1],
    [5, null, null, null, null, null, 4, null, null],
    [null, null, 2, 3, null, null, null, 7, null],
    [2, 1, null, null, null, 9, null, null, 6],
    [null, null, null, 1, null, 7, null, null, null],
    [6, null, null, 8, null, null, null, 1, 4],
    [null, 5, null, null, null, 4, 2, null, null],
    [null, null, 8, null, null, null, null, null, 3],
    [7, null, null, 5, 6, null, 8, null, null],
  ],

    // Puzzle 9
  [
    [null, null, null, 2, 6, null, 7, null, 1],
    [6, 8, null, null, 7, null, null, 9, null],
    [1, 9, null, null, null, 4, 5, null, null],
    [8, 2, null, 1, null, null, null, 4, null],
    [null, null, 4, 6, null, 2, 9, null, null],
    [null, 5, null, null, null, 3, null, 2, 8],
    [null, null, 9, 3, null, null, null, 7, 4],
    [null, 4, null, null, 5, null, null, 3, 6],
    [7, null, 3, null, 1, 8, null, null, null],
  ],

  // Puzzle 10
  [
    [null, 2, null, 6, null, 8, null, null, null],
    [5, 8, null, null, null, 9, 7, null, null],
    [null, null, null, null, 4, null, null, null, null],
    [3, 7, null, null, null, null, 5, null, null],
    [6, null, null, null, null, null, null, null, 4],
    [null, null, 8, null, null, null, null, 1, 3],
    [null, null, null, null, 2, null, null, null, null],
    [null, null, 9, 8, null, null, null, 3, 6],
    [null, null, null, 3, null, 6, null, 9, null],
  ],

  // Puzzle 11
  [
    [null, null, 5, null, null, 8, null, null, 1],
    [null, 9, null, null, 1, null, null, 3, null],
    [1, null, null, null, null, null, 9, null, null],
    [null, null, null, 5, null, 7, null, null, null],
    [null, 7, null, null, 3, null, null, 5, null],
    [null, null, null, 1, null, 9, null, null, null],
    [null, null, 3, null, null, null, null, null, 8],
    [null, 6, null, null, 8, null, null, 2, null],
    [9, null, null, 7, null, null, 4, null, null],
  ],

  // Puzzle 12
  [
    [2, null, null, null, 8, null, 3, null, null],
    [null, 6, null, null, 7, null, null, 8, 4],
    [null, 3, null, 5, null, null, 2, null, 9],
    [null, null, null, 1, null, 5, 4, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, 1, 6, null, 9, null, null, null],
    [7, null, 8, null, null, 2, null, 5, null],
    [5, 4, null, null, 1, null, null, 7, null],
    [null, null, 6, null, 9, null, null, null, 8],
  ],

  // Puzzle 13
  [
    [null, null, null, null, null, null, 2, null, null],
    [null, 8, null, null, null, 7, null, 9, null],
    [6, null, 2, null, null, null, 5, null, null],
    [null, 7, null, null, 6, null, null, null, null],
    [null, null, null, 9, null, 1, null, null, null],
    [null, null, null, null, 2, null, null, 4, null],
    [null, null, 5, null, null, null, 6, null, 3],
    [null, 9, null, 4, null, null, null, 7, null],
    [null, null, 6, null, null, null, null, null, null],
  ],

  // Puzzle 14
  [
    [null, null, null, 6, null, null, 4, null, null],
    [7, null, null, null, null, 3, 6, null, null],
    [null, null, null, null, 9, 1, null, 8, null],
    [null, null, null, null, null, null, null, null, null],
    [null, 5, null, 1, 8, null, null, null, 3],
    [null, null, null, 3, null, 6, null, 4, 5],
    [null, 4, null, 2, null, null, null, 6, null],
    [9, null, 3, null, null, null, null, null, null],
    [null, 2, null, null, null, null, 1, null, null],
  ],

  // Puzzle 15
  [
    [null, null, 1, null, null, 7, null, 9, null],
    [null, 3, null, null, 2, null, null, null, 8],
    [null, null, 9, 6, null, null, 5, null, null],
    [null, null, 5, 3, null, null, 9, null, null],
    [null, 1, null, null, 8, null, null, null, 2],
    [6, null, null, null, null, 4, null, null, null],
    [3, null, null, null, null, null, null, 1, null],
    [null, 4, null, null, null, null, null, null, 7],
    [null, null, 7, null, null, null, 3, null, null],
  ],

  // Puzzle 16
  [
    [null, null, null, null, null, null, null, null, 2],
    [null, 8, null, null, null, 7, null, 9, null],
    [6, null, 2, null, null, null, 5, null, null],
    [null, 7, null, null, 6, null, null, null, null],
    [null, null, null, 9, null, 1, null, null, null],
    [null, null, null, null, 2, null, null, 4, null],
    [null, null, 5, null, null, null, 6, null, 3],
    [null, 9, null, 4, null, null, null, 7, null],
    [1, null, null, null, null, null, null, null, null],
  ],

  // Puzzle 17
  [
    [null, 4, null, null, null, null, 8, null, 5],
    [null, null, null, 2, null, 1, null, null, null],
    [null, null, 6, null, null, null, null, 7, null],
    [null, null, null, null, 6, null, null, null, null],
    [3, null, null, 5, null, 8, null, null, 2],
    [null, null, null, null, 1, null, null, null, null],
    [null, 2, null, null, null, null, 6, null, null],
    [null, null, null, 4, null, 9, null, null, null],
    [5, null, 8, null, null, null, null, 1, null],
  ],

  // Puzzle 18
  [
    [null, null, null, 7, null, null, 3, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, 4, null, null, null],
    [null, null, null, null, 6, null, null, null, null],
    [null, null, 1, null, null, null, 7, null, null],
    [null, null, null, null, 1, null, null, null, null],
    [null, null, null, 3, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, 7, null, null, 9, null, null, null],
  ],

  // Puzzle 19
  [
    [8, null, null, null, null, null, null, null, null],
    [null, null, 3, 6, null, null, null, null, null],
    [null, 7, null, null, 9, null, 2, null, null],
    [null, 5, null, null, null, 7, null, null, null],
    [null, null, null, null, 4, 5, 7, null, null],
    [null, null, null, 1, null, null, null, 3, null],
    [null, null, 1, null, null, null, null, 6, 8],
    [null, null, 8, 5, null, null, null, 1, null],
    [null, 9, null, null, null, null, 4, null, null],
  ],

  // Puzzle 20
  [
    [null, null, null, null, null, 6, null, 8, null],
    [null, 2, null, null, null, null, null, null, null],
    [null, null, 1, null, 9, null, null, null, null],
    [null, null, null, null, null, null, 5, null, 7],
    [null, null, 4, null, null, null, 1, null, null],
    [3, null, null, null, null, null, null, null, null],
    [null, null, null, null, 7, null, 2, null, null],
    [null, null, null, null, null, null, null, 3, null],
    [null, 4, null, 5, null, null, null, null, null],
  ],

];

/* Convert puzzle → grid with fixed flags */
function createGrid(puzzle: (number | null)[][]): Cell[][] {
  return puzzle.map((row) => row.map((v) => ({ value: v, fixed: v !== null })));
}

function randIndex(max: number) {
  return Math.floor(Math.random() * max);
}

export default function SudokuPage() {
  const router = useRouter();

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [grid, setGrid] = useState<Cell[][]>(() => createGrid(puzzles[0]));
  const [message, setMessage] = useState<string | null>(null);

  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutRef = useRef<HTMLDivElement | null>(null);

  // Selected cell (for subtle highlighting)
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);

  const filledCount = useMemo(() => {
    let count = 0;
    for (const row of grid) for (const cell of row) if (cell.value) count++;
    return count;
  }, [grid]);

  // Live conflict detection (duplicates in row/col/box)
  const conflicts = useMemo(() => {
    const bad = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false));
    const values = grid.map((row) => row.map((c) => c.value));

    // helper: mark duplicates in a list of coords
    const markDuplicates = (coords: Array<{ r: number; c: number }>) => {
      const seen = new Map<number, Array<{ r: number; c: number }>>();
      for (const { r, c } of coords) {
        const v = values[r][c];
        if (!v) continue;
        const arr = seen.get(v) ?? [];
        arr.push({ r, c });
        seen.set(v, arr);
      }
      for (const [, arr] of seen) {
        if (arr.length > 1) for (const { r, c } of arr) bad[r][c] = true;
      }
    };

    // rows
    for (let r = 0; r < 9; r++) {
      markDuplicates(Array.from({ length: 9 }, (_, c) => ({ r, c })));
    }
    // cols
    for (let c = 0; c < 9; c++) {
      markDuplicates(Array.from({ length: 9 }, (_, r) => ({ r, c })));
    }
    // boxes
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const coords: Array<{ r: number; c: number }> = [];
        for (let r = br * 3; r < br * 3 + 3; r++) {
          for (let c = bc * 3; c < bc * 3 + 3; c++) coords.push({ r, c });
        }
        markDuplicates(coords);
      }
    }

    return bad;
  }, [grid]);

  const hasConflicts = useMemo(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (conflicts[r][c]) return true;
    return false;
  }, [conflicts]);

  function loadPuzzle(index: number) {
    setPuzzleIndex(index);
    setGrid(createGrid(puzzles[index]));
    setMessage(null);
    setSelected(null);
  }

  function loadRandomPuzzle() {
    const next = randIndex(puzzles.length);
    loadPuzzle(next);
  }

  function handleChange(r: number, c: number, val: string) {
    setMessage(null);

    // allow empty
    if (val === "") {
      setGrid((prev) =>
        prev.map((row, ri) =>
          row.map((cell, ci) => (ri === r && ci === c && !cell.fixed ? { ...cell, value: null } : cell))
        )
      );
      return;
    }

    // keep only 1 digit, 1–9
    const digit = Number(val.slice(-1));
    if (Number.isNaN(digit) || digit < 1 || digit > 9) return;

    setGrid((prev) =>
      prev.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c && !cell.fixed ? { ...cell, value: digit } : cell))
      )
    );
  }

  function checkValid(): boolean {
    // valid means: all filled + no duplicates in rows/cols/boxes
    if (filledCount !== 81) return false;
    if (hasConflicts) return false;
    return true;
  }

  function handleCheck() {
    setMessage(
      checkValid()
        ? "✅ Great job! This solution is valid."
        : filledCount < 81
        ? "🟨 Keep going! Fill all cells before checking."
        : "❌ Something is off. Fix duplicates in rows, columns, or boxes."
    );
  }

  // About modal: close on outside click + ESC
  useEffect(() => {
    if (!aboutOpen) return;

    function onDown(e: MouseEvent) {
      const el = aboutRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setAboutOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAboutOpen(false);
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [aboutOpen]);

  const statusPill = useMemo(() => {
    if (message?.includes("✅")) return "bg-emerald-500/15 border-emerald-300/30 text-emerald-200";
    if (message?.includes("❌")) return "bg-rose-500/15 border-rose-300/30 text-rose-200";
    if (hasConflicts) return "bg-amber-500/15 border-amber-300/30 text-amber-200";
    return "bg-white/5 border-white/15 text-white/75";
  }, [hasConflicts, message]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-amber-500 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* TOP BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => router.push("/training")}
              className="sm:flex px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
            >
              ← Back
            </button>

          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAboutOpen(true)}
              className="hidden sm:flex px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
            >
              About
            </button>
            
          </div>
        </div>

        {/* ABOUT MODAL */}
        {aboutOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
            <div className="absolute inset-0 bg-black/40" />
            <div
              ref={aboutRef}
              className="relative z-10 w-full max-w-md rounded-2xl bg-slate-950/70 border border-white/15 shadow-2xl backdrop-blur-xl p-5"
              role="dialog"
              aria-modal="true"
              aria-label="About Sudoku"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold">About Sudoku</h2>
                <button
                  onClick={() => setAboutOpen(false)}
                  className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="mt-3 text-sm text-white/80 leading-relaxed">
                Sudoku strengthens memory, sharpens logic, and boosts focus.
                Fill the grid so that each row, column, and 3×3 box contains the digits 1–9 exactly once.
              </p>

              <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white/80">
                <div>✨ Live help: duplicates are highlighted automatically.</div>
                <div>📱 Mobile: taps open the numeric keyboard.</div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="mt-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">🧩 Sudoku</h1>
          <p className="text-white/75 mt-2 text-sm sm:text-base max-w-2xl">
            Solve the puzzle. Fixed numbers are highlighted. Duplicates glow red.
          </p>
        </div>

        {/* MAIN CARD */}
        <div className="mt-6 rounded-3xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden">
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-white/70">
              Puzzle <span className="font-semibold text-white/90">#{puzzleIndex + 1}</span> of {puzzles.length}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCheck}
                className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition text-sm font-semibold"
              >
                Check
              </button>
              <button
              onClick={loadRandomPuzzle}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
            >
              New puzzle
            </button>
              <button
                onClick={() => loadPuzzle(puzzleIndex)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
              >
                Reset puzzle
              </button>

           
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {/* Sudoku Grid */}   
            <span className={`px-3 py-1.5 rounded-full border text-xs ${statusPill}`}>
              {filledCount}/81 filled{hasConflicts ? " • conflicts" : ""}
            </span>
            <div className="mx-auto w-full max-w-[420px]">
              
              <div className="grid grid-cols-9 gap-[2px] bg-white/10 p-[3px] rounded-2xl">
                {grid.map((row, r) =>
                  row.map((cell, c) => {
                    const thickRight = (c + 1) % 3 === 0 && c !== 8;
                    const thickBottom = (r + 1) % 3 === 0 && r !== 8;

                    const isSelected = selected?.r === r && selected?.c === c;
                    const sameRow = selected?.r === r;
                    const sameCol = selected?.c === c;
                    const sameBox =
                      selected &&
                      Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                      Math.floor(selected.c / 3) === Math.floor(c / 3);

                    const highlightBand = selected && (sameRow || sameCol || sameBox);

                    return (
                      <div
                        key={`${r}-${c}`}
                        style={{
                          borderRight: thickRight ? "2px solid rgba(255,255,255,0.35)" : "none",
                          borderBottom: thickBottom ? "2px solid rgba(255,255,255,0.35)" : "none",
                        }}
                      >
                        <input
                          inputMode="numeric"
                          pattern="[1-9]*"
                          maxLength={1}
                          className={[
                            "aspect-square w-9 sm:w-11",
                            "text-center text-base sm:text-lg rounded-lg",
                            "border outline-none transition",
                            "focus:ring-2 focus:ring-amber-400",
                            // base background
                            cell.fixed ? "bg-slate-950/55" : "bg-slate-950/35",
                            // subtle band highlight
                            highlightBand ? "border-white/25" : "border-white/10",
                            // selected cell
                            isSelected ? "ring-2 ring-amber-300/70" : "",
                            // conflict highlight
                            conflicts[r][c] ? "bg-rose-500/15 border-rose-300/25 ring-1 ring-rose-300/25" : "",
                            // text styling
                            cell.fixed ? "text-amber-200 font-semibold" : "text-white",
                          ].join(" ")}
                          value={cell.value ?? ""}
                          disabled={cell.fixed}
                          onFocus={() => setSelected({ r, c })}
                          onClick={() => setSelected({ r, c })}
                          onChange={(e) => handleChange(r, c, e.target.value)}
                          aria-label={`Row ${r + 1}, Column ${c + 1}`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`mt-4 rounded-2xl px-4 py-3 border ${
                  message.includes("✅")
                    ? "bg-emerald-400/10 border-emerald-300/20"
                    : message.includes("❌")
                    ? "bg-rose-400/10 border-rose-300/20"
                    : "bg-amber-400/10 border-amber-300/20"
                }`}
              >
                <p className="text-center text-sm text-white/90">{message}</p>
              </div>
            )}

            {/* Tiny tips */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/65">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="font-semibold text-white/80 mb-1">Hint</p>
                <p>Tap a cell to highlight its row, column, and box.</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="font-semibold text-white/80 mb-1">Mistakes</p>
                <p>Duplicates glow red so you can fix them fast.</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="font-semibold text-white/80 mb-1">Quick reset</p>
                <p>Use “Reset puzzle” if you want a clean slate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
