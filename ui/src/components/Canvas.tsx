/* eslint-disable react-refresh/only-export-components */
import * as fabric from 'fabric';
import { useRef, useCallback, useReducer } from 'react';
import { FabricCanvas } from '@/components/FabricCanvas';
import {
  signal,
  Signal,
  useSignal,
  useComputed,
  computed,
  type ReadonlySignal,
  useSignalEffect,
} from '@preact-signals/safe-react';
import InfiniteGrid from '@/fabric_components/InfiniteGrid';
import Waypoint, { waypointManager } from '@/fabric_components/Waypoint';
import Guides from '@/fabric_components/Guides';
import Robot from '@/fabric_components/Robot';

import '@/components/canvas.css';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import Toolbar, { type Tools } from './Toolbar';
import { CELL_SIZE } from '@/lib/canvas_coordinates';
import { valueFromType, type OdometryMsg } from '@/lib/ros_utils';
import { WaypointSchema } from '@/lib/schemas';
import { rosclient } from '@/lib/rosclient';
import { useSignalEffectOnce } from '@preact-signals/utils/hooks';
import { quaternion2euler } from '@/lib/utils';

export const selectedWaypoints: ReadonlySignal<Waypoint[]> = computed(
  () => selecting.value.map((obj) => obj?.__instance).filter(Boolean) as Waypoint[],
);

const selecting: Signal<fabric.FabricObject[]> = signal([]);

type ContextTypeState =
  | {
      type: 'waypoint';
      selected: fabric.FabricObject;
      position: undefined;
    }
  | {
      type: 'none';
      selected: undefined;
      position: fabric.XY;
    };
type ContextType = ContextTypeState['type'] | { type: ContextTypeState['type']; position?: fabric.XY };
function contextTypeReducer(_state: ContextTypeState, action: ContextType) {
  const actionObject: Partial<ContextType> = typeof action == 'object' ? action : {};
  const actionType = typeof action == 'object' ? action.type : action;
  let newState: ContextTypeState = {
    type: 'none',
    selected: undefined,
    position: (actionObject?.position ?? _state.position) || { x: 0, y: 0 },
  };

  switch (actionType) {
    case 'waypoint':
      if (!selecting.value?.[0]) break;

      newState = {
        type: actionType,
        selected: selecting.value?.[0],
        position: undefined,
      };
  }
  return newState;
}

const Canvas = ({ size }: { size: ReadonlySignal<number> }) => {
  const refMainLayer = useRef<fabric.Canvas>(null);
  const refTopLayer = useRef<fabric.Canvas>(null);

  const dimensions = useComputed(() => ({ width: size.value, height: window.innerHeight }));
  const ready = useSignal(0);
  let guides: Guides;

  const tool = useSignal<Tools>('select');

  const [contextType, dispatchContextType] = useReducer(contextTypeReducer, {
    type: 'none',
    selected: undefined,
    position: { x: 0, y: 0 },
  });

  useSignalEffect(() => {
    const canvas = refMainLayer.current;
    const canvasTopLayer = refTopLayer.current;

    canvas?.setDimensions(dimensions.value);
    canvasTopLayer?.setDimensions(dimensions.value);
  });

  const onLoadTopLayer = useCallback(
    (canvas: fabric.Canvas) => {
      canvas.setDimensions(dimensions.value);

      const parent = canvas.getElement().parentElement;
      if (parent) {
        parent.style.pointerEvents = 'none';
      }

      guides = new Guides(canvas);
      ready.value = ready.peek() + 1;
    },
    [refTopLayer],
  );

  const onLoadMainLayer = useCallback(
    (canvas: fabric.Canvas) => {
      waypointManager.setCanvas(canvas);

      canvas.backgroundColor = 'oklch(12.9% 0.042 264.695)';
      canvas.setDimensions(dimensions.value);

      canvas.add(
        new InfiniteGrid(canvas, {
          offsetX: 150,
          offsetY: dimensions.value.height - 150,
          cellSize: CELL_SIZE,
        }),
      );

      canvas.on('contextmenu', (opt) => {
        if (!opt.target) {
          const { x, y } = canvas.getScenePoint(opt.e as PointerEvent);

          dispatchContextType({ type: 'none', position: { x, y } });
          return;
        }
        if (opt.target?.selectable == false) {
          opt.e.stopPropagation();
          opt.e.preventDefault();
          return;
        }

        switch (opt.target?.__name) {
          case 'waypoint':
            canvas.setActiveObject(opt.target);
            dispatchContextType('waypoint');
            break;
          default:
            opt.e.stopPropagation();
            opt.e.preventDefault();
            return;
        }
      });

      canvas.on('selection:created', (opt) => {
        selecting.value = opt.selected;
        const selection = canvas.getActiveObject();

        if (!selection || opt.selected.length < 2 || opt.selected.some((s) => s?.__name != 'waypoint')) return;

        selection.on('mousemove', () => {
          for (const group of opt.selected) {
            (group.__instance as Waypoint).handleMove();
          }
        });
      });
      canvas.on('selection:updated', (opt) => {
        selecting.value = opt.selected;
      });
      canvas.on('selection:cleared', () => {
        selecting.value = [];
      });

      const waypoint = new Waypoint(0, 0, 0);
      waypoint.group.selectable = false;
      waypoint.addTo(canvas);

      const robot = new Robot(0, 0, 0);
      robot.addTo(canvas);

      rosclient.subscribeTopic<OdometryMsg>(
        '/perse/localization/wheel_odom',
        'nav_msgs/msg/Odometry',
        (msg) => {
          robot.setPos(msg.pose.pose.position.x, msg.pose.pose.position.y);
          const { x, y, z, w } = msg.pose.pose.orientation;
          const { Rz } = quaternion2euler(x, y, z, w);
          robot.setAngle(Rz);
        },
        true,
      );

      ready.value = ready.peek() + 1;
    },
    [refMainLayer],
  );

  useSignalEffectOnce(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    ready.value;
    const canvas = refMainLayer.current;
    const canvasTopLayer = refTopLayer.current;

    if (!guides || !canvas || !canvasTopLayer) return;

    guides.attachEvents(canvas);
  });

  return (
    <>
      <ContextMenu modal={false}>
        <ContextMenuTrigger className="absolute w-full h-full">
          <FabricCanvas ref={refMainLayer} onLoad={onLoadMainLayer} />
          <FabricCanvas ref={refTopLayer} onLoad={onLoadTopLayer} />
        </ContextMenuTrigger>

        <ContextMenuContent className="w-64">
          {contextType.type == 'waypoint' ? (
            <>
              <ContextMenuLabel inset className="font-bold">
                Marco {(contextType.selected?.__instance as Waypoint).n}
              </ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem
                inset
                onClick={() => {
                  const selected = contextType.selected as fabric.Group;
                  const selectedWaypoint = selected.__instance as Waypoint;
                  const canvas = refMainLayer.current!;

                  const selectedN = selectedWaypoint.n;
                  const newWaypoint = waypointManager.insert(selected.left - 50, selected.top + 50, selectedN);

                  newWaypoint.data = Object.fromEntries(
                    WaypointSchema.map(({ name, type, value }) => [
                      name,
                      rosclient.createReactiveDescription(name, type, valueFromType(type, value), true),
                    ]),
                  );

                  canvas.setActiveObject(newWaypoint.group);
                }}
              >
                Adicionar marco antes
              </ContextMenuItem>
              <ContextMenuItem
                inset
                variant="destructive"
                onClick={() => {
                  const selected = contextType.selected as fabric.Group;
                  const selectedWaypoint = selected.__instance as Waypoint;

                  waypointManager.remove(selectedWaypoint.n);
                }}
              >
                Deletar
              </ContextMenuItem>
            </>
          ) : contextType.type == 'none' ? (
            <ContextMenuItem
              inset
              onClick={() => {
                const canvas = refMainLayer.current!;
                const newWaypoint = waypointManager.push(contextType.position.x, contextType.position.y);

                newWaypoint.data = Object.fromEntries(
                  WaypointSchema.map(({ name, type, value }) => [
                    name,
                    rosclient.createReactiveDescription(name, type, valueFromType(type, value), true),
                  ]),
                );

                canvas.setActiveObject(newWaypoint.group);
              }}
            >
              Novo Marco
            </ContextMenuItem>
          ) : (
            <></>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <div className="absolute w-full h-full pointer-events-none">
        {
          <Toolbar
            className="absolute bottom-[0px] left-[50%] translate-[-50%] pointer-events-auto"
            onValueChange={(value) => (tool.value = value)}
            canvas={refMainLayer.current}
          />
        }
      </div>
    </>
  );
};

export default Canvas;
