#include "services/image_service.h"
#include "utils/logger.h"
#include "utils/file_utils.h"

#include <random>
#include <thread>
#include <chrono>
#include <algorithm>
#include <atomic>

// SparkChain SDK头文件
#include "sparkchain.h"

// 使用LLM服务中已定义的SDK配置参数
extern const char* SPARKCHAIN_APPID;
extern const char* SPARKCHAIN_APIKEY;
extern const char* SPARKCHAIN_APISECRET;
extern const char* SPARKCHAIN_WORKDIR;

// SparkChain图像理解回调实现
class SparkImageLLMCallbacks : public SparkChain::LLMCallbacks {
private:
    std::atomic<bool>* finished_;
    std::string* result_;
    std::string* error_;
    
public:
    SparkImageLLMCallbacks(std::atomic<bool>* finished, std::string* result, std::string* error)
        : finished_(finished), result_(result), error_(error) {}
    
    void onLLMResult(SparkChain::LLMResult* result, void* usrContext) override {
        if (result) {
            const char* content = result->getContent();
            int status = result->getStatus();
            
            if (content) {
                *result_ += content;
            }
            
            if (status == 2) { // 最终帧
                *finished_ = true;
            }
        }
    }
    
    void onLLMEvent(SparkChain::LLMEvent* event, void* usrContext) override {
        // 处理事件，如果需要的话
    }
    
    void onLLMError(SparkChain::LLMError* error, void* usrContext) override {
        if (error) {
            int errCode = error->getErrCode();
            const char* errMsg = error->getErrMsg();
            
            *error_ = "Image LLM Error: Code=" + std::to_string(errCode) + ", Message=" + std::string(errMsg ? errMsg : "Unknown error");
            *finished_ = true;
        }
    }
};

namespace sparkchain {

// SDK配置参数 - 使用已定义的配置
const char* ImageService::APPID = SPARKCHAIN_APPID;
const char* ImageService::APIKEY = SPARKCHAIN_APIKEY;
const char* ImageService::APISECRET = SPARKCHAIN_APISECRET;
const char* ImageService::WORKDIR = SPARKCHAIN_WORKDIR;

ImageService::ImageService() 
    : is_initialized_(false)
    , sdk_initialized_(false)
    , model_path_("./models/image")
    , config_path_("./config/image_config.json")
    , llm_finished_(false) {
    
    // 初始化支持的图像格式
    supported_formats_ = {"jpg", "jpeg", "png", "bmp", "webp"};
    
    // 初始化情绪类型
    emotion_types_ = {
        "neutral", "happy", "sad", "angry", "surprised", 
        "fearful", "disgusted", "confident", "nervous", "focused"
    };
    
    // 初始化微表情类型
    micro_expression_types_ = {
        "微笑", "眉毛挑动", "眼部紧张", "嘴角下垂", "眨眼频繁",
        "面部紧绷", "轻微摇头", "眼神闪躲", "深呼吸", "舔嘴唇"
    };
}

ImageService::~ImageService() {
    cleanup();
}

bool ImageService::initialize() {
    if (is_initialized_) {
        return true;
    }
    
    try {
        LOG_INFO("初始化图像识别服务...");
        
        // 初始化SparkChain图像理解SDK
        if (!init_sparkchain_image_sdk()) {
            LOG_WARN("SparkChain图像理解SDK初始化失败，将使用模拟模式");
        }
        
        // 检查模型文件
        if (!FileUtils::exists(model_path_)) {
            LOG_WARN_F("图像模型路径不存在: %s, 使用模拟模式", model_path_.c_str());
        }
        
        // 加载配置
        if (FileUtils::exists(config_path_)) {
            LOG_INFO_F("加载图像识别配置: %s", config_path_.c_str());
        }
        
        is_initialized_ = true;
        LOG_INFO("图像识别服务初始化完成");
        return true;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("图像识别服务初始化失败: %s", e.what());
        return false;
    }
}

void ImageService::cleanup() {
    if (is_initialized_) {
        LOG_INFO("清理图像识别服务资源...");
        cleanup_sparkchain_image_sdk();
        is_initialized_ = false;
    }
}

void ImageService::set_model_config(const std::string& model_path, const std::string& config_path) {
    model_path_ = model_path;
    config_path_ = config_path;
    LOG_INFO_F("设置图像识别模型配置: 模型=%s, 配置=%s", model_path.c_str(), config_path.c_str());
}

ImageRecognitionResponse ImageService::recognize_image(const ImageRecognitionRequest& request) {
    ImageRecognitionResponse response;
    
    try {
        if (!is_initialized_) {
            response.success = false;
            response.error = "Image service not initialized";
            return response;
        }
        
        LOG_INFO_F("开始图像识别, 格式: %s, 检测人脸: %s, 分析情绪: %s", 
                  request.format.c_str(),
                  request.detect_faces ? "是" : "否",
                  request.analyze_emotion ? "是" : "否");
        
        // 验证图像质量
        if (!validate_image_quality(request.image_data)) {
            response.success = false;
            response.error = "Invalid image quality";
            return response;
        }
        
        // 调用实际的图像识别处理
        response = process_image_recognition(request.image_data, request);
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("图像识别处理异常: %s", e.what());
        response.success = false;
        response.error = e.what();
    }
    
    return response;
}

ImageRecognitionResponse ImageService::process_image_recognition(const std::string& image_data, 
                                                               const ImageRecognitionRequest& request) {
    ImageRecognitionResponse response;
    
    // 模拟图像处理时间
    std::this_thread::sleep_for(std::chrono::milliseconds(800));
    
    // 预处理图像
    std::string processed_image = preprocess_image(image_data, request.format);
    
    // 获取图像尺寸（模拟）
    auto dimensions = get_image_dimensions(processed_image);
    response.image_width = dimensions.first;
    response.image_height = dimensions.second;
    response.image_format = request.format;
    
    // 使用SparkChain进行图像理解分析
    if (sdk_initialized_ && request.analysis_mode == "interview") {
        try {
            LOG_INFO("使用SparkChain LLM进行面试场景分析");
            
            // 分析面试场景
            std::string scene_analysis = analyze_interview_scene(image_data);
            
            // 分析面部表情
            std::string expression_analysis = analyze_facial_expressions(image_data);
            
            // 解析LLM分析结果并转换为结构化数据
            response.faces = parse_llm_face_analysis(expression_analysis);
            response.interview_analysis = parse_llm_interview_analysis(scene_analysis);
            
            LOG_INFO_F("SparkChain图像分析完成, 分析结果长度: %zu", scene_analysis.length());
            
        } catch (const std::exception& e) {
            LOG_WARN_F("SparkChain图像分析失败: %s, 回退到模拟模式", e.what());
            // 回退到原有的模拟模式
            response.faces = detect_faces(processed_image);
        }
    } else {
        // 使用原有的模拟模式进行人脸检测
        response.faces = detect_faces(processed_image);
    }
    
    // 为每个人脸分析情绪（如果请求了）
    if (request.analyze_emotion && !response.faces.empty()) {
        for (auto& face : response.faces) {
            if (face.emotion.empty()) {
                face.emotion = analyze_emotion(face, processed_image);
            }
            if (face.emotion_score == 0.0) {
                face.emotion_score = calculate_emotion_score(face.emotion);
            }
        }
    }
    
    // 微表情分析
    if (request.analyze_micro_expression && !response.faces.empty()) {
        response.micro_expressions = analyze_micro_expressions(response.faces, processed_image);
    }
    
    // 如果还没有面试分析结果，使用传统方法
    if (request.analysis_mode == "interview" && response.interview_analysis.overall_impression.empty()) {
        response.interview_analysis = analyze_interview_performance(response.faces, response.micro_expressions);
    }
    
    response.success = true;
    
    LOG_INFO_F("图像识别完成, 检测到人脸: %zu个, 微表情: %zu个", 
              response.faces.size(), response.micro_expressions.size());
    
    return response;
}

std::vector<FaceInfo> ImageService::detect_faces(const std::string& image_data) {
    // 这里应该调用实际的人脸检测算法（如OpenCV、dlib等）
    // 目前使用模拟实现
    
    std::vector<FaceInfo> faces;
    
    // 模拟检测到1-3个人脸
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> face_count_dis(1, 3);
    std::uniform_int_distribution<> pos_dis(50, 400);
    std::uniform_int_distribution<> size_dis(80, 200);
    std::uniform_int_distribution<> age_dis(20, 45);
    std::uniform_real_distribution<> conf_dis(0.85, 0.98);
    
    int face_count = face_count_dis(gen);
    
    for (int i = 0; i < face_count; ++i) {
        FaceInfo face;
        face.x = pos_dis(gen);
        face.y = pos_dis(gen);
        face.width = size_dis(gen);
        face.height = size_dis(gen);
        face.confidence = conf_dis(gen);
        
        // 随机性别
        face.gender = (gen() % 2 == 0) ? "male" : "female";
        
        // 随机年龄
        face.age = age_dis(gen);
        
        faces.push_back(face);
    }
    
    return faces;
}

std::string ImageService::analyze_emotion(const FaceInfo& face, const std::string& image_data) {
    // 这里应该调用实际的情绪识别算法
    // 目前使用模拟实现
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> emotion_dis(0, emotion_types_.size() - 1);
    
    return emotion_types_[emotion_dis(gen)];
}

double ImageService::calculate_emotion_score(const std::string& emotion) {
    // 基于情绪类型计算置信度
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<> score_dis(0.7, 0.95);
    
    return score_dis(gen);
}

std::vector<MicroExpressionInfo> ImageService::analyze_micro_expressions(
    const std::vector<FaceInfo>& faces, const std::string& image_data) {
    
    // 这里应该调用实际的微表情分析算法
    // 目前使用模拟实现
    
    std::vector<MicroExpressionInfo> expressions;
    
    if (faces.empty()) {
        return expressions;
    }
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> expr_count_dis(0, 3);
    std::uniform_int_distribution<> expr_type_dis(0, micro_expression_types_.size() - 1);
    std::uniform_real_distribution<> intensity_dis(0.3, 0.9);
    std::uniform_real_distribution<> duration_dis(0.1, 2.0);
    
    int expr_count = expr_count_dis(gen);
    
    for (int i = 0; i < expr_count; ++i) {
        MicroExpressionInfo expr;
        expr.expression = micro_expression_types_[expr_type_dis(gen)];
        expr.intensity = intensity_dis(gen);
        expr.duration = duration_dis(gen);
        
        // 生成描述
        if (expr.expression == "微笑") {
            expr.description = "检测到轻微微笑，显示出积极情绪";
        } else if (expr.expression == "眉毛挑动") {
            expr.description = "眉毛轻微上扬，可能表示惊讶或质疑";
        } else if (expr.expression == "眼部紧张") {
            expr.description = "眼部肌肉紧张，可能显示压力或专注";
        } else {
            expr.description = "检测到" + expr.expression + "的微表情变化";
        }
        
        expressions.push_back(expr);
    }
    
    return expressions;
}

ImageRecognitionResponse::InterviewAnalysis ImageService::analyze_interview_performance(
    const std::vector<FaceInfo>& faces, const std::vector<MicroExpressionInfo>& micro_expressions) {
    
    ImageRecognitionResponse::InterviewAnalysis analysis;
    
    if (faces.empty()) {
        analysis.attention_score = 0.3;
        analysis.confidence_score = 0.2;
        analysis.stress_level = 0.8;
        analysis.engagement_score = 0.1;
        analysis.overall_impression = "未检测到人脸，建议调整摄像头角度";
        analysis.suggestions = {"请确保面部清晰可见", "调整光线和摄像头位置"};
        return analysis;
    }
    
    // 基于人脸和微表情分析面试表现
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<> score_dis(0.6, 0.9);
    
    // 基础评分
    analysis.attention_score = score_dis(gen);
    analysis.confidence_score = score_dis(gen);
    analysis.stress_level = 1.0 - score_dis(gen); // 压力水平越低越好
    analysis.engagement_score = score_dis(gen);
    
    // 根据情绪调整评分
    for (const auto& face : faces) {
        if (face.emotion == "confident") {
            analysis.confidence_score = std::min(1.0, analysis.confidence_score + 0.1);
        } else if (face.emotion == "nervous") {
            analysis.stress_level = std::min(1.0, analysis.stress_level + 0.2);
            analysis.confidence_score = std::max(0.0, analysis.confidence_score - 0.1);
        } else if (face.emotion == "focused") {
            analysis.attention_score = std::min(1.0, analysis.attention_score + 0.15);
            analysis.engagement_score = std::min(1.0, analysis.engagement_score + 0.1);
        } else if (face.emotion == "happy") {
            analysis.engagement_score = std::min(1.0, analysis.engagement_score + 0.1);
        }
    }
    
    // 根据微表情调整评分
    for (const auto& expr : micro_expressions) {
        if (expr.expression == "微笑") {
            analysis.confidence_score = std::min(1.0, analysis.confidence_score + 0.05);
            analysis.engagement_score = std::min(1.0, analysis.engagement_score + 0.05);
        } else if (expr.expression == "眼神闪躲") {
            analysis.confidence_score = std::max(0.0, analysis.confidence_score - 0.1);
            analysis.stress_level = std::min(1.0, analysis.stress_level + 0.1);
        } else if (expr.expression == "深呼吸") {
            analysis.stress_level = std::min(1.0, analysis.stress_level + 0.05);
        }
    }
    
    // 生成整体印象
    if (analysis.confidence_score > 0.8 && analysis.attention_score > 0.8) {
        analysis.overall_impression = "表现优秀，展现出良好的自信心和专注度";
    } else if (analysis.confidence_score > 0.6 && analysis.stress_level < 0.4) {
        analysis.overall_impression = "表现良好，状态相对放松，有进一步提升空间";
    } else if (analysis.stress_level > 0.7) {
        analysis.overall_impression = "略显紧张，建议放松心态，展现真实的自己";
    } else {
        analysis.overall_impression = "表现平稳，建议增强自信心和互动性";
    }
    
    // 生成改进建议
    analysis.suggestions.clear();
    
    if (analysis.confidence_score < 0.6) {
        analysis.suggestions.push_back("建议保持眼神交流，展现自信的肢体语言");
    }
    
    if (analysis.attention_score < 0.7) {
        analysis.suggestions.push_back("建议保持专注，避免分心或四处张望");
    }
    
    if (analysis.stress_level > 0.6) {
        analysis.suggestions.push_back("建议深呼吸放松，面试前做好充分准备");
    }
    
    if (analysis.engagement_score < 0.7) {
        analysis.suggestions.push_back("建议增加适当的表情变化，展现对工作的热情");
    }
    
    // 通用建议
    analysis.suggestions.push_back("保持自然的微笑，展现积极的工作态度");
    analysis.suggestions.push_back("回答问题时语速适中，逻辑清晰");
    
    return analysis;
}

std::string ImageService::preprocess_image(const std::string& image_data, const std::string& format) {
    // 这里应该进行实际的图像预处理
    // 如：尺寸调整、格式转换、噪声去除等
    return image_data;
}

bool ImageService::validate_image_quality(const std::string& image_data) {
    // 基本的图像质量检查
    if (image_data.empty()) {
        LOG_WARN("图像数据为空");
        return false;
    }
    
    if (image_data.size() < 1024) { // 最小1KB
        LOG_WARN("图像数据过小，可能无效");
        return false;
    }
    
    if (image_data.size() > 10 * 1024 * 1024) { // 最大10MB
        LOG_WARN("图像数据过大");
        return false;
    }
    
    return true;
}

std::pair<int, int> ImageService::get_image_dimensions(const std::string& image_data) {
    // 这里应该解析实际的图像尺寸
    // 目前返回模拟尺寸
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> width_dis(640, 1920);
    std::uniform_int_distribution<> height_dis(480, 1080);
    
    return std::make_pair(width_dis(gen), height_dis(gen));
}

// SparkChain图像理解功能实现
std::string ImageService::analyze_image_with_llm(const std::string& image_data, const std::string& question) {
    if (!sdk_initialized_) {
        return "SDK未初始化";
    }
    
    try {
        LOG_INFO_F("调用SparkChain图像理解LLM, 问题: %s", question.c_str());
        
        // 重置标志
        llm_finished_ = false;
        std::string result;
        std::string error_msg;
        
        // 创建图像理解LLM实例
        SparkChain::LLM* llm = create_image_llm_instance();
        if (!llm) {
            return "创建LLM实例失败";
        }
        
        // 创建回调实例
        SparkImageLLMCallbacks callbacks(&llm_finished_, &result, &error_msg);
        llm->registerLLMCallbacks(&callbacks);
        
        // 执行图像理解
        llm->arun(question.c_str(), const_cast<char*>(image_data.data()), image_data.size());
        
        // 等待结果（最多等待30秒）
        int wait_times = 0;
        while (!llm_finished_ && wait_times < 300) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            wait_times++;
        }
        
        // 清理LLM实例
        SparkChain::LLM::destroy(llm);
        
        if (!llm_finished_) {
            return "图像理解超时";
        }
        
        if (!error_msg.empty()) {
            return "图像理解错误: " + error_msg;
        }
        
        return result;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("SparkChain图像理解异常: %s", e.what());
        return "图像理解异常: " + std::string(e.what());
    }
}

std::string ImageService::analyze_interview_scene(const std::string& image_data) {
    std::string question = "请分析这张面试场景图片，从以下几个方面进行评估：\n"
                          "1. 面试者的整体形象和着装是否得体\n"
                          "2. 面试者的坐姿和肢体语言\n"
                          "3. 面试者的注意力集中程度\n"
                          "4. 面试者的自信程度表现\n"
                          "5. 面试者的紧张或放松状态\n"
                          "6. 整体面试表现评分（1-10分）\n"
                          "请给出详细分析和改进建议。";
    
    return analyze_image_with_llm(image_data, question);
}

std::string ImageService::analyze_facial_expressions(const std::string& image_data) {
    std::string question = "请分析这张图片中人物的面部表情，包括：\n"
                          "1. 基本情绪（快乐、悲伤、愤怒、惊讶、恐惧、厌恶、中性）\n"
                          "2. 面部肌肉紧张程度\n"
                          "3. 眼神表现（专注、游移、自信等）\n"
                          "4. 微表情特征（如微笑、皱眉、眨眼等）\n"
                          "5. 整体表情给人的印象\n"
                          "请详细描述观察到的面部表情特征。";
    
    return analyze_image_with_llm(image_data, question);
}

// 解析LLM分析结果的辅助方法
std::vector<FaceInfo> ImageService::parse_llm_face_analysis(const std::string& llm_result) {
    std::vector<FaceInfo> faces;
    
    // 基于LLM结果创建一个人脸信息（简化实现）
    if (!llm_result.empty() && llm_result.find("未检测到人脸") == std::string::npos) {
        FaceInfo face;
        face.x = 100;
        face.y = 100;
        face.width = 200;
        face.height = 200;
        face.confidence = 0.95;
        face.gender = "unknown";
        face.age = 30;
        
        // 从LLM结果中提取情绪信息
        if (llm_result.find("快乐") != std::string::npos || llm_result.find("微笑") != std::string::npos) {
            face.emotion = "happy";
            face.emotion_score = 0.9;
        } else if (llm_result.find("悲伤") != std::string::npos) {
            face.emotion = "sad";
            face.emotion_score = 0.8;
        } else if (llm_result.find("愤怒") != std::string::npos) {
            face.emotion = "angry";
            face.emotion_score = 0.8;
        } else if (llm_result.find("紧张") != std::string::npos) {
            face.emotion = "nervous";
            face.emotion_score = 0.8;
        } else if (llm_result.find("自信") != std::string::npos) {
            face.emotion = "confident";
            face.emotion_score = 0.9;
        } else {
            face.emotion = "neutral";
            face.emotion_score = 0.7;
        }
        
        faces.push_back(face);
    }
    
    return faces;
}

ImageRecognitionResponse::InterviewAnalysis ImageService::parse_llm_interview_analysis(const std::string& llm_result) {
    ImageRecognitionResponse::InterviewAnalysis analysis;
    
    // 基于LLM结果设置分析数据（简化实现）
    if (llm_result.empty()) {
        analysis.attention_score = 0.5;
        analysis.confidence_score = 0.5;
        analysis.stress_level = 0.5;
        analysis.engagement_score = 0.5;
        analysis.overall_impression = "无法分析图像内容";
        analysis.suggestions = {"请提供清晰的面试图像"};
        return analysis;
    }
    
    // 从LLM结果中提取评分信息（简化解析）
    analysis.attention_score = 0.8;
    analysis.confidence_score = 0.7;
    analysis.stress_level = 0.3;
    analysis.engagement_score = 0.8;
    
    // 根据LLM内容调整评分
    if (llm_result.find("自信") != std::string::npos) {
        analysis.confidence_score = std::min(1.0, analysis.confidence_score + 0.2);
    }
    if (llm_result.find("紧张") != std::string::npos) {
        analysis.stress_level = std::min(1.0, analysis.stress_level + 0.3);
        analysis.confidence_score = std::max(0.0, analysis.confidence_score - 0.2);
    }
    if (llm_result.find("专注") != std::string::npos || llm_result.find("注意力") != std::string::npos) {
        analysis.attention_score = std::min(1.0, analysis.attention_score + 0.1);
    }
    
    // 设置整体印象（取LLM结果的一部分）
    analysis.overall_impression = "基于AI视觉分析：" + llm_result.substr(0, 100) + "...";
    
    // 生成改进建议
    analysis.suggestions.clear();
    if (analysis.confidence_score < 0.7) {
        analysis.suggestions.push_back("AI建议：增强自信心，保持良好的眼神交流");
    }
    if (analysis.stress_level > 0.5) {
        analysis.suggestions.push_back("AI建议：适当放松，深呼吸调整心态");
    }
    if (analysis.attention_score < 0.8) {
        analysis.suggestions.push_back("AI建议：保持专注，避免分心");
    }
    
    // 添加基于LLM分析的建议
    analysis.suggestions.push_back("AI分析：" + llm_result.substr(llm_result.length() > 150 ? llm_result.length() - 150 : 0));
    
    return analysis;
}

bool ImageService::init_sparkchain_image_sdk() {
    std::lock_guard<std::mutex> lock(sdk_mutex_);
    
    if (sdk_initialized_) {
        return true;
    }
    
    try {
        LOG_INFO("SparkChain图像理解SDK使用LLM服务已初始化的SDK实例");
        
        // 不需要再次初始化SDK，因为LLM服务已经初始化过了
        // SparkChain SDK只能初始化一次，多个服务共享同一个SDK实例
        
        sdk_initialized_ = true;
        LOG_INFO("SparkChain图像理解SDK准备就绪");
        return true;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("SparkChain图像理解SDK准备异常: %s", e.what());
        return false;
    }
}

void ImageService::cleanup_sparkchain_image_sdk() {
    std::lock_guard<std::mutex> lock(sdk_mutex_);
    
    if (sdk_initialized_) {
        LOG_INFO("SparkChain图像理解SDK清理由LLM服务统一管理");
        
        // 不需要在这里调用unInit()，因为LLM服务会统一清理SDK
        sdk_initialized_ = false;
        
        LOG_INFO("SparkChain图像理解SDK标记为已清理");
    }
}

SparkChain::LLM* ImageService::create_image_llm_instance() {
    try {
        SparkChain::LLMConfig* llmConfig = SparkChain::LLMConfig::builder();
        llmConfig->maxToken(2048); // 设置最大token数
        
        // 创建带历史记忆的图像理解LLM实例
        SparkChain::Memory* memory = SparkChain::Memory::WindowMemory(3);
        SparkChain::LLM* llm = SparkChain::LLMFactory::imageUnderstanding(llmConfig, memory);
        
        if (!llm) {
            LOG_ERROR("创建图像理解LLM实例失败");
            return nullptr;
        }
        
        LOG_DEBUG("创建图像理解LLM实例成功");
        return llm;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("创建图像理解LLM实例异常: %s", e.what());
        return nullptr;
    }
}

} // namespace sparkchain
