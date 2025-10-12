cmake_minimum_required(VERSION 3.8)
project(perse_ui)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

set (CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake ${CMAKE_MODULE_PATH})

if(NOT CMAKE_CXX_STANDARD)
  set(CMAKE_CXX_STANDARD 17)
endif()

find_package(ament_cmake REQUIRED)
find_package(std_msgs REQUIRED)
find_package(rcl_interfaces REQUIRED)
find_package(rosidl_default_generators REQUIRED)
find_package(Npm QUIET)

IF(Npm_FOUND)
  add_custom_target(
        npm-build ALL
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/ui
        COMMAND npm install && npm run build
        COMMENT "Running 'npm run build' inside 'ui' folder"
    )
ELSE()
  message(WARNING "npm not found! UI couldn't be built. Using cache")
ENDIF()

install(DIRECTORY
  ui/dist
  launch
  DESTINATION share/${PROJECT_NAME}/
  OPTIONAL
 )

# Install Python executables
install(PROGRAMS
  nodes/perse_ui.py
  DESTINATION lib/${PROJECT_NAME}
)


################################################
## Declare ROS messages, services and actions ##
################################################

set(MSG_FILES
    "msg/NodeState.msg"
    "msg/NodeStates.msg"
)

set(SRV_FILES
    "srv/SaveVariant.srv"
    "srv/InstallVariant.srv"
    "srv/GetVariant.srv"
    "srv/DeleteVariant.srv"
)

rosidl_generate_interfaces(${PROJECT_NAME}
  ${MSG_FILES}
  ${SRV_FILES}
  DEPENDENCIES
    std_msgs
    rcl_interfaces
)

ament_export_dependencies(rosidl_default_runtime)
ament_package()
