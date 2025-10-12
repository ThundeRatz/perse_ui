import type { ParameterValue } from './ros_utils';
import { deepFreeze } from './utils';

type ParameterSchema = readonly { name: string; type: number; value?: ParameterValue }[];

export const WaypointSchema: ParameterSchema = deepFreeze([
  {
    name: 'dodge',
    type: 1,
  },
  {
    name: 'has_cone',
    type: 1,
  },
  {
    name: 'margin',
    type: 3,
    value: 0.5,
  },
  {
    name: 'near_cone_area_percentage',
    type: 3,
  },
  {
    name: 'odom_speed',
    type: 3,
    value: 0.2,
  },
  {
    name: 'vision_speed',
    type: 3,
    value: 0.2,
  },
  {
    name: 'x',
    type: 3,
  },
  {
    name: 'y',
    type: 3,
  },
]);

export const DecisionNodeSchema: ParameterSchema = deepFreeze([
  {
    name: 'detection_x_offset',
    type: 3,
  },
  {
    name: 'dodge_speed',
    type: 3,
  },
  {
    name: 'kp',
    type: 3,
  },
  {
    name: 'max_angular_velocity',
    type: 3,
  },
  {
    name: 'minimum_vision_speed',
    type: 3,
  },
  {
    name: 'number_of_points',
    type: 2,
  },
  {
    name: 'reverse_speed',
    type: 3,
  },
  {
    name: 'robot_length',
    type: 3,
  },
  {
    name: 'use_sim_time',
    type: 1,
  },
  {
    name: 'vision_kp',
    type: 3,
  },
]);
