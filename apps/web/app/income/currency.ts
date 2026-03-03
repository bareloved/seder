// ─────────────────────────────────────────────────────────────────────────────
// Math Helpers for safe currency calculations
// ─────────────────────────────────────────────────────────────────────────────

export const Currency = {
  add: (a: number, b: number) => Number((a + b).toFixed(2)),
  subtract: (a: number, b: number) => Number((a - b).toFixed(2)),
  multiply: (a: number, b: number) => Number((a * b).toFixed(2)),
  divide: (a: number, b: number) => Number((a / b).toFixed(2)),
  fromString: (s: string) => Number(parseFloat(s).toFixed(2)),
};

