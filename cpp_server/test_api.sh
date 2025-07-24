#!/bin/bash

# SparkChain Server API 测试脚本

SERVER_URL="http://127.0.0.1:8081"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== SparkChain Server API 测试 ==="
echo "服务器地址: $SERVER_URL"
echo

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $TOTAL_TESTS: $test_name ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$SERVER_URL$endpoint" 2>/dev/null)
    elif [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST -d "$data" "$SERVER_URL$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL$endpoint" 2>/dev/null)
        fi
    fi
    
    if [ $? -eq 0 ]; then
        http_code=$(echo "$response" | tail -n1)
        response_body=$(echo "$response" | head -n -1)
        
        if [ "$http_code" = "$expected_status" ]; then
            echo -e "${GREEN}通过${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            
            # 显示响应内容（如果是JSON）
            if echo "$response_body" | jq . >/dev/null 2>&1; then
                echo "  响应: $(echo "$response_body" | jq -c .)"
            else
                echo "  响应: $response_body"
            fi
        else
            echo -e "${RED}失败${NC} (HTTP $http_code, 期望 $expected_status)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            echo "  响应: $response_body"
        fi
    else
        echo -e "${RED}失败${NC} (连接错误)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo
}

# 检查服务器是否运行
echo "检查服务器状态..."
if ! curl -s "$SERVER_URL/api/health" >/dev/null 2>&1; then
    echo -e "${RED}错误: 服务器未运行或无法连接到 $SERVER_URL${NC}"
    echo "请先启动服务器: ./build/sparkchain_server"
    exit 1
fi
echo -e "${GREEN}服务器运行正常${NC}"
echo

# 开始测试

# 1. 健康检查测试
test_api "健康检查" "GET" "/api/health" "" "200"

# 2. LLM 对话测试
test_api "LLM对话-简单问题" "POST" "/api/llm" "question=你好" "200"
test_api "LLM对话-面试相关" "POST" "/api/llm" "question=给我一些面试建议" "200"
test_api "LLM对话-空问题" "POST" "/api/llm" "question=" "400"

# 3. TTS 测试
test_api "语音合成-基本测试" "POST" "/api/tts" "text=这是一个测试&voice=xiaoyan" "200"
test_api "语音合成-空文本" "POST" "/api/tts" "text=" "400"
test_api "语音合成-不支持的发音人" "POST" "/api/tts" "text=测试&voice=unknown" "400"

# 4. 错误处理测试
test_api "不存在的接口" "GET" "/api/nonexistent" "" "404"
test_api "方法不允许" "PUT" "/api/health" "" "405"

# 5. CORS 测试
echo -n "测试 CORS 支持 ... "
cors_response=$(curl -s -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS "$SERVER_URL/api/llm" -w "%{http_code}")
if [ "${cors_response: -3}" = "200" ]; then
    echo -e "${GREEN}通过${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}失败${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo

# 6. 文件上传测试（ASR）
echo -n "测试 ASR 文件上传 ... "
# 创建一个小的测试文件
test_audio_file="/tmp/test_audio.wav"
echo "fake audio data" > "$test_audio_file"

asr_response=$(curl -s -w "%{http_code}" -X POST -F "audio=@$test_audio_file" -F "language=zh_cn" "$SERVER_URL/api/asr")
asr_http_code="${asr_response: -3}"

if [ "$asr_http_code" = "200" ]; then
    echo -e "${GREEN}通过${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "  响应: $(echo "${asr_response%???}" | head -c 100)..."
else
    echo -e "${RED}失败${NC} (HTTP $asr_http_code)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# 清理测试文件
rm -f "$test_audio_file"
echo

# 7. 性能测试（简单并发）
echo "性能测试（10个并发健康检查）..."
start_time=$(date +%s.%N)
for i in {1..10}; do
    curl -s "$SERVER_URL/api/health" >/dev/null &
done
wait
end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || python3 -c "print($end_time - $start_time)")
echo "并发测试完成，耗时: ${duration}s"
echo

# 测试总结
echo "=== 测试总结 ==="
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}有 $FAILED_TESTS 个测试失败${NC}"
    exit 1
fi
