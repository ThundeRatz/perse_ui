import * as fabric from 'fabric';
import { signal, Signal } from '@preact-signals/safe-react';
import { canvas2globalXY, global2canvas, global2canvasXY } from '@/lib/canvas_coordinates';
import type { ReactiveDescription } from '@/lib/ros_utils';

const fill = 'oklch(86.9% 0.022 252.894)';
const has_coneStroke = 'oklch(37.5% 0.1249 260)';
const has_coneStrokeDeselected = 'oklch(40% 0.0715 260)';
const marginStrokeSelected = 'oklch(86.9% 0.022 252.894)';
const marginStrokeDeselected = 'oklch(43.4% 0.022 252.9)';

export default class Waypoint {
  objects: fabric.FabricObject[];
  private _n: number;
  group: fabric.Group;
  private margin: fabric.Circle;
  _x: Signal<number> = signal(0);
  _y: Signal<number> = signal(0);
  canvas: fabric.Canvas | undefined;
  _data: Record<string, ReactiveDescription> = {};
  key: number = Math.random();

  get data() {
    return this._data;
  }
  set data(value) {
    this._data = value;
    if ('margin' in value) {
      (value?.margin as ReactiveDescription<number>)?.subscribe((marginValue) => {
        this.margin.set({ radius: global2canvas(marginValue), visible: true });
        this.updateMargin();
        this.canvas?.requestRenderAll();
      });
      (value?.has_cone as ReactiveDescription<boolean>)?.subscribe((has_cone) => {
        this.objects[0].set({
          stroke: has_cone ? has_coneStroke : fill,
          strokeWidth: has_cone ? 4 : 1,
        });
        this.margin.set({ stroke: has_cone ? has_coneStrokeDeselected : marginStrokeDeselected });
        this.canvas?.requestRenderAll();
      });
    } else {
      this.margin.set({ visible: false });
    }
  }

  get x() {
    return this._x.value;
  }
  set x(value) {
    this._x.value = value;
    this.group.set({ left: global2canvasXY({ x: value, y: 0 }).x });
    this.updateMargin();
    this.canvas?.discardActiveObject();
    this.canvas?.setActiveObject(this.group);
    this.canvas?.requestRenderAll();
  }

  get y() {
    return this._y.value;
  }
  set y(value) {
    this._y.value = value;
    this.group.set({ top: global2canvasXY({ x: 0, y: value }).y });
    this.updateMargin();
    this.canvas?.discardActiveObject();
    this.canvas?.setActiveObject(this.group);
    this.canvas?.requestRenderAll();
  }

  get n() {
    return this._n;
  }
  set n(value) {
    this._n = value;
    const textbox = this.objects[2];
    textbox.set({ text: `Marco ${this._n}` });
  }

  constructor(x: number, y: number, n: number = 1) {
    const size = 100;
    this._n = n;

    this.objects = [
      new fabric.Rect({
        width: size,
        height: size,
        fill: '',
        strokeDashArray: [5],
        stroke: fill,
      }),
      new fabric.Circle({
        left: size / 2 - 8,
        top: size / 2 - 8,
        radius: 8,
        fill: '',
        stroke: fill,
      }),
      new fabric.Textbox(`Marco ${n}`, {
        fill: fill,
        fontSize: 14,
        width: size - 8,
        left: 5,
        top: size - 20,
      }),
    ];

    this.margin = new fabric.Circle({
      left: x,
      top: y,
      originX: 'center',
      originY: 'center',
      radius: 100,
      selectable: false,
      fill: '',
      stroke: marginStrokeDeselected,
      visible: false,
    });

    this.group = new fabric.Group(this.objects, {
      left: x,
      top: y,
      originX: 'center',
      originY: 'center',
    });

    this.group.__name = 'waypoint';
    this.group.__instance = this;

    this.group.on('mousemove', () => {
      this.handleMove();
      this.updateMargin();
    });

    this.group.on('selected', () => {
      const has_cone = (this.data.has_cone as ReactiveDescription<boolean> | undefined)?.signal.value ?? false;
      this.margin.set({ stroke: has_cone ? has_coneStroke : marginStrokeSelected });
    });
    this.group.on('deselected', () => {
      const has_cone = (this.data.has_cone as ReactiveDescription<boolean> | undefined)?.signal.value ?? false;
      this.margin.set({ stroke: has_cone ? has_coneStrokeDeselected : marginStrokeDeselected });
    });
    this.group.on('removed', () => {
      this.canvas?.remove(this.margin);
    });

    delete this.group.controls.mr;
    delete this.group.controls.mt;
    delete this.group.controls.mb;
    delete this.group.controls.ml;
  }

  updateMargin() {
    this.margin.set({
      left: this.group.getX(),
      top: this.group.getY(),
    });
  }

  handleMove() {
    const { x, y } = canvas2globalXY({ x: this.group.getX(), y: this.group.getY() });
    this._x.value = x;
    this._y.value = y;
  }

  addTo(canvas: fabric.Canvas) {
    canvas.add(this.margin);
    canvas.add(this.group);
    this.handleMove();
    this.updateMargin();
    this.canvas = canvas;
  }
}
export class WaypointManager {
  waypoints = signal<Waypoint[]>([]);
  canvas: fabric.Canvas | null = null;

  setCanvas(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }
  add(x: number, y: number, n: number) {
    if (!this.canvas) throw Error('Canvas not initialized!');

    const waypoint = new Waypoint(x, y, n);
    waypoint.addTo(this.canvas);
    this.waypoints.value.push(waypoint);
    return waypoint;
  }
  insert(x: number, y: number, n: number) {
    if (n < 1 || n > this.waypoints.value.length + 1) {
      throw Error(`Invalid waypoint n=${n}`);
    }
    if (this.waypoints.value.some((w) => w.n == n)) {
      for (const waypoint of this.waypoints.value) {
        if (waypoint.n >= n) {
          waypoint.n += 1;
        }
      }
    }
    return this.add(x, y, n);
  }
  push(x: number, y: number) {
    return this.insert(x, y, this.waypoints.value.length + 1);
  }
  remove(start: number, end?: number) {
    if (!this.canvas) throw Error('Canvas not initialized!');

    if (this.waypoints.value.length == 0) return;
    if (start < 1 || (end !== undefined && end > this.waypoints.value.length) || start > (end ?? start)) {
      throw Error('Invalid range of n');
    }

    const amount = end ? end - start + 1 : 1;
    for (const waypoint of this.waypoints.value) {
      if (waypoint.n >= start && waypoint.n <= (end ?? start)) {
        this.canvas.remove(waypoint.group);
        continue;
      }
      if (waypoint.n >= start) {
        waypoint.n -= amount;
      }
    }
    this.waypoints.value.splice(start - 1, amount);
  }
  wipe() {
    if (!this.canvas) return;
    this.remove(1, this.waypoints.value.length);
  }
}

export const waypointManager = new WaypointManager();
