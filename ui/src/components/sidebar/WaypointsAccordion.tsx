import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Signal, type ReadonlySignal } from '@preact-signals/safe-react';
import FormItemNumber from './FormItemNumber';
import type Waypoint from '@/fabric_components/Waypoint';
import FormItemBoolean from './FormItemBoolean.tsx';
import FormItemString from './FormItemString.tsx';
import FormItemPosition from './FormItemPosition.tsx';

export default function WaypointsAccordion({
  selectedWaypoints,
  value,
}: {
  selectedWaypoints: ReadonlySignal<Waypoint[]>;
  value: string;
}) {
  return selectedWaypoints.value.map((selectedWaypoint) => (
    <AccordionItem value={value + selectedWaypoint.n} key={selectedWaypoint.key}>
      <AccordionTrigger>Marco {selectedWaypoint.n}</AccordionTrigger>
      <AccordionContent className="p-5 w-full flex gap-5 flex-col">
        <FormItemPosition
          waypoint={selectedWaypoint}
          x={selectedWaypoint.data?.['x']?.signal as Signal<number> | undefined}
          y={selectedWaypoint.data?.['y']?.signal as Signal<number> | undefined}
        />

        {Object.entries(selectedWaypoint.data)
          .filter((d) => !['x', 'y'].includes(d[0]))
          .map(([_key, value]) => {
            const { name, type, signal, modified } = value;
            const field_name = name.replace(/^p[0-9]+\./, '');

            return type == 3 ? (
              <FormItemNumber
                step={0.01}
                id={field_name}
                valueSignal={signal as Signal<number>}
                modified={modified}
                key={name}
                className="mt-5"
              />
            ) : type == 2 ? (
              <FormItemNumber
                step={1}
                id={field_name}
                valueSignal={signal as Signal<number>}
                modified={modified}
                key={name}
                className="mt-5"
              />
            ) : type == 1 ? (
              <FormItemBoolean
                id={field_name}
                valueSignal={signal as Signal<boolean>}
                key={name}
                className="mt-5" //.
              />
            ) : type == 4 ? (
              <FormItemString
                id={field_name}
                valueSignal={signal as Signal<string>}
                key={name}
                className="mt-5" //.
              />
            ) : (
              <span key={name} className="text-red-500">
                {name} Tipo '{type}' desconhecido
              </span>
            );
          })}
      </AccordionContent>
    </AccordionItem>
  ));
}
