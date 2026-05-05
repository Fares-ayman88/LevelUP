cmake_minimum_required(VERSION 3.14)
project(firebase_cpp_sdk_stub LANGUAGES CXX)

foreach(lib_name firebase_app firebase_auth firebase_storage firebase_firestore)
  add_library(${lib_name} STATIC IMPORTED)
  set_target_properties(${lib_name} PROPERTIES
    IMPORTED_LOCATION "${CMAKE_CURRENT_LIST_DIR}/lib/${lib_name}.lib"
    IMPORTED_LOCATION_DEBUG "${CMAKE_CURRENT_LIST_DIR}/lib/${lib_name}.lib"
    IMPORTED_LOCATION_RELEASE "${CMAKE_CURRENT_LIST_DIR}/lib/${lib_name}.lib"
  )
endforeach()
