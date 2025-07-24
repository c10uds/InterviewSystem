#pragma once

#include <string>
#include <functional>
#include "../third_party/httplib.h"
#include "common/types.h"

namespace sparkchain {

class BaseHandler {
public:
    virtual ~BaseHandler() = default;
    
    // 处理GET请求
    virtual void handle_get(const httplib::Request& req, httplib::Response& res) {
        res.status = 405; // Method Not Allowed
        res.set_content("{\"error\":\"Method not allowed\"}", "application/json");
    }
    
    // 处理POST请求
    virtual void handle_post(const httplib::Request& req, httplib::Response& res) {
        res.status = 405; // Method Not Allowed
        res.set_content("{\"error\":\"Method not allowed\"}", "application/json");
    }
    
    // 处理PUT请求
    virtual void handle_put(const httplib::Request& req, httplib::Response& res) {
        res.status = 405; // Method Not Allowed
        res.set_content("{\"error\":\"Method not allowed\"}", "application/json");
    }
    
    // 处理DELETE请求
    virtual void handle_delete(const httplib::Request& req, httplib::Response& res) {
        res.status = 405; // Method Not Allowed
        res.set_content("{\"error\":\"Method not allowed\"}", "application/json");
    }

protected:
    // 工具方法
    std::string get_param(const httplib::Request& req, const std::string& key, 
                         const std::string& default_value = "");
    
    void set_json_response(httplib::Response& res, const std::string& json, 
                          int status_code = 200);
    
    void set_error_response(httplib::Response& res, const std::string& error, 
                           int status_code = 400);
    
    bool validate_request(const httplib::Request& req, httplib::Response& res);
};

} // namespace sparkchain
