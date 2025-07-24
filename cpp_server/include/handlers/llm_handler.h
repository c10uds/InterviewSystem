#pragma once

#include "handlers/base_handler.h"
#include "services/llm_service.h"
#include "common/types.h"

namespace sparkchain {

class LlmHandler : public BaseHandler {
public:
    LlmHandler();
    ~LlmHandler() override = default;
    
    void handle_post(const httplib::Request& req, httplib::Response& res) override;
    
private:
    LlmRequest parse_llm_request(const httplib::Request& req);
    std::string format_llm_response(const LlmResponse& response);
    bool validate_llm_request(const LlmRequest& request);
    
private:
    std::unique_ptr<LlmService> llm_service_;
};

} // namespace sparkchain
