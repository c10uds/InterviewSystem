#pragma once

#include <string>
#include <unordered_map>
#include <memory>
#include <functional>

namespace sparkchain {

// 基础数据类型
using String = std::string;
using Json = std::unordered_map<std::string, std::string>;

// HTTP状态码
enum class HttpStatus {
    OK = 200,
    BAD_REQUEST = 400,
    INTERNAL_SERVER_ERROR = 500
};

// API响应结构
struct ApiResponse {
    HttpStatus status;
    std::string content_type;
    std::string body;
    
    ApiResponse(HttpStatus s = HttpStatus::OK, 
                const std::string& type = "application/json",
                const std::string& b = "") 
        : status(s), content_type(type), body(b) {}
};

// 语音识别请求
struct AsrRequest {
    std::string audio_data;
    std::string language = "zh_cn";
    std::string format = "wav";
};

// 语音识别响应
struct AsrResponse {
    bool success;
    std::string text;
    std::string error;
    double confidence;
};

// 语音合成请求
struct TtsRequest {
    std::string text;
    std::string voice = "xiaoyan";
    std::string format = "wav";
};

// 语音合成响应
struct TtsResponse {
    bool success;
    std::string audio_url;
    std::string error;
    size_t audio_size;
};

// LLM对话请求
struct LlmRequest {
    std::string question;
    std::string chat_id;
    std::string model = "spark";
};

// LLM对话响应
struct LlmResponse {
    bool success;
    std::string answer;
    std::string chat_id;
    std::string error;
};

// 健康检查响应
struct HealthResponse {
    std::string status;
    std::string version;
    std::string timestamp;
    std::string uptime;
};

} // namespace sparkchain
