#pragma once

#include <string>
#include <unordered_map>
#include <memory>
#include <functional>
#include <vector>

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
    
    // Token使用信息
    int completion_tokens = 0;  // 回答Token数量
    int prompt_tokens = 0;      // 问题Token数量
    int total_tokens = 0;       // 总Token数量
};

// 健康检查响应
struct HealthResponse {
    std::string status;
    std::string version;
    std::string timestamp;
    std::string uptime;
};

// 人脸信息结构
struct FaceInfo {
    int x, y, width, height;  // 人脸位置和大小
    double confidence;        // 检测置信度
    std::string gender;       // 性别 (male/female)
    int age;                  // 年龄估计
    std::string emotion;      // 主要情绪
    double emotion_score;     // 情绪置信度
};

// 微表情分析结构
struct MicroExpressionInfo {
    std::string expression;   // 微表情类型
    double intensity;         // 强度 (0.0-1.0)
    double duration;          // 持续时间(秒)
    std::string description;  // 描述
};

// 图像识别请求
struct ImageRecognitionRequest {
    std::string image_data;   // 图像数据 (base64编码)
    std::string format = "jpg"; // 图像格式
    bool detect_faces = true; // 是否检测人脸
    bool analyze_emotion = true; // 是否分析情绪
    bool analyze_micro_expression = false; // 是否分析微表情
    std::string analysis_mode = "interview"; // 分析模式
};

// 图像识别响应
struct ImageRecognitionResponse {
    bool success;
    std::string error;
    
    // 基础信息
    int image_width;
    int image_height;
    std::string image_format;
    
    // 人脸检测结果
    std::vector<FaceInfo> faces;
    
    // 微表情分析结果
    std::vector<MicroExpressionInfo> micro_expressions;
    
    // 面试相关分析
    struct InterviewAnalysis {
        double attention_score;     // 专注度评分 (0.0-1.0)
        double confidence_score;    // 自信度评分 (0.0-1.0)
        double stress_level;        // 紧张程度 (0.0-1.0)
        double engagement_score;    // 参与度评分 (0.0-1.0)
        std::string overall_impression; // 整体印象
        std::vector<std::string> suggestions; // 改进建议
    } interview_analysis;
};

} // namespace sparkchain
