import * as fabric from 'fabric';

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

interface InfiniteGridOpts {
  defaultZoom?: number;
  offsetX?: number;
  offsetY?: number;
  cellSize: number;
}
export default class InfiniteGrid extends fabric.FabricObject {
  selectable = false;
  isDragging = false;
  lastPos = { x: 0, y: 0 };
  canvas: fabric.Canvas;
  defaultZoom: number;
  cellSize: number;
  selectedObject: fabric.FabricObject | undefined = undefined;

  constructor(canvas: fabric.Canvas, opts: InfiniteGridOpts) {
    const { defaultZoom = 1, offsetX = 0, offsetY = 0, cellSize } = opts;
    super();

    this.canvas = canvas;
    this.defaultZoom = defaultZoom;
    this.cellSize = cellSize;

    canvas.setZoom(defaultZoom);
    const vpt = canvas.viewportTransform;
    vpt[4] = offsetX;
    vpt[5] = offsetY;
    canvas.setViewportTransform(vpt);

    canvas.on('mouse:wheel', function (opt) {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = clamp(zoom, defaultZoom / 3, defaultZoom * 2);
      canvas.zoomToPoint(opt.viewportPoint, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on('mouse:down:before', (opt) => {
      const e = opt.e as MouseEvent;
      if (e.buttons === 4) {
        this.isDragging = true;
        canvas.selection = false;

        this.selectedObject = canvas.getActiveObject();

        this.lastPos = { x: e.clientX, y: e.clientY };
      }
    });
    canvas.on('mouse:move', (opt) => {
      const e = opt.e as MouseEvent;

      if (this.isDragging) {
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - this.lastPos.x;
        vpt[5] += e.clientY - this.lastPos.y;
        this.lastPos = { x: e.clientX, y: e.clientY };

        this.selectedObject?.setCoords();
        canvas.requestRenderAll();
      }
    });
    canvas.on('mouse:up:before', () => {
      // on mouse up we want to recalculate new interaction
      // for all objects, so we call setViewportTransform
      canvas.setViewportTransform(canvas.viewportTransform);
      this.isDragging = false;
      canvas.selection = true;

      this.selectedObject = undefined;
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const zoom = canvas.getZoom();
    const norm_zoom = zoom / this.defaultZoom;

    const CELL_SIZE = this.cellSize;
    const ARROW_SIZE = 20 / norm_zoom;
    const LINE_WIDTH = 3;

    const offX = canvas.viewportTransform[4];
    const offY = canvas.viewportTransform[5];

    ctx.save();
    ctx.lineWidth = LINE_WIDTH;

    const getLineWidth = (x: number) => (x % 2 == 0 ? LINE_WIDTH * 1.4 : LINE_WIDTH);
    const getStrokeStyle = (x: number) => (x % 2 == 0 ? 'oklch(20.8% 0.042 265.8)' : 'oklch(20.8% 0.042 265.8 / 64.2%)');

    const gridSize = CELL_SIZE * zoom;

    const numCellsX = Math.ceil(canvas.width / gridSize);
    const numCellsY = Math.ceil(canvas.height / gridSize);

    const gridOffsetX = offX % gridSize;
    const gridOffsetY = offY % gridSize;
    // draw vectical lines
    for (let i = 0; i <= numCellsX; i++) {
      const x = gridOffsetX + i * gridSize;
      ctx.lineWidth = getLineWidth(i - Math.floor(offX / gridSize));
      ctx.strokeStyle = getStrokeStyle(i - Math.floor(offX / gridSize));

      ctx.beginPath();
      ctx.moveTo((x - offX) / zoom, (0 - offY) / zoom);
      ctx.lineTo((x - offX) / zoom, (canvas.height - offY) / zoom);
      ctx.closePath();
      ctx.stroke();
    }

    // draw horizontal lines
    for (let i = 0; i <= numCellsY; i++) {
      const y = gridOffsetY + i * gridSize;
      ctx.lineWidth = getLineWidth(i - Math.floor(offY / gridSize));
      ctx.strokeStyle = getStrokeStyle(i - Math.floor(offY / gridSize));

      ctx.beginPath();
      ctx.moveTo((0 - offX) / zoom, (y - offY) / zoom);
      ctx.lineTo((canvas.width - offX) / zoom, (y - offY) / zoom);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = 'oklch(55.4% 0.046 257.417)';
    ctx.lineWidth = LINE_WIDTH / norm_zoom;

    ctx.moveTo(0, 0);
    ctx.lineTo((canvas.width - offX) / zoom - ARROW_SIZE, 0);

    ctx.moveTo(0, 0);
    ctx.lineTo(0, -offY / zoom + ARROW_SIZE);

    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = `${ARROW_SIZE}px Arial`;

    const arrow_y = Math.min(-offY / zoom + ARROW_SIZE, 0);
    ctx.fillText('y', ARROW_SIZE * 0.6, arrow_y);

    ctx.beginPath(); // Inicia um novo caminho
    ctx.moveTo(ARROW_SIZE / 4, arrow_y + 0); // Primeiro vértice (x1, y1)
    ctx.lineTo(0, arrow_y - ARROW_SIZE); // Segundo vértice (x2, y2)
    ctx.lineTo(-ARROW_SIZE / 4, arrow_y + 0); // Terceiro vértice (x3, y3)
    ctx.closePath(); // Fecha o caminho (volta ao ponto inicial)
    ctx.fill();

    const arrow_x = Math.max((-offX + canvas.width) / zoom - ARROW_SIZE, 0);

    ctx.fillText('x', Math.max(arrow_x - ARROW_SIZE * 0.2, 0), -ARROW_SIZE * 0.6);

    ctx.beginPath(); // Inicia um novo caminho
    ctx.moveTo(arrow_x + 0, ARROW_SIZE / 4); // Primeiro vértice (x1, y1)
    ctx.lineTo(arrow_x + ARROW_SIZE, 0); // Segundo vértice (x2, y2)
    ctx.lineTo(arrow_x + 0, -ARROW_SIZE / 4); // Terceiro vértice (x3, y3)
    ctx.closePath(); // Fecha o caminho (volta ao ponto inicial)
    ctx.fill();

    ctx.restore();
  }
}
