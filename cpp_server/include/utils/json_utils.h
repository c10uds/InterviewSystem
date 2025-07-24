#pragma once

#include <string>
#include <unordered_map>

namespace sparkchain {

class JsonUtils {
public:
    // JSON序列化
    static std::string serialize(const std::unordered_map<std::string, std::string>& data);
    
    // JSON反序列化
    static std::unordered_map<std::string, std::string> deserialize(const std::string& json);
    
    // 创建错误响应JSON
    static std::string create_error_response(const std::string& error, 
                                           const std::string& code = "400");
    
    // 创建成功响应JSON
    static std::string create_success_response(const std::string& data = "");
    
    // 转义JSON字符串
    static std::string escape_json_string(const std::string& str);
    
    // 解析JSON字符串中的特定字段
    static std::string extract_field(const std::string& json, const std::string& field);
    
    // 验证JSON格式
    static bool validate_json(const std::string& json);
    
    // 格式化JSON字符串
    static std::string format_json(const std::string& json, bool pretty = false);

private:
    // 内部辅助方法
    static std::string escape_special_chars(const std::string& str);
    static std::string unescape_special_chars(const std::string& str);
};

} // namespace sparkchain
