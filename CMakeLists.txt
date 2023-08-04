cmake_minimum_required(VERSION 2.8.3)

set(LIB_MAJOR_VERSION "1")
set(LIB_MINOR_VERSION "1")
set(LIB_PATCH_VERSION "0")
set(LIB_VERSION_STRING "${LIB_MAJOR_VERSION}.${LIB_MINOR_VERSION}.${LIB_PATCH_VERSION}")

if (CMAKE_VERSION VERSION_LESS 3.0)
   project(perse_ui)
else()
  cmake_policy(SET CMP0048 NEW)
  PROJECT(perse_ui VERSION "${LIB_VERSION_STRING}")
endif()

find_package(catkin REQUIRED)

###################################
## catkin specific configuration ##
###################################
catkin_package()

#############
## Install ##
#############


add_custom_target (npm-target ALL
   COMMENT "npm install"
   COMMAND npm install
   WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
)


install(PROGRAMS
   server/src/server.js
   DESTINATION ${CATKIN_PACKAGE_BIN_DESTINATION}
)
