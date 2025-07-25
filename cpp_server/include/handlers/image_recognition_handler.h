#pragma once

#include "handlers/base_handler.h"
#include "services/image_service.h"
#include "common/types.h"

namespace sparkchain {

class ImageRecognitionHandler : public BaseHandler {
public:
    ImageRecognitionHandler();
    ~ImageRecognitionHandler() override = default;
    
    void handle_post(const httplib::Request& req, httplib::Response& res) override;
    
private:
    ImageRecognitionRequest parse_image_request(const httplib::Request& req);
    std::string format_image_response(const ImageRecognitionResponse& response);
    bool validate_image_request(const ImageRecognitionRequest& request);
    
    // 辅助方法
    std::string decode_base64_image(const std::string& base64_data);
    std::string encode_base64(const std::string& binary_data);
    bool is_valid_image_format(const std::string& format);
    
private:
    std::unique_ptr<ImageService> image_service_;
};

} // namespace sparkchain
