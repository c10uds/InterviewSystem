#pragma once

#include "handlers/base_handler.h"
#include "services/audio_service.h"
#include "common/types.h"

namespace sparkchain {

class AsrHandler : public BaseHandler {
public:
    AsrHandler();
    ~AsrHandler() override = default;
    
    void handle_post(const httplib::Request& req, httplib::Response& res) override;
    
private:
    AsrRequest parse_asr_request(const httplib::Request& req);
    std::string format_asr_response(const AsrResponse& response);
    bool validate_asr_request(const AsrRequest& request);
    
private:
    std::unique_ptr<AudioService> audio_service_;
};

} // namespace sparkchain
