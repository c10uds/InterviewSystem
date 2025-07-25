cmake_minimum_required(VERSION 3.16)
project(SparkChainServer)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找依赖库
find_package(Threads REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(JSONCPP jsoncpp)

# 添加第三方库目录
set(HTTPLIB_REQUIRE_OPENSSL ON)

# 包含头文件目录
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/third_party)

# 源文件
set(SOURCES
    src/main.cpp
    src/server.cpp
    src/handlers/base_handler.cpp
    src/handlers/health_handler.cpp
    src/handlers/asr_handler.cpp
    src/handlers/tts_handler.cpp
    src/handlers/llm_handler.cpp
    src/handlers/image_recognition_handler.cpp
    src/services/audio_service.cpp
    src/services/llm_service.cpp
    src/services/image_service.cpp
    src/utils/json_utils.cpp
    src/utils/file_utils.cpp
    src/utils/logger.cpp
)

# 头文件
set(HEADERS
    include/server.h
    include/handlers/base_handler.h
    include/handlers/health_handler.h
    include/handlers/asr_handler.h
    include/handlers/tts_handler.h
    include/handlers/llm_handler.h
    include/handlers/image_recognition_handler.h
    include/services/audio_service.h
    include/services/llm_service.h
    include/services/image_service.h
    include/utils/json_utils.h
    include/utils/file_utils.h
    include/utils/logger.h
    include/common/types.h
)

# 创建可执行文件
add_executable(sparkchain_server ${SOURCES} ${HEADERS})

# 链接库
target_link_libraries(sparkchain_server 
    Threads::Threads
    ${JSONCPP_LIBRARIES}
    ssl
    crypto
)

# 编译选项
target_compile_options(sparkchain_server PRIVATE ${JSONCPP_CFLAGS_OTHER})
target_include_directories(sparkchain_server PRIVATE ${JSONCPP_INCLUDE_DIRS})

# 安装规则
install(TARGETS sparkchain_server DESTINATION bin)
