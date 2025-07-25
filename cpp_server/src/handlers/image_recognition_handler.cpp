#include "handlers/image_recognition_handler.h"
#include "utils/json_utils.h"
#include "utils/file_utils.h"
#include "utils/logger.h"

#include <sstream>
#include <algorithm>
#include <cstring>

namespace sparkchain {

ImageRecognitionHandler::ImageRecognitionHandler() {
    image_service_ = std::make_unique<ImageService>();
    image_service_->initialize();
}

void ImageRecognitionHandler::handle_post(const httplib::Request& req, httplib::Response& res) {
    try {
        LOG_INFO("处理图像识别请求");
        
        // 解析请求
        ImageRecognitionRequest image_request = parse_image_request(req);
        
        // 验证请求
        if (!validate_image_request(image_request)) {
            set_error_response(res, "Invalid image recognition request parameters", 400);
            return;
        }
        
        // 调用图像识别服务
        ImageRecognitionResponse image_response = image_service_->recognize_image(image_request);
        
        // 格式化响应
        std::string json_response = format_image_response(image_response);
        set_json_response(res, json_response);
        
        LOG_INFO_F("图像识别完成, 成功: %s, 检测到人脸数: %zu", 
                  image_response.success ? "是" : "否", image_response.faces.size());
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("图像识别处理异常: %s", e.what());
        set_error_response(res, "Image recognition processing failed", 500);
    }
}

ImageRecognitionRequest ImageRecognitionHandler::parse_image_request(const httplib::Request& req) {
    ImageRecognitionRequest request;
    
    // 获取图像数据 - 支持两种方式：multipart form 或 base64 参数
    if (req.form.has_file("image")) {
        // 方式1: 文件上传
        auto image_files = req.form.get_files("image");
        if (!image_files.empty()) {
            const auto& image_file = image_files[0];
            
            // 将二进制数据转换为base64
            request.image_data = encode_base64(image_file.content);
            request.format = FileUtils::get_file_extension(image_file.filename);
            if (request.format.empty()) {
                request.format = "jpg"; // 默认格式
            }
        }
    } else {
        // 方式2: base64编码的图像数据
        request.image_data = get_param(req, "image_data");
        request.format = get_param(req, "format", "jpg");
    }
    
    if (request.image_data.empty()) {
        throw std::runtime_error("No image data provided");
    }
    
    // 获取其他参数
    request.detect_faces = get_param(req, "detect_faces", "true") == "true";
    request.analyze_emotion = get_param(req, "analyze_emotion", "true") == "true";
    request.analyze_micro_expression = get_param(req, "analyze_micro_expression", "false") == "true";
    request.analysis_mode = get_param(req, "analysis_mode", "interview");
    
    LOG_DEBUG_F("解析图像识别请求: 格式=%s, 检测人脸=%s, 分析情绪=%s, 分析模式=%s", 
               request.format.c_str(), 
               request.detect_faces ? "是" : "否",
               request.analyze_emotion ? "是" : "否",
               request.analysis_mode.c_str());
    
    return request;
}

std::string ImageRecognitionHandler::format_image_response(const ImageRecognitionResponse& response) {
    std::ostringstream json;
    json << "{"
         << "\"success\":" << (response.success ? "true" : "false");
    
    if (response.success) {
        json << ",\"image_width\":" << response.image_width
             << ",\"image_height\":" << response.image_height
             << ",\"image_format\":\"" << JsonUtils::escape_json_string(response.image_format) << "\"";
        
        // 人脸检测结果
        json << ",\"faces\":[";
        for (size_t i = 0; i < response.faces.size(); ++i) {
            if (i > 0) json << ",";
            const auto& face = response.faces[i];
            json << "{"
                 << "\"x\":" << face.x
                 << ",\"y\":" << face.y
                 << ",\"width\":" << face.width
                 << ",\"height\":" << face.height
                 << ",\"confidence\":" << face.confidence
                 << ",\"gender\":\"" << face.gender << "\""
                 << ",\"age\":" << face.age
                 << ",\"emotion\":\"" << face.emotion << "\""
                 << ",\"emotion_score\":" << face.emotion_score
                 << "}";
        }
        json << "]";
        
        // 微表情分析结果
        json << ",\"micro_expressions\":[";
        for (size_t i = 0; i < response.micro_expressions.size(); ++i) {
            if (i > 0) json << ",";
            const auto& expr = response.micro_expressions[i];
            json << "{"
                 << "\"expression\":\"" << JsonUtils::escape_json_string(expr.expression) << "\""
                 << ",\"intensity\":" << expr.intensity
                 << ",\"duration\":" << expr.duration
                 << ",\"description\":\"" << JsonUtils::escape_json_string(expr.description) << "\""
                 << "}";
        }
        json << "]";
        
        // 面试分析结果
        const auto& analysis = response.interview_analysis;
        json << ",\"interview_analysis\":{"
             << "\"attention_score\":" << analysis.attention_score
             << ",\"confidence_score\":" << analysis.confidence_score
             << ",\"stress_level\":" << analysis.stress_level
             << ",\"engagement_score\":" << analysis.engagement_score
             << ",\"overall_impression\":\"" << JsonUtils::escape_json_string(analysis.overall_impression) << "\""
             << ",\"suggestions\":[";
        
        for (size_t i = 0; i < analysis.suggestions.size(); ++i) {
            if (i > 0) json << ",";
            json << "\"" << JsonUtils::escape_json_string(analysis.suggestions[i]) << "\"";
        }
        json << "]}";
    }
    
    if (!response.error.empty()) {
        json << ",\"error\":\"" << JsonUtils::escape_json_string(response.error) << "\"";
    }
    
    json << "}";
    return json.str();
}

bool ImageRecognitionHandler::validate_image_request(const ImageRecognitionRequest& request) {
    // 检查图像数据
    if (request.image_data.empty()) {
        LOG_WARN("图像识别请求验证失败: 图像数据为空");
        return false;
    }
    
    // 检查图像数据大小限制 (最大5MB)
    if (request.image_data.size() > 5 * 1024 * 1024) {
        LOG_WARN("图像识别请求验证失败: 图像数据过大");
        return false;
    }
    
    // 检查支持的图像格式
    if (!is_valid_image_format(request.format)) {
        LOG_WARN_F("图像识别请求验证失败: 不支持的图像格式 %s", request.format.c_str());
        return false;
    }
    
    // 检查分析模式
    if (request.analysis_mode != "interview" && 
        request.analysis_mode != "general" && 
        request.analysis_mode != "emotion") {
        LOG_WARN_F("图像识别请求验证失败: 不支持的分析模式 %s", request.analysis_mode.c_str());
        return false;
    }
    
    return true;
}

std::string ImageRecognitionHandler::decode_base64_image(const std::string& base64_data) {
    // 简化的base64解码实现
    // 实际项目中应该使用专业的base64库
    return base64_data; // 暂时返回原数据
}

bool ImageRecognitionHandler::is_valid_image_format(const std::string& format) {
    std::vector<std::string> supported_formats = {"jpg", "jpeg", "png", "bmp", "webp"};
    
    std::string lower_format = format;
    std::transform(lower_format.begin(), lower_format.end(), lower_format.begin(), ::tolower);
    
    return std::find(supported_formats.begin(), supported_formats.end(), lower_format) != supported_formats.end();
}

// 简化的base64编码实现
std::string ImageRecognitionHandler::encode_base64(const std::string& binary_data) {
    // 这里应该实现真正的base64编码
    // 为了简化，暂时返回模拟数据
    return "base64_encoded_image_data_simulation";
}

} // namespace sparkchain
