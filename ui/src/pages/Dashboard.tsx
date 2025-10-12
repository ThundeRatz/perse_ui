import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import Canvas from '@/components/Canvas';
import { useSignal } from '@preact-signals/safe-react';
import { Sidebar } from '@/components/sidebar';
import { useWindowSize } from '@/lib/utils';
import { useEffect, useState } from 'react';

function Dashboard() {
  const [width, height] = useWindowSize();
  const [size, setSize] = useState(1 - 300 / window.innerWidth);

  const canvasSize = useSignal(size * window.innerWidth);

  useEffect(() => {
    canvasSize.value = size * window.innerWidth;
  }, [width, height]);

  return (
    <div style={{ width: '100vw', height: '100vh' }} className="bg-slate-950">
      <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-sidebar">
        <ResizablePanel className="flex flex-col">
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          defaultSize={size * 100}
          onResize={(newSize) => {
            setSize(newSize / 100);
            canvasSize.value = (newSize / 100) * window.innerWidth;
          }}
        >
          <Canvas size={canvasSize} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default Dashboard;
