import * as ROSLIB from 'roslib';
import { Signal } from '@preact-signals/safe-react';

export type NodeStateMsg = {
  default_variant: string;
  node: string;
  save_path: string;
  variants: string[];
};

type Vector3Msg = {
  x: number;
  y: number;
  z: number;
};

type TwistMsg = {
  linear: Vector3Msg;
  angular: Vector3Msg;
};

type TwistWithCovarianceMsg = {
  twist: TwistMsg;
  covariance: number[];
};

type QuaternionMsg = {
  x: number;
  y: number;
  z: number;
  w: number;
};

type PoseMsg = {
  position: Vector3Msg;
  orientation: QuaternionMsg;
};

type PoseWithCovarianceMsg = {
  pose: PoseMsg;
  covariance: number[];
};

export type OdometryMsg = {
  child_frame_id: string;
  header: {
    stamp: {
      sec: number;
      nanosec: number;
    };
  };
  pose: PoseWithCovarianceMsg;
  twist: TwistWithCovarianceMsg;
};

export type ReactiveDescription<T extends ParameterValue = ParameterValue> = {
  dispose?: () => void;
  subscribe: (callback: (value: T) => void) => void;
  modified: Signal<boolean>;
  name: string;
  type: number;
  original: Signal<T>;
  signal: Signal<T>;
};

export type ROSTopic = { topic: string; type: string };
export type SubscribedParameter = {
  nodeName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback?: (response: Record<string, any>) => void;
  parameters: Signal<Parameter[]>;
  listService: ROSLIB.Service;
  valueService: ROSLIB.Service;
  error: boolean;
  modified: Signal<boolean>;
  dispose?: () => void;
  asReactive: (pattern?: RegExp, inverse?: boolean) => ReactiveDescription[];
};

export type ParameterValue = ParameterMsg['value'][keyof ParameterMsg['value']];

export type GetVariantMsg = {
  names: string[];
  values: ParameterMsg['value'][];
};

export type ListParametersResultMsg = {
  result: {
    names: string[];
    prefixes: string[];
  };
};

export type ResultMsg = {
  result: {
    successful: boolean;
    reason: string;
  };
};

export type ParameterMsg = {
  name: string;
  value: {
    type: number;
    bool_value: boolean;
    integer_value: number;
    double_value: number;
    string_value: string;
    byte_array_value: number[];
    bool_array_value: boolean[];
    integer_array_value: number[];
    double_array_value: number[];
    string_array_value: string[];
  };
};

export type Parameter = {
  name: string;
  type: number;
  value: ParameterValue;
};

export function valueFromParameterValue(parameter_value: ParameterMsg['value']) {
  switch (parameter_value.type) {
    case 1:
      return parameter_value.bool_value;
    case 2:
      return parameter_value.integer_value;
    case 3:
      return parameter_value.double_value;
    case 4:
      return parameter_value.string_value;
    case 5:
      return parameter_value.byte_array_value;
    case 6:
      return parameter_value.bool_array_value;
    case 7:
      return parameter_value.integer_array_value;
    case 8:
      return parameter_value.double_array_value;
    case 9:
      return parameter_value.string_array_value;
    default:
      throw Error('Invalid parameter type');
  }
}

export function parameterValueFromType(value: ParameterValue, type: number): ParameterMsg['value'] {
  const default_value: ParameterMsg['value'] = {
    type,
    bool_value: false,
    integer_value: 0,
    double_value: 0,
    string_value: '',
    byte_array_value: [],
    bool_array_value: [],
    integer_array_value: [],
    double_array_value: [],
    string_array_value: [],
  };

  switch (default_value.type) {
    case 1:
      return { ...default_value, bool_value: value as boolean };
    case 2:
      return { ...default_value, integer_value: value as number };
    case 3:
      return { ...default_value, double_value: value as number };
    case 4:
      return { ...default_value, string_value: value as string };
    case 5:
      return { ...default_value, byte_array_value: value as number[] };
    case 6:
      return { ...default_value, bool_array_value: value as boolean[] };
    case 7:
      return { ...default_value, integer_array_value: value as number[] };
    case 8:
      return { ...default_value, double_array_value: value as number[] };
    case 9:
      return { ...default_value, string_array_value: value as string[] };
    default:
      throw Error('Invalid parameter type');
  }
}

export function valueFromType(type: number, value?: ParameterValue) {
  switch (type) {
    case 1:
      return value ?? false;
    case 2:
    case 3:
      return value ?? 0;
    case 4:
      return value ?? '';
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
      return value ?? [];
    default:
      throw Error('Invalid parameter type');
  }
}
