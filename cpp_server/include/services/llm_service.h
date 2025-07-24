#pragma once

#include <string>
#include <memory>
#include <unordered_map>
#include <vector>
#include <mutex>
#include "common/types.h"

namespace sparkchain {

class LlmService {
public:
    LlmService();
    ~LlmService();
    
    // 对话接口
    LlmResponse chat(const LlmRequest& request);
    
    // 初始化LLM引擎
    bool initialize();
    
    // 释放资源
    void cleanup();
    
    // 设置模型配置
    void set_model_config(const std::string& model_name, 
                         const std::string& config_path);

private:
    // 内部实现方法
    LlmResponse process_chat_request(const std::string& question, 
                                   const std::string& chat_id);
    
    // 会话管理
    void save_chat_history(const std::string& chat_id, 
                          const std::string& question,
                          const std::string& answer);
    
    std::vector<std::pair<std::string, std::string>> 
    get_chat_history(const std::string& chat_id);
    
    // 文本预处理
    std::string preprocess_question(const std::string& question);
    
    // 结果后处理
    std::string postprocess_answer(const std::string& answer);
    
    // 生成唯一的会话ID
    std::string generate_chat_id();

private:
    bool is_initialized_;
    std::string model_path_;
    std::string config_path_;
    
    // 会话历史存储 (chat_id -> history)
    std::unordered_map<std::string, 
        std::vector<std::pair<std::string, std::string>>> chat_histories_;
    
    // 模型配置
    std::unordered_map<std::string, std::string> model_configs_;
    
    // 互斥锁保护共享资源
    mutable std::mutex history_mutex_;
};

} // namespace sparkchain
