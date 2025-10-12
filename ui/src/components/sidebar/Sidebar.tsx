import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { selectedWaypoints } from '../Canvas';
import { Button } from '../ui/button';
import { useSignal, untracked, useSignalEffect, signal } from '@preact-signals/safe-react';
import ParametersAccordion from './ParametersAccordion';
import {
  parameterValueFromType,
  valueFromParameterValue,
  type ParameterMsg,
  type ReactiveDescription,
  type SubscribedParameter,
} from '@/lib/ros_utils';
import './sidebar.css';
import WaypointsAccordion from './WaypointsAccordion.tsx';
import { Separator } from '../ui/separator.tsx';
import { subscribeCallback } from './save_observer.ts';
import { shallowParameters2nestedParameters, zip } from '@/lib/utils.ts';
import { useSignalRef } from '@preact/signals-react/utils';
import { waypointManager } from '@/fabric_components/Waypoint.ts';
import { config } from '@/lib/config.ts';
import { global2canvasXY } from '@/lib/canvas_coordinates.ts';
import { rosclient } from '@/lib/rosclient.ts';
import { selected } from './NodeSelect.tsx';
import Header from './Header.tsx';

const descriptions = signal<ReactiveDescription[]>([]);
const waypoint_descriptions = signal<ReactiveDescription[]>([]);

export default function Sidebar() {
  const accordionValue = useSignal<string[]>(['item-4']);
  const variantValue = useSignal<string>('');
  const savePath = useSignal<string>('');
  const sub = useSignalRef<SubscribedParameter | null>(null);

  useSignalEffect(() => {
    const value_set = new Set([...accordionValue.peek(), ...selectedWaypoints.value.map(({ n }) => 'item-1' + n)]);
    untracked(() => {
      accordionValue.value = Array.from(value_set);
    });
  });

  function getParametersFromState() {
    const parameters: ParameterMsg[] = [
      ...descriptions.value.map((desc) => ({
        name: desc.name,
        value: parameterValueFromType(desc.signal.value, desc.type),
      })),
      {
        name: 'number_of_points',
        value: parameterValueFromType(waypointManager.waypoints.value.length, 2),
      },
    ];
    waypointManager.waypoints.value.forEach((waypoint) => {
      Object.entries(waypoint.data).forEach(([name, desc]) => {
        parameters.push({
          name: `p${waypoint.n}.${name}`,
          value: parameterValueFromType(desc.signal.value, desc.type),
        });
      });
    });
    return parameters;
  }

  function updateWaypoints(reactive: ReactiveDescription[]) {
    descriptions.value = reactive.filter((v) => !/^p[0-9]+\./.test(v.name));
    waypoint_descriptions.value = reactive.filter((v) => /^p[0-9]+\./.test(v.name));

    waypointManager.wipe();
    const waypointDict = shallowParameters2nestedParameters(waypoint_descriptions.value);

    for (const [n_key, data] of Object.entries(waypointDict)) {
      const n = +(n_key.slice(1) || NaN);
      const x = +(data?.['x'].signal.value ?? NaN);
      const y = +(data?.['y'].signal.value ?? NaN);
      if ([n, x, y].some(isNaN)) {
        console.warn('Invalid waypoint data', n, data);
        continue;
      }
      const point = global2canvasXY({ x, y });
      const waypoint = waypointManager.insert(point.x, point.y, n);
      waypoint.data = data;
    }

    subscribeCallback('waypoints_accordion', () => {
      waypointManager.waypoints.value.forEach((waypoint) => {
        for (const desc of Object.values(waypoint.data)) {
          desc.original.value = desc.signal.value;
        }
      });
      descriptions.value.forEach((desc) => {
        desc.original.value = desc.signal.value;
      });
      const parameters: ParameterMsg[] = getParametersFromState();
      const defaultPath = config.value.savePaths.find(({ node }) => node == selected.value)?.path ?? '~/test.yaml';

      return {
        path: savePath.value || defaultPath,
        variant: variantValue.value,
        node: selected.value,
        parameters,
      };
    });
  }

  async function loadVariant(node: string, variant: string) {
    const result = await rosclient.getVariant(node, variant);
    console.log('loading from variant');
    const reactive = Array.from(zip(result.names, result.values)).map(([name, parameterValue]) =>
      rosclient.createReactiveDescription(name, parameterValue.type, valueFromParameterValue(parameterValue), true),
    );
    updateWaypoints(reactive);
  }

  useSignalEffect(() => {
    if (!rosclient.isConnected.value) {
      sub.current = null;
      descriptions.value = [];
      waypoint_descriptions.value = [];
      variantValue.value = '';
      waypointManager.wipe();
    }
  });

  useSignalEffect(() => {
    if (!selected.value) return;

    sub.current = rosclient.subscribeParameterService(selected.value);

    if (sub.current?.parameters?.value != undefined) {
      const reactive = sub.current.asReactive();

      updateWaypoints(reactive);
    }

    if (sub.peek() || !variantValue.value) return;
    loadVariant(selected.value, variantValue.value);
  });

  return (
    <>
      <ScrollArea className="w-full flex-1 min-h-0">
        <Accordion
          type="multiple"
          className="w-full"
          onValueChange={(value) => (accordionValue.value = value)}
          value={accordionValue.value}
        >
          <Header
            variantSignal={variantValue}
            savePathSignal={savePath}
            onEmptySubmit={(newVariant) => {
              if (!selected.value || !newVariant) return;
              const parameters = getParametersFromState();
              rosclient.saveVariant(selected.value, newVariant, parameters);
            }}
            onTrashSubmit={(variant) => {
              if (!selected.value || !variant) return;
              rosclient.deleteVariant(selected.value, variant);
            }}
          />
          <Separator orientation="horizontal" className="mt-5" />
          <WaypointsAccordion value="item-1" selectedWaypoints={selectedWaypoints} />

          <AccordionItem value="item-2">
            <AccordionTrigger>Nodes</AccordionTrigger>
            <AccordionContent className="flex flex-col p-5">
              {rosclient.nodes.value.map((node, i) => (
                <span key={i}>{node}</span>
              ))}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>Tópicos</AccordionTrigger>
            <AccordionContent className="flex flex-col p-5">
              {rosclient.topics.value.map(({ topic }, i) => (
                <span key={i}>{topic}</span>
              ))}
            </AccordionContent>
          </AccordionItem>

          <ParametersAccordion value="item-4" descriptions={descriptions} />
        </Accordion>
      </ScrollArea>

      <div className="w-full h-10 bg-popover p-2 flex flex-row items-center flex-0">
        {rosclient.isConnected.value ? (
          <Button variant="ghost" className="text-green-800 cursor-pointer" onClick={() => rosclient.close()}>
            Conectado
          </Button>
        ) : (
          <Button variant="ghost" className="text-destructive cursor-pointer" onClick={() => rosclient.connect()}>
            Desconectado
          </Button>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (selectedWaypoints.value.length == 1) {
              accordionValue.value = accordionValue.value.length > 1 ? [] : Array.from({ length: 5 }, (_, i) => `item-${i + 1}`);
            } else {
              accordionValue.value = accordionValue.value.length ? [] : Array.from({ length: 5 }, (_, i) => `item-${i + 1}`);
            }
          }}
        >
          {accordionValue.value.length ? (
            <ChevronsDownUp className="text-sidebar-foreground size-5" />
          ) : (
            <ChevronsUpDown className="text-sidebar-foreground size-5" />
          )}
        </Button>
      </div>
    </>
  );
}
