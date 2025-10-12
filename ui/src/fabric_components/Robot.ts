import * as fabric from 'fabric';

const SIZE = 40;

export default class Robot {
  objects: fabric.FabricObject[];
  group: fabric.Group;

  constructor(x: number, y: number, angle = 0) {
    this.objects = [
      new fabric.Triangle({
        width: SIZE * 0.8,
        height: SIZE,
        angle: 90,
        fill: 'red',
      }),
    ];

    this.group = new fabric.Group(this.objects, {
      left: x,
      top: y,
      originX: 'center',
      originY: 'center',
      hasControls: false,
      selectable: false,
    });

    this.setPos(x, y);
    this.setAngle(angle);
  }

  setPos(x: number, y: number) {
    this.group.set({
      top: y,
      left: x,
    });
  }

  setAngle(angle: number) {
    this.group.set({ angle: -angle });
  }

  addTo(canvas: fabric.Canvas) {
    canvas.add(this.group);
  }
}
