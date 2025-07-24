#include "handlers/llm_handler.h"
#include "utils/json_utils.h"
#include "utils/logger.h"

#include <sstream>

namespace sparkchain {

LlmHandler::LlmHandler() {
    llm_service_ = std::make_unique<LlmService>();
    llm_service_->initialize();
}

void LlmHandler::handle_post(const httplib::Request& req, httplib::Response& res) {
    try {
        LOG_INFO("处理LLM对话请求");
        
        // 解析请求
        LlmRequest llm_request = parse_llm_request(req);
        
        // 验证请求
        if (!validate_llm_request(llm_request)) {
            set_error_response(res, "Invalid LLM request parameters", 400);
            return;
        }
        
        // 调用LLM服务
        LlmResponse llm_response = llm_service_->chat(llm_request);
        
        // 格式化响应
        std::string json_response = format_llm_response(llm_response);
        set_json_response(res, json_response);
        
        LOG_INFO_F("LLM对话完成, 成功: %s, 会话ID: %s", 
                  llm_response.success ? "是" : "否", llm_response.chat_id.c_str());
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("LLM对话处理异常: %s", e.what());
        set_error_response(res, "LLM processing failed", 500);
    }
}

LlmRequest LlmHandler::parse_llm_request(const httplib::Request& req) {
    LlmRequest request;
    
    // 获取问题参数
    request.question = get_param(req, "question");
    if (request.question.empty()) {
        throw std::runtime_error("No question provided for LLM");
    }
    
    // 获取会话ID参数（可选）
    request.chat_id = get_param(req, "chat_id", "");
    
    // 获取模型参数（可选）
    request.model = get_param(req, "model", "spark");
    
    LOG_DEBUG_F("解析LLM请求: 问题长度=%zu, 会话ID=%s, 模型=%s", 
               request.question.length(), request.chat_id.c_str(), request.model.c_str());
    
    return request;
}

std::string LlmHandler::format_llm_response(const LlmResponse& response) {
    std::ostringstream json;
    json << "{"
         << "\"success\":" << (response.success ? "true" : "false");
    
    if (response.success) {
        json << ",\"answer\":\"" << JsonUtils::escape_json_string(response.answer) << "\""
             << ",\"chat_id\":\"" << response.chat_id << "\"";
    }
    
    if (!response.error.empty()) {
        json << ",\"error\":\"" << JsonUtils::escape_json_string(response.error) << "\"";
    }
    
    json << "}";
    return json.str();
}

bool LlmHandler::validate_llm_request(const LlmRequest& request) {
    // 检查问题内容
    if (request.question.empty()) {
        LOG_WARN("LLM请求验证失败: 问题为空");
        return false;
    }
    
    // 检查问题长度限制 (最大2000字符)
    if (request.question.length() > 2000) {
        LOG_WARN("LLM请求验证失败: 问题过长");
        return false;
    }
    
    // 检查支持的模型
    std::vector<std::string> supported_models = {
        "spark", "gpt", "claude", "llama"
    };
    
    bool model_supported = false;
    for (const auto& model : supported_models) {
        if (request.model == model) {
            model_supported = true;
            break;
        }
    }
    
    if (!model_supported) {
        LOG_WARN_F("LLM请求验证失败: 不支持的模型 %s", request.model.c_str());
        return false;
    }
    
    // 检查会话ID格式（如果提供的话）
    if (!request.chat_id.empty()) {
        if (request.chat_id.length() > 100) {
            LOG_WARN("LLM请求验证失败: 会话ID过长");
            return false;
        }
    }
    
    return true;
}

} // namespace sparkchain
