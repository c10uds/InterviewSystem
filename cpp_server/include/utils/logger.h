#pragma once

#include <string>
#include <memory>
#include <fstream>
#include <mutex>
#include <cstdio>

namespace sparkchain {

enum class LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
};

class Logger {
public:
    static Logger& getInstance();
    
    // 设置日志级别
    void set_level(LogLevel level);
    
    // 设置日志文件
    void set_log_file(const std::string& filepath);
    
    // 日志输出方法
    void debug(const std::string& message);
    void info(const std::string& message);
    void warn(const std::string& message);
    void error(const std::string& message);
    
    // 格式化日志输出
    template<typename... Args>
    void debug(const std::string& format, Args... args) {
        char buffer[1024];
        snprintf(buffer, sizeof(buffer), format.c_str(), args...);
        debug(std::string(buffer));
    }
    
    template<typename... Args>
    void info(const std::string& format, Args... args) {
        char buffer[1024];
        snprintf(buffer, sizeof(buffer), format.c_str(), args...);
        info(std::string(buffer));
    }
    
    template<typename... Args>
    void warn(const std::string& format, Args... args) {
        char buffer[1024];
        snprintf(buffer, sizeof(buffer), format.c_str(), args...);
        warn(std::string(buffer));
    }
    
    template<typename... Args>
    void error(const std::string& format, Args... args) {
        char buffer[1024];
        snprintf(buffer, sizeof(buffer), format.c_str(), args...);
        error(std::string(buffer));
    }

private:
    Logger() = default;
    ~Logger() = default;
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
    
    void log(LogLevel level, const std::string& message);
    std::string format_log_entry(LogLevel level, const std::string& message);
    std::string get_timestamp();
    std::string level_to_string(LogLevel level);

private:
    LogLevel current_level_ = LogLevel::INFO;
    std::unique_ptr<std::ofstream> log_file_;
    std::string log_filepath_;
    mutable std::mutex log_mutex_;
};

// 便捷宏定义
#define LOG_DEBUG(msg) Logger::getInstance().debug(msg)
#define LOG_INFO(msg) Logger::getInstance().info(msg)
#define LOG_WARN(msg) Logger::getInstance().warn(msg)
#define LOG_ERROR(msg) Logger::getInstance().error(msg)

#define LOG_DEBUG_F(fmt, ...) Logger::getInstance().debug(fmt, __VA_ARGS__)
#define LOG_INFO_F(fmt, ...) Logger::getInstance().info(fmt, __VA_ARGS__)
#define LOG_WARN_F(fmt, ...) Logger::getInstance().warn(fmt, __VA_ARGS__)
#define LOG_ERROR_F(fmt, ...) Logger::getInstance().error(fmt, __VA_ARGS__)

} // namespace sparkchain
