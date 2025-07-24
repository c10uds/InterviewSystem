#include "handlers/health_handler.h"
#include "utils/json_utils.h"
#include "utils/logger.h"

#include <chrono>
#include <iomanip>
#include <sstream>

namespace sparkchain {

HealthHandler::HealthHandler() 
    : server_start_time_(std::chrono::steady_clock::now()) {
}

void HealthHandler::handle_get(const httplib::Request& req, httplib::Response& res) {
    try {
        HealthResponse health = get_health_status();
        
        // 构建JSON响应
        std::ostringstream json;
        json << "{"
             << "\"status\":\"" << health.status << "\","
             << "\"version\":\"" << health.version << "\","
             << "\"timestamp\":\"" << health.timestamp << "\","
             << "\"uptime\":\"" << health.uptime << "\""
             << "}";
        
        set_json_response(res, json.str());
        LOG_DEBUG("健康检查请求处理完成");
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("健康检查处理异常: %s", e.what());
        set_error_response(res, "Health check failed", 500);
    }
}

HealthResponse HealthHandler::get_health_status() {
    HealthResponse response;
    
    response.status = "ok";
    response.version = "1.0.0";
    
    // 获取当前时间戳
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    std::ostringstream oss;
    oss << std::put_time(std::localtime(&time_t), "%Y-%m-%d %H:%M:%S");
    response.timestamp = oss.str();
    
    // 计算运行时间
    response.uptime = format_uptime(server_start_time_);
    
    return response;
}

std::string HealthHandler::format_uptime(std::chrono::steady_clock::time_point start_time) {
    auto now = std::chrono::steady_clock::now();
    auto duration = now - start_time;
    
    auto hours = std::chrono::duration_cast<std::chrono::hours>(duration);
    auto minutes = std::chrono::duration_cast<std::chrono::minutes>(duration - hours);
    auto seconds = std::chrono::duration_cast<std::chrono::seconds>(duration - hours - minutes);
    
    std::ostringstream oss;
    oss << hours.count() << "h " 
        << minutes.count() << "m " 
        << seconds.count() << "s";
    
    return oss.str();
}

} // namespace sparkchain
