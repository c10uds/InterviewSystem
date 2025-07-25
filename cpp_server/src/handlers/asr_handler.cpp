#include "handlers/asr_handler.h"
#include "utils/json_utils.h"
#include "utils/file_utils.h"
#include "utils/logger.h"

#include <sstream>

namespace sparkchain {

AsrHandler::AsrHandler() {
    audio_service_ = std::make_unique<AudioService>();
    audio_service_->initialize();
}

void AsrHandler::handle_post(const httplib::Request& req, httplib::Response& res) {
    try {
        LOG_INFO("处理语音识别请求");
        
        // 解析请求
        AsrRequest asr_request = parse_asr_request(req);
        
        // 验证请求
        if (!validate_asr_request(asr_request)) {
            set_error_response(res, "Invalid ASR request parameters", 400);
            return;
        }
        
        // 调用语音识别服务
        AsrResponse asr_response = audio_service_->speech_to_text(asr_request);
        
        // 格式化响应
        std::string json_response = format_asr_response(asr_response);
        set_json_response(res, json_response);
        
        LOG_INFO_F("语音识别完成, 成功: %s", asr_response.success ? "是" : "否");
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("语音识别处理异常: %s", e.what());
        set_error_response(res, "ASR processing failed", 500);
    }
}

AsrRequest AsrHandler::parse_asr_request(const httplib::Request& req) {
    AsrRequest request;
    
    // 获取语言参数
    request.language = get_param(req, "language", "zh_cn");
    
    // 处理上传的音频文件
    if (!req.form.has_file("audio")) {
        throw std::runtime_error("No audio file provided");
    }
    
    auto audio_files = req.form.get_files("audio");
    if (audio_files.empty()) {
        throw std::runtime_error("No audio file provided");
    }
    
    const auto& audio_file = audio_files[0];
    request.audio_data = audio_file.content;
    request.format = FileUtils::get_file_extension(audio_file.filename);
    
    LOG_DEBUG_F("解析ASR请求: 语言=%s, 格式=%s, 大小=%zu bytes", 
               request.language.c_str(), request.format.c_str(), request.audio_data.size());
    
    return request;
}

std::string AsrHandler::format_asr_response(const AsrResponse& response) {
    std::ostringstream json;
    json << "{"
         << "\"success\":" << (response.success ? "true" : "false") << ","
         << "\"text\":\"" << JsonUtils::escape_json_string(response.text) << "\","
         << "\"confidence\":" << response.confidence;
    
    if (!response.error.empty()) {
        json << ",\"error\":\"" << JsonUtils::escape_json_string(response.error) << "\"";
    }
    
    json << "}";
    return json.str();
}

bool AsrHandler::validate_asr_request(const AsrRequest& request) {
    // 检查音频数据
    if (request.audio_data.empty()) {
        LOG_WARN("ASR请求验证失败: 音频数据为空");
        return false;
    }
    
    // 检查音频大小限制 (最大10MB)
    if (request.audio_data.size() > 10 * 1024 * 1024) {
        LOG_WARN("ASR请求验证失败: 音频文件过大");
        return false;
    }
    
    // 检查支持的语言
    if (request.language != "zh_cn" && request.language != "en_us") {
        LOG_WARN_F("ASR请求验证失败: 不支持的语言 %s", request.language.c_str());
        return false;
    }
    
    // 检查支持的音频格式
    if (request.format != "wav" && request.format != "mp3" && request.format != "m4a" && request.format != "pcm") {
        LOG_WARN_F("ASR请求验证失败: 不支持的音频格式 %s", request.format.c_str());
        return false;
    }
    
    return true;
}

} // namespace sparkchain
