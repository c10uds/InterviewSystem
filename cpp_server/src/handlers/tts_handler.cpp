#include "handlers/tts_handler.h"
#include "utils/json_utils.h"
#include "utils/file_utils.h"
#include "utils/logger.h"

#include <sstream>

namespace sparkchain {

TtsHandler::TtsHandler() {
    audio_service_ = std::make_unique<AudioService>();
    audio_service_->initialize();
}

void TtsHandler::handle_post(const httplib::Request& req, httplib::Response& res) {
    try {
        LOG_INFO("处理语音合成请求");
        
        // 解析请求
        TtsRequest tts_request = parse_tts_request(req);
        
        // 验证请求
        if (!validate_tts_request(tts_request)) {
            set_error_response(res, "Invalid TTS request parameters", 400);
            return;
        }
        
        // 调用语音合成服务
        TtsResponse tts_response = audio_service_->text_to_speech(tts_request);
        
        // 格式化响应
        std::string json_response = format_tts_response(tts_response);
        set_json_response(res, json_response);
        
        LOG_INFO_F("语音合成完成, 成功: %s", tts_response.success ? "是" : "否");
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("语音合成处理异常: %s", e.what());
        set_error_response(res, "TTS processing failed", 500);
    }
}

TtsRequest TtsHandler::parse_tts_request(const httplib::Request& req) {
    TtsRequest request;
    
    // 获取文本参数
    request.text = get_param(req, "text");
    if (request.text.empty()) {
        throw std::runtime_error("No text provided for TTS");
    }
    
    // 获取发音人参数
    request.voice = get_param(req, "voice", "xiaoyan");
    
    // 获取输出格式参数
    request.format = get_param(req, "format", "wav");
    
    LOG_DEBUG_F("解析TTS请求: 文本长度=%zu, 发音人=%s, 格式=%s", 
               request.text.length(), request.voice.c_str(), request.format.c_str());
    
    return request;
}

std::string TtsHandler::format_tts_response(const TtsResponse& response) {
    std::ostringstream json;
    json << "{"
         << "\"success\":" << (response.success ? "true" : "false");
    
    if (response.success) {
        json << ",\"audio_url\":\"" << JsonUtils::escape_json_string(response.audio_url) << "\""
             << ",\"audio_size\":" << response.audio_size;
    }
    
    if (!response.error.empty()) {
        json << ",\"error\":\"" << JsonUtils::escape_json_string(response.error) << "\"";
    }
    
    json << "}";
    return json.str();
}

bool TtsHandler::validate_tts_request(const TtsRequest& request) {
    // 检查文本内容
    if (request.text.empty()) {
        LOG_WARN("TTS请求验证失败: 文本为空");
        return false;
    }
    
    // 检查文本长度限制 (最大1000字符)
    if (request.text.length() > 1000) {
        LOG_WARN("TTS请求验证失败: 文本过长");
        return false;
    }
    
    // 检查支持的发音人
    std::vector<std::string> supported_voices = {
        "xiaoyan", "xiaofeng", "xiaodong", "xiaoyun"
    };
    
    bool voice_supported = false;
    for (const auto& voice : supported_voices) {
        if (request.voice == voice) {
            voice_supported = true;
            break;
        }
    }
    
    if (!voice_supported) {
        LOG_WARN_F("TTS请求验证失败: 不支持的发音人 %s", request.voice.c_str());
        return false;
    }
    
    // 检查支持的输出格式
    if (request.format != "wav" && request.format != "mp3") {
        LOG_WARN_F("TTS请求验证失败: 不支持的输出格式 %s", request.format.c_str());
        return false;
    }
    
    return true;
}

} // namespace sparkchain
