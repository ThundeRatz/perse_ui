#!/usr/bin/python3

from pathlib import Path
import rclpy
from rclpy.node import Node
from rclpy.parameter import (
    PARAMETER_SEPARATOR_STRING,
)  # For consistency if parameter names use it

from perse_msgs.srv import SaveVariant, InstallVariant, GetVariant, DeleteVariant
from perse_msgs.msg import NodeState, NodeStates

# Import message types used in the service
from rcl_interfaces.msg import ParameterType
from rcl_interfaces.msg import ParameterValue

import yaml
from typing import Any
import os
import shutil
from glob import glob
from itertools import groupby

SCRIPT_PATH = Path(os.path.dirname(os.path.realpath(__file__)))
STATE_PATH = SCRIPT_PATH.parent / 'state'

# Utility function to get Python value from ParameterValue, similar to ros2param.api.get_value
def get_value_from_parameter_value(parameter_value: ParameterValue):
    """Convert rcl_interfaces.msg.ParameterValue to a Python native value."""
    if parameter_value.type == ParameterType.PARAMETER_NOT_SET:
        return None
    elif parameter_value.type == ParameterType.PARAMETER_BOOL:
        return parameter_value.bool_value
    elif parameter_value.type == ParameterType.PARAMETER_INTEGER:
        return parameter_value.integer_value
    elif parameter_value.type == ParameterType.PARAMETER_DOUBLE:
        return parameter_value.double_value
    elif parameter_value.type == ParameterType.PARAMETER_STRING:
        return parameter_value.string_value
    elif parameter_value.type == ParameterType.PARAMETER_BYTE_ARRAY:
        return list(parameter_value.byte_array_value)  # Represent as list of bytes
    elif parameter_value.type == ParameterType.PARAMETER_BOOL_ARRAY:
        return list(parameter_value.bool_array_value)
    elif parameter_value.type == ParameterType.PARAMETER_INTEGER_ARRAY:
        return list(parameter_value.integer_array_value)
    elif parameter_value.type == ParameterType.PARAMETER_DOUBLE_ARRAY:
        return list(parameter_value.double_array_value)
    elif parameter_value.type == ParameterType.PARAMETER_STRING_ARRAY:
        return list(parameter_value.string_array_value)
    else:
        # This should not happen with a valid ParameterValue
        return None

def type_from_value(value: Any):
    if isinstance(value, bool):
        return 1
    elif isinstance(value, int):
        return 2
    elif isinstance(value, float):
        return 3
    elif isinstance(value, str):
        return 4
    elif isinstance(value, list):
        if len(value) == 0:
            return 8
        if isinstance(value[0], bool):
            return 6
        elif isinstance(value[0], int):
            return 7
        elif isinstance(value[0], float):
            return 8
        elif isinstance(value[0], str):
            return 9
        else:
            raise ValueError('Invalid parameter type')
    else:
        raise ValueError('Invalid parameter type')


def parameter_value_from_type(value: Any, type_int: int) -> ParameterValue:
    parameter_value = ParameterValue()
    parameter_value.type = type_int

    if type_int == 1:
        parameter_value.bool_value = bool(value)
    elif type_int == 2:
        parameter_value.integer_value = int(value)
    elif type_int == 3:
        parameter_value.double_value = float(value)
    elif type_int == 4:
        parameter_value.string_value = str(value)
    elif type_int == 5:
        parameter_value.byte_array_value = list(value)
    elif type_int == 6:
        parameter_value.bool_array_value = [bool(v) for v in value]
    elif type_int == 7:
        parameter_value.integer_array_value = [int(v) for v in value]
    elif type_int == 8:
        parameter_value.double_array_value = [float(v) for v in value]
    elif type_int == 9:
        parameter_value.string_array_value = [str(v) for v in value]
    else:
        raise ValueError('Invalid parameter type')

    return parameter_value


def flatten_dict(d: dict[str, Any], preffix='') -> list[tuple[Any, Any]]:
    flattened = []
    for key, value in d.items():
        new_key = f"{preffix}.{key}" if preffix else key
        if isinstance(value, dict):
            # Se o valor for um dicionário, chama a função recursivamente
            flattened.extend(flatten_dict(value, new_key))
        else:
            # Caso contrário, adiciona o par chave-valor à lista
            flattened.append((new_key, value))
    return flattened

class PerseUI(Node):

    def __init__(self):
        super().__init__("perse_ui")

        self.srv_save_variant = self.create_service(
            SaveVariant, "/perse_ui/save_variant", self.save_variant_callback
        )
        self.srv_install_variant = self.create_service(
            InstallVariant, "/perse_ui/install_variant", self.install_variant_callback
        )
        self.srv_delete_variant = self.create_service(
            DeleteVariant, "/perse_ui/delete_variant", self.delete_variant_callback
        )
        self.srv_get_variant = self.create_service(
            GetVariant, "/perse_ui/get_variant", self.get_variant_callback
        )
        self.node_states_pub = self.create_publisher(NodeStates, '/perse_ui/node_states', 10)
        self.node_states_timer = self.create_timer(1, self.publish_node_states)

        self.get_logger().info("Perse UI Started!")
        self.publish_node_states()

    def delete_variant_callback(self, request: DeleteVariant.Request, response: DeleteVariant.Response):
        self.get_logger().info(
            f"Received request to DELETE '{request.variant}' variant of {request.node}"
        )
        variants_path = STATE_PATH / 'variants'
        os.makedirs(variants_path, exist_ok=True)
        variant_path = variants_path / (request.node.replace('/', '%')+':'+request.variant+'.yaml')

        if not variant_path.is_file():
            response.result.reason = f'unknown variant "{request.variant}" for "{request.node}"'
            self.get_logger().error(response.result.reason)
            response.result.successful = False
            return response

        try:
            os.remove(variant_path)
        except Exception as e:
            response.result.reason = f'could not delete file: {e}'
            self.get_logger().error(response.result.reason)
            response.result.successful = False
            return response

        self.get_logger().info(f"Deleted {request.node}:{request.variant}")
        response.result.successful = True
        return response

    def install_variant_callback(self, request: InstallVariant.Request, response: InstallVariant.Response):
        self.get_logger().info(
            f"Received request to INSTALL '{request.variant}' variant of {request.node} in {request.path}"
        )

        variants_path = STATE_PATH / 'variants'
        os.makedirs(variants_path, exist_ok=True)
        variant_path = variants_path / (request.node.replace('/', '%')+':'+request.variant+'.yaml')
        if not variant_path.is_file():
            response.result.reason = f'unknown variant "{request.variant}" for "{request.node}"'
            self.get_logger().error(response.result.reason)
            response.result.successful = False
            return response

        try:
            shutil.copy2(variant_path, os.path.expanduser(request.path))
        except Exception as e:
            response.result.reason = f'could not copy file: {e}'
            self.get_logger().error(response.result.reason)
            response.result.successful = False
            return response

        with open(STATE_PATH / 'state.yaml') as f:
            state = yaml.safe_load(f)
        with open(STATE_PATH / 'state.yaml', 'w') as f:
            state[request.node] = {
                'save_path': request.path,
                'default_variant': request.variant
            }
            yaml.dump(state,f)

        self.get_logger().info(f"Installed {request.node}:{request.variant} to {request.path}")
        response.result.successful = True
        return response

    def get_variant_callback(self, request: GetVariant.Request, response: GetVariant.Response):
        self.get_logger().info(
            f"Received request GET '{request.variant}' variant of {request.node}"
        )

        variants_path = STATE_PATH / 'variants'
        os.makedirs(variants_path, exist_ok=True)
        variant_path = variants_path / (request.node.replace('/', '%')+':'+request.variant+'.yaml')
        if not variant_path.is_file():
            self.get_logger().error(f'{variants_path} is not a file')
            return response
        with open(variant_path) as f:
            variant_raw = yaml.safe_load(f)
            try:
                variant = variant_raw[request.node]['ros__parameters']
            except:
                self.get_logger().error(f'file missing {request.node}.ros__parameters')
                return response
        flatten_variant = flatten_dict(variant)
        names, values_raw = zip(*flatten_variant)
        response.names = names
        response.values = [parameter_value_from_type(v, type_from_value(v)) for v in values_raw]

        return response

    def save_variant_callback(
            self, request: SaveVariant.Request, response: SaveVariant.Response
        ):
            """
            Handles the service request to save parameters to a file.
            """
            self.get_logger().info(
                f"Received request to SAVE '{request.variant}' variant of {request.node} with {len(request.parameters)} parameters"
            )

            variants_path = STATE_PATH / 'variants'
            expanded_path = variants_path / (request.node.replace('/', '%') + ':' + request.variant + '.yaml')


            # The ros2 param dump format is:
            # node_name:
            #   ros__parameters:
            #     param1: value1
            #     group:
            #       param2: value2

            node_name_for_yaml = request.node

            try:
                with open(expanded_path, "r") as yaml_file:
                    yaml_output_structure = yaml.safe_load(yaml_file) or {}
            except (yaml.YAMLError, FileNotFoundError):
                yaml_output_structure = {}

            yaml_output_structure.setdefault(node_name_for_yaml, {})
            yaml_output_structure[node_name_for_yaml].setdefault("ros__parameters", {})

            yaml_output_structure[node_name_for_yaml][ "ros__parameters" ] = {}
            params_dict_to_fill = yaml_output_structure[node_name_for_yaml][
                "ros__parameters"
            ]

            for rcl_param in request.parameters:
                param_name = rcl_param.name
                try:
                    param_value = get_value_from_parameter_value(rcl_param.value)
                except Exception as e:
                    msg = f"Could not convert parameter '{param_name}': {str(e)}"
                    self.get_logger().error(msg)
                    response.result.successful = False
                    response.result.reason = msg
                    return response

                self.insert_dict(params_dict_to_fill, param_name, param_value)

            try:
                # Ensure directory exists
                output_dir = os.path.dirname(expanded_path)
                if output_dir and not os.path.exists(output_dir):
                    os.makedirs(output_dir, exist_ok=True)
                    self.get_logger().info(f"Created directory: {output_dir}")

                with open(expanded_path, "w") as yaml_file:
                    yaml.dump(
                        yaml_output_structure,
                        yaml_file,
                        default_flow_style=False,
                        sort_keys=False,
                    )

                msg = f"Successfully saved parameters to '{expanded_path}'"
                self.get_logger().info(msg)
                response.result.successful = True
                response.result.reason = msg
            except IOError as e:
                msg = f"IOError saving parameters to '{expanded_path}': {str(e)}"
                self.get_logger().error(msg)
                response.result.successful = False
                response.result.reason = msg
            except Exception as e:
                msg = f"Failed to save parameters to '{expanded_path}': {str(e)}"
                self.get_logger().error(msg)
                response.result.successful = False
                response.result.reason = msg

            return response
    def publish_node_states(self):
        variants_path = STATE_PATH / 'variants'
        os.makedirs(variants_path, exist_ok=True)
        files = glob(str(variants_path) + '/*.yaml')
        files = [os.path.basename(f).rsplit(':', 1) for f in files]
        files = [(f[0].replace('%', '/'), os.path.splitext(f[1])[0]) for f in files]

        state = {}
        if (STATE_PATH / 'state.yaml').is_file():
            with open(STATE_PATH / 'state.yaml') as f:
                state = yaml.safe_load(f)

        node_states = NodeStates()
        node_states.states = []

        for node_name, group in groupby(files, lambda x: x[0]):
            node_state = NodeState()
            node_state.variants = [g[1] for g in group]
            node_state.node = node_name
            if node_name in state:
                node_state.save_path = state[node_name].get('save_path', '')
                node_state.default_variant = state[node_name].get('default_variant', '')
            node_states.states.append(node_state)

        self.node_states_pub.publish(node_states)

    def insert_dict(self, dictionary: dict, key: str, value):
        """
        Insert a key-value pair into a dictionary, handling nested keys
        separated by PARAMETER_SEPARATOR_STRING (typically '.').
        """
        split = key.split(PARAMETER_SEPARATOR_STRING, 1)
        if len(split) > 1:
            # This is a nested parameter
            if split[0] not in dictionary:
                dictionary[split[0]] = {}
            elif not isinstance(dictionary[split[0]], dict):
                self.get_logger().warn(
                    f"Parameter '{split[0]}' conflicts with a nested parameter. Overwriting."
                )
                dictionary[split[0]] = {}

            self.insert_dict(dictionary[split[0]], split[1], value)
        else:
            # This is a direct parameter
            dictionary[key] = value


def main(args=None):
    rclpy.init(args=args)

    perse_ui = PerseUI()

    try:
        rclpy.spin(perse_ui)
    except KeyboardInterrupt:
        pass
    finally:
        perse_ui.destroy_node()


if __name__ == "__main__":
    main()
