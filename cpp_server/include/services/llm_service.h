#pragma once

#include <string>
#include <memory>
#include <unordered_map>
#include <vector>
#include <mutex>
#include <atomic>
#include "common/types.h"

// 前向声明SparkChain类，避免头文件依赖
namespace SparkChain {
    class LLM;
    class LLMConfig;
    class Memory;
    class LLMCallbacks;
    class LLMResult;
    class LLMEvent;
    class LLMError;
}

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
    
    // SparkChain SDK相关方法
    bool init_sparkchain_sdk();
    void cleanup_sparkchain_sdk();
    SparkChain::LLM* create_llm_instance(const std::string& model = "4.0Ultra");
    
    // SDK配置参数
    static const char* APPID;
    static const char* APIKEY;
    static const char* APISECRET;
    static const char* WORKDIR;

private:
    bool is_initialized_;
    bool sdk_initialized_;
    std::string model_path_;
    std::string config_path_;
    
    // SparkChain LLM实例
    std::unique_ptr<SparkChain::LLM> llm_instance_;
    
    // 会话历史存储 (chat_id -> history)
    std::unordered_map<std::string, 
        std::vector<std::pair<std::string, std::string>>> chat_histories_;
    
    // 模型配置
    std::unordered_map<std::string, std::string> model_configs_;
    
    // 互斥锁保护共享资源
    mutable std::mutex history_mutex_;
    mutable std::mutex sdk_mutex_;
    
    // 异步调用状态管理
    std::atomic<bool> async_finished_;
    std::string async_result_;
    std::string async_error_;
};

} // namespace sparkchain
