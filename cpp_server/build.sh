#!/bin/bash

# SparkChain Server Build Script
# 自动化编译脚本

set -e  # 遇到错误立即退出

echo "=== SparkChain Server 编译脚本 ==="

# 检查系统类型
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
else
    echo "不支持的操作系统: $OSTYPE"
    exit 1
fi

echo "检测到平台: $PLATFORM"

# 检查依赖
check_dependency() {
    local cmd=$1
    local name=$2
    
    if ! command -v $cmd &> /dev/null; then
        echo "错误: 缺少依赖 $name"
        echo "请先安装 $name"
        exit 1
    fi
    
    echo "✓ 依赖检查通过: $name"
}

echo "检查编译依赖..."
check_dependency "cmake" "CMake"
check_dependency "g++" "GCC"
check_dependency "pkg-config" "pkg-config"

# 检查库依赖
echo "检查库依赖..."
if ! pkg-config --exists jsoncpp; then
    echo "错误: 缺少 jsoncpp 库"
    if [[ $PLATFORM == "linux" ]]; then
        echo "请运行: sudo apt-get install libjsoncpp-dev"
    elif [[ $PLATFORM == "macos" ]]; then
        echo "请运行: brew install jsoncpp"
    fi
    exit 1
fi
echo "✓ 库依赖检查通过: jsoncpp"

# 检查 OpenSSL
if ! pkg-config --exists openssl; then
    echo "错误: 缺少 OpenSSL 库"
    if [[ $PLATFORM == "linux" ]]; then
        echo "请运行: sudo apt-get install libssl-dev"
    elif [[ $PLATFORM == "macos" ]]; then
        echo "请运行: brew install openssl"
    fi
    exit 1
fi
echo "✓ 库依赖检查通过: OpenSSL"

# 下载 httplib
echo "检查 httplib..."
if [ ! -f "third_party/httplib.h" ]; then
    echo "下载 httplib..."
    mkdir -p third_party
    cd third_party
    
    if command -v wget &> /dev/null; then
        wget -O httplib.h https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h
    elif command -v curl &> /dev/null; then
        curl -o httplib.h -L https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h
    else
        echo "错误: 需要 wget 或 curl 来下载 httplib"
        echo "请手动下载 https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h"
        echo "并保存到 third_party/httplib.h"
        exit 1
    fi
    
    cd ..
    echo "✓ httplib 下载完成"
else
    echo "✓ httplib 已存在"
fi

# 创建构建目录
echo "创建构建目录..."
if [ -d "build" ]; then
    echo "清理现有构建目录..."
    rm -rf build
fi

mkdir build
cd build

# 配置 CMake
echo "配置 CMake..."
cmake .. -DCMAKE_BUILD_TYPE=Release

# 编译
echo "开始编译..."
CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
echo "使用 $CPU_CORES 个 CPU 核心进行编译"

make -j$CPU_CORES

# 检查编译结果
if [ -f "sparkchain_server" ]; then
    echo "✓ 编译成功!"
    echo "可执行文件位置: $(pwd)/sparkchain_server"
    
    # 创建启动脚本
    cat > start_server.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
mkdir -p public logs

echo "启动 SparkChain Server..."
echo "服务地址: http://127.0.0.1:8081"
echo "健康检查: http://127.0.0.1:8081/api/health"
echo "按 Ctrl+C 停止服务器"

./sparkchain_server 8081 ./public
EOF
    
    chmod +x start_server.sh
    echo "✓ 启动脚本已创建: start_server.sh"
    
    # 创建公共目录
    mkdir -p public/audio
    mkdir -p logs
    
    echo ""
    echo "=== 编译完成 ==="
    echo "运行服务器: ./start_server.sh"
    echo "或直接运行: ./sparkchain_server"
    echo ""
    
else
    echo "✗ 编译失败"
    exit 1
fi
