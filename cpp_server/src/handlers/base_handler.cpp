#include "handlers/base_handler.h"
#include "utils/logger.h"

namespace sparkchain {

std::string BaseHandler::get_param(const httplib::Request& req, const std::string& key, 
                                 const std::string& default_value) {
    // 首先检查URL参数
    auto it = req.params.find(key);
    if (it != req.params.end()) {
        return it->second;
    }
    
    // 然后检查表单数据
    auto form_it = req.get_param_value(key.c_str());
    if (!form_it.empty()) {
        return form_it;
    }
    
    return default_value;
}

void BaseHandler::set_json_response(httplib::Response& res, const std::string& json, 
                                   int status_code) {
    res.status = status_code;
    res.set_content(json, "application/json");
    res.set_header("Cache-Control", "no-cache");
}

void BaseHandler::set_error_response(httplib::Response& res, const std::string& error, 
                                    int status_code) {
    std::string json = "{\"error\":\"" + error + "\"}";
    set_json_response(res, json, status_code);
    LOG_WARN_F("错误响应: %s (状态码: %d)", error.c_str(), status_code);
}

bool BaseHandler::validate_request(const httplib::Request& req, httplib::Response& res) {
    // 基础请求验证
    
    // 检查Content-Length限制（最大10MB）
    if (req.body.size() > 10 * 1024 * 1024) {
        set_error_response(res, "Request body too large", 413);
        return false;
    }
    
    // 检查User-Agent
    auto user_agent = req.get_header_value("User-Agent");
    if (user_agent.empty()) {
        LOG_WARN("请求缺少User-Agent头");
    }
    
    return true;
}

} // namespace sparkchain
