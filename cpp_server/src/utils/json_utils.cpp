#include "utils/json_utils.h"
#include "utils/logger.h"

#include <sstream>
#include <algorithm>

namespace sparkchain {

std::string JsonUtils::serialize(const std::unordered_map<std::string, std::string>& data) {
    std::ostringstream json;
    json << "{";
    
    bool first = true;
    for (const auto& pair : data) {
        if (!first) {
            json << ",";
        }
        json << "\"" << escape_json_string(pair.first) << "\":"
             << "\"" << escape_json_string(pair.second) << "\"";
        first = false;
    }
    
    json << "}";
    return json.str();
}

std::unordered_map<std::string, std::string> JsonUtils::deserialize(const std::string& json) {
    std::unordered_map<std::string, std::string> result;
    
    // 简单的JSON解析实现
    // 实际生产环境中建议使用更成熟的JSON库如nlohmann/json
    
    std::string trimmed = json;
    trimmed.erase(0, trimmed.find_first_not_of(" \t\n\r"));
    trimmed.erase(trimmed.find_last_not_of(" \t\n\r") + 1);
    
    if (trimmed.empty() || trimmed[0] != '{' || trimmed.back() != '}') {
        LOG_WARN("Invalid JSON format");
        return result;
    }
    
    // 移除大括号
    trimmed = trimmed.substr(1, trimmed.length() - 2);
    
    // 简单解析键值对（仅支持字符串值）
    size_t pos = 0;
    while (pos < trimmed.length()) {
        // 跳过空白字符
        while (pos < trimmed.length() && std::isspace(trimmed[pos])) {
            pos++;
        }
        
        if (pos >= trimmed.length()) break;
        
        // 查找键
        if (trimmed[pos] != '"') break;
        pos++; // 跳过开始引号
        
        size_t key_start = pos;
        while (pos < trimmed.length() && trimmed[pos] != '"') {
            if (trimmed[pos] == '\\') pos++; // 跳过转义字符
            pos++;
        }
        
        if (pos >= trimmed.length()) break;
        
        std::string key = trimmed.substr(key_start, pos - key_start);
        pos++; // 跳过结束引号
        
        // 跳过冒号
        while (pos < trimmed.length() && (std::isspace(trimmed[pos]) || trimmed[pos] == ':')) {
            pos++;
        }
        
        if (pos >= trimmed.length() || trimmed[pos] != '"') break;
        pos++; // 跳过开始引号
        
        // 查找值
        size_t value_start = pos;
        while (pos < trimmed.length() && trimmed[pos] != '"') {
            if (trimmed[pos] == '\\') pos++; // 跳过转义字符
            pos++;
        }
        
        if (pos >= trimmed.length()) break;
        
        std::string value = trimmed.substr(value_start, pos - value_start);
        pos++; // 跳过结束引号
        
        result[unescape_special_chars(key)] = unescape_special_chars(value);
        
        // 跳过逗号
        while (pos < trimmed.length() && (std::isspace(trimmed[pos]) || trimmed[pos] == ',')) {
            pos++;
        }
    }
    
    return result;
}

std::string JsonUtils::create_error_response(const std::string& error, const std::string& code) {
    std::ostringstream json;
    json << "{"
         << "\"success\":false,"
         << "\"error\":\"" << escape_json_string(error) << "\","
         << "\"code\":\"" << escape_json_string(code) << "\""
         << "}";
    return json.str();
}

std::string JsonUtils::create_success_response(const std::string& data) {
    std::ostringstream json;
    json << "{"
         << "\"success\":true";
    
    if (!data.empty()) {
        json << ",\"data\":" << data;
    }
    
    json << "}";
    return json.str();
}

std::string JsonUtils::escape_json_string(const std::string& str) {
    return escape_special_chars(str);
}

std::string JsonUtils::extract_field(const std::string& json, const std::string& field) {
    // 简单的字段提取
    std::string search_pattern = "\"" + field + "\":\"";
    size_t start = json.find(search_pattern);
    
    if (start == std::string::npos) {
        return "";
    }
    
    start += search_pattern.length();
    size_t end = json.find("\"", start);
    
    if (end == std::string::npos) {
        return "";
    }
    
    return unescape_special_chars(json.substr(start, end - start));
}

bool JsonUtils::validate_json(const std::string& json) {
    // 简单的JSON验证
    std::string trimmed = json;
    trimmed.erase(0, trimmed.find_first_not_of(" \t\n\r"));
    trimmed.erase(trimmed.find_last_not_of(" \t\n\r") + 1);
    
    if (trimmed.empty()) {
        return false;
    }
    
    // 检查是否以 { 开始，} 结束
    if (trimmed[0] == '{' && trimmed.back() == '}') {
        return true;
    }
    
    // 检查是否以 [ 开始，] 结束
    if (trimmed[0] == '[' && trimmed.back() == ']') {
        return true;
    }
    
    return false;
}

std::string JsonUtils::format_json(const std::string& json, bool pretty) {
    if (!pretty) {
        return json;
    }
    
    // 简单的JSON格式化（添加缩进和换行）
    std::string formatted;
    int indent_level = 0;
    bool in_string = false;
    
    for (size_t i = 0; i < json.length(); i++) {
        char c = json[i];
        
        if (c == '"' && (i == 0 || json[i-1] != '\\')) {
            in_string = !in_string;
        }
        
        if (!in_string) {
            if (c == '{' || c == '[') {
                formatted += c;
                formatted += '\n';
                indent_level++;
                formatted += std::string(indent_level * 2, ' ');
            } else if (c == '}' || c == ']') {
                formatted += '\n';
                indent_level--;
                formatted += std::string(indent_level * 2, ' ');
                formatted += c;
            } else if (c == ',') {
                formatted += c;
                formatted += '\n';
                formatted += std::string(indent_level * 2, ' ');
            } else if (c == ':') {
                formatted += c;
                formatted += ' ';
            } else if (!std::isspace(c)) {
                formatted += c;
            }
        } else {
            formatted += c;
        }
    }
    
    return formatted;
}

std::string JsonUtils::escape_special_chars(const std::string& str) {
    std::string escaped;
    escaped.reserve(str.length() * 2);
    
    for (char c : str) {
        switch (c) {
            case '"':  escaped += "\\\""; break;
            case '\\': escaped += "\\\\"; break;
            case '\b': escaped += "\\b";  break;
            case '\f': escaped += "\\f";  break;
            case '\n': escaped += "\\n";  break;
            case '\r': escaped += "\\r";  break;
            case '\t': escaped += "\\t";  break;
            default:   escaped += c;      break;
        }
    }
    
    return escaped;
}

std::string JsonUtils::unescape_special_chars(const std::string& str) {
    std::string unescaped;
    unescaped.reserve(str.length());
    
    for (size_t i = 0; i < str.length(); i++) {
        if (str[i] == '\\' && i + 1 < str.length()) {
            switch (str[i + 1]) {
                case '"':  unescaped += '"';  i++; break;
                case '\\': unescaped += '\\'; i++; break;
                case 'b':  unescaped += '\b'; i++; break;
                case 'f':  unescaped += '\f'; i++; break;
                case 'n':  unescaped += '\n'; i++; break;
                case 'r':  unescaped += '\r'; i++; break;
                case 't':  unescaped += '\t'; i++; break;
                default:   unescaped += str[i]; break;
            }
        } else {
            unescaped += str[i];
        }
    }
    
    return unescaped;
}

} // namespace sparkchain
