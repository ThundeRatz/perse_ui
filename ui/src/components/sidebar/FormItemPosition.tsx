import { Signal } from '@preact-signals/safe-react';
import FormItemNumber from './FormItemNumber';
import type Waypoint from '@/fabric_components/Waypoint';

export default function FormItemPosition({ waypoint, x, y }: { waypoint: Waypoint; x?: Signal<number>; y?: Signal<number> }) {
  return (
    <div className="flex flex-row w-full justify-around">
      <FormItemNumber
        id="x"
        valueSignal={waypoint._x}
        onKeyDown={(value) => {
          waypoint.x = value;
        }}
        onChange={(v) => {
          if (!x) return;
          x.value = v;
        }}
      />
      <FormItemNumber
        id="y"
        valueSignal={waypoint._y}
        onKeyDown={(value) => (waypoint.y = value)}
        onChange={(v) => {
          if (!y) return;
          y.value = v;
        }}
      />
    </div>
  );
}
