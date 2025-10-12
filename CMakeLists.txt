cmake_minimum_required(VERSION 3.8)
project(perse_ui)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

set (CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake ${CMAKE_MODULE_PATH})

find_package(ament_cmake REQUIRED)
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
message(WARNING "Using cache")

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

ament_package()
