import os
import subprocess
import socket
import json

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.events import Shutdown
from launch.actions import (
    DeclareLaunchArgument,
    IncludeLaunchDescription,
    OpaqueFunction,
    ExecuteProcess,
    GroupAction,
    RegisterEventHandler,
    EmitEvent,
)
from launch.launch_description_sources import (
    PythonLaunchDescriptionSource,
    AnyLaunchDescriptionSource,
)
from launch.event_handlers import OnProcessExit
from launch.substitutions import LaunchConfiguration, TextSubstitution
from launch_ros.actions import LoadComposableNodes, Node
from launch_ros.descriptions import ComposableNode
from launch.conditions import IfCondition, UnlessCondition

from os import path
from pathlib import Path

GREEN =  '\033[32m'
ENDC = '\033[m'

def launch_setup(context, *args, **kwargs):
    perse_ui_prefix = get_package_share_directory("perse_ui")
    rosbridge_server_prefix = get_package_share_directory("rosbridge_server")
    web_port = LaunchConfiguration('web_port').perform(context)

    perse_ui = Node(
        package="perse_ui", executable="perse_ui.py", name="perse_ui", output="screen"
    )
    http_server = ExecuteProcess(
        cmd=['python3', '-m', 'http.server', web_port],
        cwd=path.join(perse_ui_prefix, 'dist'),  # Define o diretório de trabalho para o comando
        output='screen',
        shell=False,
        name='http_server'
    )

    rosbridge_websocket = IncludeLaunchDescription(
        AnyLaunchDescriptionSource(
            path.join(rosbridge_server_prefix, "launch/rosbridge_websocket_launch.xml")
        ),
    )

    return [
        rosbridge_websocket,
        perse_ui,
        http_server,
        ExecuteProcess(
            cmd=['echo', f'{GREEN}Rodando servidor na porta {web_port}{ENDC}'],
            output='screen',
            shell=False,
            name='server_info'
        ),
        RegisterEventHandler(
            event_handler=OnProcessExit(
                target_action=perse_ui, on_exit=[EmitEvent(event=Shutdown())]
            )
        ),
    ]


def generate_launch_description():
    declared_arguments = [
        DeclareLaunchArgument(
            "serve_files", default_value=TextSubstitution(text="true")
        ),
        DeclareLaunchArgument("port", default_value="9090"),
        DeclareLaunchArgument("web_port", default_value="8000"),
    ]

    return LaunchDescription(
        declared_arguments + [OpaqueFunction(function=launch_setup)]
    )
