#pragma once

#include "handlers/base_handler.h"
#include "services/audio_service.h"
#include "common/types.h"

namespace sparkchain {

class TtsHandler : public BaseHandler {
public:
    TtsHandler();
    ~TtsHandler() override = default;
    
    void handle_post(const httplib::Request& req, httplib::Response& res) override;
    
private:
    TtsRequest parse_tts_request(const httplib::Request& req);
    std::string format_tts_response(const TtsResponse& response);
    bool validate_tts_request(const TtsRequest& request);
    
private:
    std::unique_ptr<AudioService> audio_service_;
};

} // namespace sparkchain
