# FindPip
# -------
#
# Find pip
#
# This module finds an installed pip. It sets the following variables:
#
#   PIP_FOUND - Set to true if pip is found
#   PIP_EXECUTABLE - The path to the pip executable
#   PIP_VERSION - The version number of pip
#   PIP_GLOBAL_PACKAGE_DIR - The global site-packages directory
#   PIP_DIR - The directory where pip is installed

find_program(PIP_EXECUTABLE NAMES pip pip3)

if(PIP_EXECUTABLE)
    # Get version and installation path
    execute_process(
        COMMAND ${PIP_EXECUTABLE} --version
        OUTPUT_VARIABLE pip_version_output
        ERROR_VARIABLE pip_version_error
        RESULT_VARIABLE pip_version_result_code
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )

    if(NOT pip_version_result_code)
        # Extract version
        string(REGEX MATCH "pip ([0-9.]+)" _ "${pip_version_output}")
        if(CMAKE_MATCH_1)
            set(PIP_VERSION "${CMAKE_MATCH_1}")
        else()
            set(PIP_VERSION "PIP_VERSION-NOTFOUND")
        endif()

        # Extract installation path
        string(REGEX MATCH "from ([^ ]+)" _ "${pip_version_output}")
        set(pip_install_path "${CMAKE_MATCH_1}")
        if(EXISTS "${pip_install_path}")
            set(PIP_DIR "${pip_install_path}")
            get_filename_component(PIP_GLOBAL_PACKAGE_DIR "${pip_install_path}" DIRECTORY)
        else()
            message(STATUS "Pip installation path not found: ${pip_install_path}")
            set(PIP_DIR "PIP_DIR-NOTFOUND")
            set(PIP_GLOBAL_PACKAGE_DIR "PIP_GLOBAL_PACKAGE_DIR-NOTFOUND")
        endif()
    else()
        if(Pip_FIND_REQUIRED)
            message(SEND_ERROR "Command \"${PIP_EXECUTABLE} --version\" failed with output: ${pip_version_error}")
        else()
            message(STATUS "Command \"${PIP_EXECUTABLE} --version\" failed with output: ${pip_version_error}")
        endif()
        set(PIP_VERSION "PIP_VERSION-NOTFOUND")
        set(PIP_DIR "PIP_DIR-NOTFOUND")
        set(PIP_GLOBAL_PACKAGE_DIR "PIP_GLOBAL_PACKAGE_DIR-NOTFOUND")
    endif()
else()
    set(PIP_VERSION "PIP_VERSION-NOTFOUND")
    set(PIP_DIR "PIP_DIR-NOTFOUND")
    set(PIP_GLOBAL_PACKAGE_DIR "PIP_GLOBAL_PACKAGE_DIR-NOTFOUND")
    if(Pip_FIND_REQUIRED)
        message(SEND_ERROR "Failed to find pip executable")
    endif()
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Pip
    REQUIRED_VARS PIP_EXECUTABLE PIP_DIR PIP_GLOBAL_PACKAGE_DIR
    VERSION_VAR PIP_VERSION
)

mark_as_advanced(PIP_EXECUTABLE PIP_VERSION PIP_GLOBAL_PACKAGE_DIR PIP_DIR)
