import React, { useEffect } from 'react';

import '@/components/canvas.css';

import { Plus, Square, MousePointer2 } from 'lucide-react';
import * as fabric from 'fabric';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { waypointManager } from '@/fabric_components/Waypoint';
import { useSignal } from '@preact-signals/safe-react';
import { WaypointSchema } from '@/lib/schemas';
import { rosclient } from '@/lib/rosclient';
import { valueFromType } from '@/lib/ros_utils';

const SIZE_CLASS = 'h-10 w-10';
const ICON_CLASS = 'size-6';

type Tools = 'select' | 'waypoint' | 'obstacle';
function Toolbar({
  className,
  onValueChange,
  canvas,
}: Omit<React.ComponentProps<typeof ToggleGroup>, 'type' | 'onValueChange'> & {
  onValueChange?: (value: Tools) => void;
  canvas: fabric.Canvas | null;
}) {
  const selected = useSignal<Tools>('select');

  useEffect(() => {
    if (!canvas) return;
    canvas.on('mouse:down', (opt) => {
      if (opt.target || selected.value != 'waypoint') return;

      const newWaypoint = waypointManager.push(opt.scenePoint.x, opt.scenePoint.y);

      newWaypoint.data = Object.fromEntries(
        WaypointSchema.map(({ name, type, value }) => [
          name,
          rosclient.createReactiveDescription(name, type, valueFromType(type, value), true),
        ]),
      );
      canvas.setActiveObject(newWaypoint.group);
    });
  }, [canvas]);

  return (
    <ToggleGroup
      type="single"
      value={selected.value}
      onValueChange={(value) => {
        if (!value) return;
        selected.value = value as Tools;
        if (onValueChange) onValueChange(value as Tools);
      }}
      className={cn('bg-sidebar p-1.5 inset-shadow-sm inset-shadow-slate-500/10 shadow-lg shadow-slate-950', className)}
    >
      <ToggleGroupItem value="select" className={cn('mr-1 rounded-sm', SIZE_CLASS)}>
        <MousePointer2 className={ICON_CLASS} />
      </ToggleGroupItem>
      <Separator orientation="vertical" className="h-10! mx-1 bg-foreground/10 w-[0.5px]!" />
      <ToggleGroupItem value="waypoint" className={cn('mx-1 rounded-sm', SIZE_CLASS)}>
        <Plus className={ICON_CLASS} />
      </ToggleGroupItem>
      <ToggleGroupItem value="obstacle" className={cn('ml-1 rounded-sm', SIZE_CLASS)}>
        <Square className={ICON_CLASS} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export default Toolbar;
export type { Tools };
