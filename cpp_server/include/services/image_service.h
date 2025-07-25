#pragma once

#include <string>
#include <memory>
#include <vector>
#include <mutex>
#include <atomic>
#include "common/types.h"

// SparkChain SDK前向声明
namespace SparkChain {
    class LLM;
    class LLMCallbacks;
}

namespace sparkchain {

class ImageService {
public:
    ImageService();
    ~ImageService();
    
    // 图像识别主接口
    ImageRecognitionResponse recognize_image(const ImageRecognitionRequest& request);
    
    // 初始化图像处理引擎
    bool initialize();
    
    // 释放资源
    void cleanup();
    
    // 设置模型配置
    void set_model_config(const std::string& model_path, const std::string& config_path);

private:
    // 内部处理方法
    ImageRecognitionResponse process_image_recognition(const std::string& image_data, 
                                                     const ImageRecognitionRequest& request);
    
    // 人脸检测
    std::vector<FaceInfo> detect_faces(const std::string& image_data);
    
    // 情绪分析
    std::string analyze_emotion(const FaceInfo& face, const std::string& image_data);
    double calculate_emotion_score(const std::string& emotion);
    
    // 微表情分析
    std::vector<MicroExpressionInfo> analyze_micro_expressions(const std::vector<FaceInfo>& faces,
                                                               const std::string& image_data);
    
    // 面试相关分析
    ImageRecognitionResponse::InterviewAnalysis analyze_interview_performance(
        const std::vector<FaceInfo>& faces,
        const std::vector<MicroExpressionInfo>& micro_expressions);
    
    // 图像预处理
    std::string preprocess_image(const std::string& image_data, const std::string& format);
    
    // 图像质量检查
    bool validate_image_quality(const std::string& image_data);
    
    // 获取图像尺寸
    std::pair<int, int> get_image_dimensions(const std::string& image_data);
    
    // SparkChain图像理解功能
    std::string analyze_image_with_llm(const std::string& image_data, const std::string& question);
    std::string analyze_interview_scene(const std::string& image_data);
    std::string analyze_facial_expressions(const std::string& image_data);
    
    // SparkChain SDK相关方法
    bool init_sparkchain_image_sdk();
    void cleanup_sparkchain_image_sdk();
    SparkChain::LLM* create_image_llm_instance();
    
    // LLM结果解析方法
    std::vector<FaceInfo> parse_llm_face_analysis(const std::string& llm_result);
    ImageRecognitionResponse::InterviewAnalysis parse_llm_interview_analysis(const std::string& llm_result);
    
    // SDK配置参数（使用已有的配置）
    static const char* APPID;
    static const char* APIKEY;
    static const char* APISECRET;
    static const char* WORKDIR;
    
    // 模拟人脸检测（用于演示）
    std::vector<FaceInfo> simulate_face_detection(int image_width, int image_height);
    
    // 模拟情绪分析（用于演示）
    std::string simulate_emotion_analysis();
    
    // 模拟微表情分析（用于演示）
    std::vector<MicroExpressionInfo> simulate_micro_expression_analysis();

private:
    bool is_initialized_;
    bool sdk_initialized_;
    std::string model_path_;
    std::string config_path_;
    std::mutex sdk_mutex_;
    std::atomic<bool> llm_finished_;
    
    // 支持的图像格式
    std::vector<std::string> supported_formats_;
    
    // 情绪类型映射
    std::vector<std::string> emotion_types_;
    
    // 微表情类型映射
    std::vector<std::string> micro_expression_types_;
};

} // namespace sparkchain
