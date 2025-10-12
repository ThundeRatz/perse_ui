import * as fabric from 'fabric';
import { roundTo } from '@/lib/utils';
import { canvas2globalXY } from '@/lib/canvas_coordinates';

export default class Guides {
  vline: fabric.Line;
  hline: fabric.Line;
  canvas: fabric.Canvas;
  attached = false;

  xtext: fabric.Textbox;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;

    const fill = 'oklch(86.9% 0.022 252.894)';
    const stroke = fill;

    this.vline = new fabric.Line([0, 0, 0, 0], {
      selectable: false,
      stroke,
    });
    this.hline = new fabric.Line([0, 0, 0, 0], {
      selectable: false,
      stroke,
    });

    this.xtext = new fabric.Textbox('', {
      left: 0,
      width: 100,
      fontSize: 14,
      flipY: false,
      fill,
    });

    canvas.add(this.vline);
    canvas.add(this.hline);
    canvas.add(this.xtext);
  }

  private setPosition(x: number, y: number) {
    this.vline.set({
      x1: x,
      x2: x,
      y1: 0,
      y2: this.canvas.height,
    });

    this.hline.set({
      x1: 0,
      x2: this.canvas.width,
      y1: y,
      y2: y,
    });
  }

  attachEvents(target_canvas: fabric.Canvas) {
    if (this.attached) return;
    this.attached = true;

    target_canvas.on('mouse:move', (opt) => {
      const e = opt.e as MouseEvent;
      const scene = opt.scenePoint;

      this.setPosition(e.offsetX, e.offsetY);

      const { x, y } = canvas2globalXY(scene);

      this.xtext.set({
        text: `${roundTo(x, 2)}, ${roundTo(y, 2)}`,
        top: e.offsetY,
      });

      this.canvas.requestRenderAll();
    });
  }
}
