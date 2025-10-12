import * as fabric from 'fabric';
import React, { useEffect, useRef } from 'react';
import '@/components/fabric_canvas.css';

export const FabricCanvas = React.forwardRef<fabric.Canvas, { onLoad?(canvas: fabric.Canvas): void }>(({ onLoad }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = new fabric.Canvas(canvasRef.current);

    if (typeof ref === 'function') {
      ref(canvas);
    } else if (typeof ref === 'object' && ref) {
      ref.current = canvas;
    }

    // it is crucial `onLoad` is a dependency of this effect
    // to ensure the canvas is disposed and re-created if it changes
    onLoad?.(canvas);

    return () => {
      if (typeof ref === 'function') {
        ref(null);
      } else if (typeof ref === 'object' && ref) {
        ref.current = null;
      }

      // `dispose` is async
      // however it runs a sync DOM cleanup
      // its async part ensures rendering has completed
      // and should not affect react
      canvas.dispose();
    };
  }, [canvasRef, onLoad]);

  return <canvas ref={canvasRef} />;
});
