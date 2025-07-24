#pragma once

#include "handlers/base_handler.h"
#include "common/types.h"

namespace sparkchain {

class HealthHandler : public BaseHandler {
public:
    HealthHandler();
    ~HealthHandler() override = default;
    
    void handle_get(const httplib::Request& req, httplib::Response& res) override;
    
private:
    HealthResponse get_health_status();
    std::string format_uptime(std::chrono::steady_clock::time_point start_time);
    
private:
    std::chrono::steady_clock::time_point server_start_time_;
};

} // namespace sparkchain
