#include "utils/logger.h"

#include <chrono>
#include <iomanip>
#include <sstream>
#include <iostream>

namespace sparkchain {

Logger& Logger::getInstance() {
    static Logger instance;
    return instance;
}

void Logger::set_level(LogLevel level) {
    current_level_ = level;
}

void Logger::set_log_file(const std::string& filepath) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    
    log_filepath_ = filepath;
    log_file_.reset();
    
    if (!filepath.empty()) {
        log_file_ = std::make_unique<std::ofstream>(filepath, std::ios::app);
        if (!log_file_->is_open()) {
            std::cerr << "Failed to open log file: " << filepath << std::endl;
            log_file_.reset();
        }
    }
}

void Logger::debug(const std::string& message) {
    if (current_level_ <= LogLevel::DEBUG) {
        log(LogLevel::DEBUG, message);
    }
}

void Logger::info(const std::string& message) {
    if (current_level_ <= LogLevel::INFO) {
        log(LogLevel::INFO, message);
    }
}

void Logger::warn(const std::string& message) {
    if (current_level_ <= LogLevel::WARN) {
        log(LogLevel::WARN, message);
    }
}

void Logger::error(const std::string& message) {
    if (current_level_ <= LogLevel::ERROR) {
        log(LogLevel::ERROR, message);
    }
}

void Logger::log(LogLevel level, const std::string& message) {
    std::lock_guard<std::mutex> lock(log_mutex_);
    
    std::string log_entry = format_log_entry(level, message);
    
    // 输出到控制台
    if (level >= LogLevel::WARN) {
        std::cerr << log_entry << std::endl;
    } else {
        std::cout << log_entry << std::endl;
    }
    
    // 输出到文件
    if (log_file_ && log_file_->is_open()) {
        *log_file_ << log_entry << std::endl;
        log_file_->flush();
    }
}

std::string Logger::format_log_entry(LogLevel level, const std::string& message) {
    std::ostringstream oss;
    
    // 添加时间戳
    oss << "[" << get_timestamp() << "] ";
    
    // 添加日志级别
    oss << "[" << level_to_string(level) << "] ";
    
    // 添加消息
    oss << message;
    
    return oss.str();
}

std::string Logger::get_timestamp() {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()) % 1000;
    
    std::ostringstream oss;
    oss << std::put_time(std::localtime(&time_t), "%Y-%m-%d %H:%M:%S");
    oss << '.' << std::setfill('0') << std::setw(3) << ms.count();
    
    return oss.str();
}

std::string Logger::level_to_string(LogLevel level) {
    switch (level) {
        case LogLevel::DEBUG: return "DEBUG";
        case LogLevel::INFO:  return "INFO ";
        case LogLevel::WARN:  return "WARN ";
        case LogLevel::ERROR: return "ERROR";
        default:              return "UNKNOWN";
    }
}

// 显式实例化模板函数
template void Logger::debug<>(const std::string&);
template void Logger::info<>(const std::string&);
template void Logger::warn<>(const std::string&);
template void Logger::error<>(const std::string&);

template void Logger::debug<const char*>(const std::string&, const char*);
template void Logger::info<const char*>(const std::string&, const char*);
template void Logger::warn<const char*>(const std::string&, const char*);
template void Logger::error<const char*>(const std::string&, const char*);

template void Logger::debug<int>(const std::string&, int);
template void Logger::info<int>(const std::string&, int);
template void Logger::warn<int>(const std::string&, int);
template void Logger::error<int>(const std::string&, int);

template void Logger::debug<size_t>(const std::string&, size_t);
template void Logger::info<size_t>(const std::string&, size_t);
template void Logger::warn<size_t>(const std::string&, size_t);
template void Logger::error<size_t>(const std::string&, size_t);

template void Logger::debug<double>(const std::string&, double);
template void Logger::info<double>(const std::string&, double);
template void Logger::warn<double>(const std::string&, double);
template void Logger::error<double>(const std::string&, double);

} // namespace sparkchain
