import type { XY } from 'fabric';

export const CELL_SIZE = 50;
export const CELL_UNIT = 0.5;

export function canvas2global(v: number): number {
  return (v / CELL_SIZE) * CELL_UNIT;
}
export function global2canvas(v: number): number {
  return (v / CELL_UNIT) * CELL_SIZE;
}
export function canvas2globalXY(point: XY): XY {
  return {
    x: canvas2global(point.x),
    y: canvas2global(-point.y),
  };
}

export function global2canvasXY(point: XY): XY {
  return {
    x: global2canvas(point.x),
    y: global2canvas(-point.y),
  };
}
