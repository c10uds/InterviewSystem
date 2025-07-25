#include "services/llm_service.h"
#include "utils/logger.h"
#include "utils/file_utils.h"

#include <random>
#include <thread>
#include <chrono>
#include <algorithm>
#include <mutex>

// SparkChain SDK头文件
#include "sparkchain.h"
#include "sc_llm.h"

// SDK配置参数 - 请替换为您的实际参数
const char* SPARKCHAIN_APPID = "82e7fa93";
const char* SPARKCHAIN_APIKEY = "891ffce5b4b74fd82c3dbb65203c7614";
const char* SPARKCHAIN_APISECRET = "ZDc4NjkyMjVhOGRlYWJiYmM3OWM1NDgy";
const char* SPARKCHAIN_WORKDIR = "./";

// SparkChain回调实现
class SparkLLMCallbacks : public SparkChain::LLMCallbacks {
private:
    std::atomic<bool>* finished_;
    std::string* result_;
    std::string* error_;
    
public:
    SparkLLMCallbacks(std::atomic<bool>* finished, std::string* result, std::string* error)
        : finished_(finished), result_(result), error_(error) {}
    
    void onLLMResult(SparkChain::LLMResult* result, void* usrContext) override {
        if (result->getContentType() == SparkChain::LLMResult::TEXT) {
            const char* content = result->getContent();
            int status = result->getStatus();
            
            if (content) {
                *result_ += content;
            }
            
            if (status == 2) { // 最终帧
                *finished_ = true;
            }
        }
    }
    
    void onLLMEvent(SparkChain::LLMEvent* event, void* usrContext) override {
        // 处理事件，如果需要的话
    }
    
    void onLLMError(SparkChain::LLMError* error, void* usrContext) override {
        int errCode = error->getErrCode();
        const char* errMsg = error->getErrMsg();
        
        *error_ = "LLM Error: Code=" + std::to_string(errCode) + ", Message=" + std::string(errMsg ? errMsg : "Unknown error");
        *finished_ = true;
    }
};

namespace sparkchain {

// SDK配置参数 - 请替换为您的实际参数
const char* LlmService::APPID = SPARKCHAIN_APPID;
const char* LlmService::APIKEY = SPARKCHAIN_APIKEY;
const char* LlmService::APISECRET = SPARKCHAIN_APISECRET;
const char* LlmService::WORKDIR = SPARKCHAIN_WORKDIR;

LlmService::LlmService() 
    : is_initialized_(false)
    , sdk_initialized_(false)
    , model_path_("./models/llm")
    , config_path_("./config/llm_config.json")
    , async_finished_(false) {
}

LlmService::~LlmService() {
    cleanup();
}

bool LlmService::initialize() {
    if (is_initialized_) {
        return true;
    }
    
    try {
        LOG_INFO("初始化LLM服务...");
        
        // 初始化SparkChain SDK
        if (!init_sparkchain_sdk()) {
            LOG_ERROR("SparkChain SDK初始化失败");
            return false;
        }
        
        // 检查模型文件
        if (!FileUtils::exists(model_path_)) {
            LOG_WARN_F("LLM模型路径不存在: %s, 使用SDK默认配置", model_path_.c_str());
        }
        
        // 加载配置
        if (FileUtils::exists(config_path_)) {
            LOG_INFO_F("加载LLM配置: %s", config_path_.c_str());
        }
        
        // 初始化模型配置
        model_configs_["spark"] = "4.0Ultra";
        model_configs_["gpt"] = "4.0Ultra";  // 使用星火作为后端
        model_configs_["claude"] = "4.0Ultra";
        model_configs_["llama"] = "4.0Ultra";
        
        is_initialized_ = true;
        LOG_INFO("LLM服务初始化完成");
        return true;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("LLM服务初始化失败: %s", e.what());
        return false;
    }
}

void LlmService::cleanup() {
    if (is_initialized_) {
        LOG_INFO("清理LLM服务资源...");
        
        {
            std::lock_guard<std::mutex> lock(history_mutex_);
            chat_histories_.clear();
        }
        
        // 清理SparkChain SDK
        cleanup_sparkchain_sdk();
        
        is_initialized_ = false;
    }
}

LlmResponse LlmService::chat(const LlmRequest& request) {
    LlmResponse response;
    
    try {
        if (!is_initialized_) {
            response.success = false;
            response.error = "LLM service not initialized";
            return response;
        }
        
        LOG_INFO_F("开始LLM对话, 模型: %s, 问题长度: %zu", 
                  request.model.c_str(), request.question.length());
        
        // 预处理问题
        std::string processed_question = preprocess_question(request.question);
        
        // 获取或生成会话ID
        std::string chat_id = request.chat_id;
        if (chat_id.empty()) {
            chat_id = generate_chat_id();
        }
        
        // 调用实际的LLM处理
        response = process_chat_request(processed_question, chat_id);
        response.chat_id = chat_id;
        
        // 保存对话历史
        if (response.success) {
            save_chat_history(chat_id, request.question, response.answer);
        }
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("LLM对话处理异常: %s", e.what());
        response.success = false;
        response.error = e.what();
    }
    
    return response;
}

void LlmService::set_model_config(const std::string& model_name, 
                                 const std::string& config_path) {
    model_configs_[model_name] = config_path;
    LOG_INFO_F("设置模型配置: %s -> %s", model_name.c_str(), config_path.c_str());
}

LlmResponse LlmService::process_chat_request(const std::string& question, 
                                           const std::string& chat_id) {
    LlmResponse response;
    
    try {
        if (!sdk_initialized_) {
            throw std::runtime_error("SparkChain SDK not initialized");
        }
        
        // 获取对话历史
        auto history = get_chat_history(chat_id);
        
        // 创建LLM实例
        SparkChain::LLM* llm = create_llm_instance("4.0Ultra");
        if (!llm) {
            throw std::runtime_error("Failed to create LLM instance");
        }
        
        // 使用同步调用方式
        LOG_INFO_F("调用SparkChain LLM, 问题: %s", question.c_str());
        
        SparkChain::LLMSyncOutput* result = llm->run(question.c_str(), 60); // 60秒超时
        if (!result) {
            SparkChain::LLMFactory::destroy(llm);
            throw std::runtime_error("LLM run failed - no result");
        }
        
        // 获取结果
        int errCode = result->getErrCode();
        if (errCode != 0) {
            const char* errMsg = result->getErrMsg();
            SparkChain::LLMFactory::destroy(llm);
            throw std::runtime_error("LLM error: " + std::string(errMsg ? errMsg : "Unknown error"));
        }
        
        const char* content = result->getContent();
        if (content) {
            response.answer = content;
            response.success = true;
            
            // 获取Token信息
            response.completion_tokens = result->getCompletionTokens();
            response.prompt_tokens = result->getPromptTokens();
            response.total_tokens = result->getTotalTokens();
        } else {
            throw std::runtime_error("No content in LLM response");
        }
        
        // 清理资源
        SparkChain::LLMFactory::destroy(llm);
        
        LOG_INFO_F("LLM对话完成, 回答长度: %zu, 使用Token: %d", 
                  response.answer.length(), response.total_tokens);
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("SparkChain LLM调用失败: %s", e.what());
        response.success = false;
        response.error = e.what();
        
        // 如果实际LLM调用失败，提供一个基础的回答
        response.answer = "抱歉，我现在无法处理您的请求。请稍后再试。错误信息：" + std::string(e.what());
    }
    
    return response;
}

void LlmService::save_chat_history(const std::string& chat_id, 
                                  const std::string& question,
                                  const std::string& answer) {
    std::lock_guard<std::mutex> lock(history_mutex_);
    
    chat_histories_[chat_id].emplace_back(question, answer);
    
    // 限制历史记录数量（最多保存最近10轮对话）
    if (chat_histories_[chat_id].size() > 10) {
        chat_histories_[chat_id].erase(chat_histories_[chat_id].begin());
    }
    
    LOG_DEBUG_F("保存对话历史, 会话ID: %s, 历史数量: %zu", 
               chat_id.c_str(), chat_histories_[chat_id].size());
}

std::vector<std::pair<std::string, std::string>> 
LlmService::get_chat_history(const std::string& chat_id) {
    std::lock_guard<std::mutex> lock(history_mutex_);
    
    auto it = chat_histories_.find(chat_id);
    if (it != chat_histories_.end()) {
        return it->second;
    }
    
    return {};
}

std::string LlmService::preprocess_question(const std::string& question) {
    std::string processed = question;
    
    // 去除首尾空白字符
    processed.erase(0, processed.find_first_not_of(" \t\n\r"));
    processed.erase(processed.find_last_not_of(" \t\n\r") + 1);
    
    // 可以添加更多预处理逻辑，如：
    // - 敏感词过滤
    // - 格式标准化
    // - 语言检测
    
    return processed;
}

std::string LlmService::postprocess_answer(const std::string& answer) {
    std::string processed = answer;
    
    // 去除首尾空白字符
    processed.erase(0, processed.find_first_not_of(" \t\n\r"));
    processed.erase(processed.find_last_not_of(" \t\n\r") + 1);
    
    // 可以添加更多后处理逻辑，如：
    // - 格式化输出
    // - 添加引用信息
    // - 内容安全检查
    
    return processed;
}

std::string LlmService::generate_chat_id() {
    // 生成基于时间戳和随机数的会话ID
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(1000, 9999);
    
    return "chat_" + std::to_string(timestamp) + "_" + std::to_string(dis(gen));
}

bool LlmService::init_sparkchain_sdk() {
    std::lock_guard<std::mutex> lock(sdk_mutex_);
    
    if (sdk_initialized_) {
        return true;
    }
    
    try {
        LOG_INFO("初始化SparkChain SDK...");
        
        SparkChain::SparkChainConfig* config = SparkChain::SparkChainConfig::builder();
        config->appID(APPID)
              ->apiKey(APIKEY)
              ->apiSecret(APISECRET)
              ->workDir(WORKDIR)
              ->logLevel(100); // 关闭详细日志
        
        int ret = SparkChain::init(config);
        if (ret != 0) {
            LOG_ERROR_F("SparkChain SDK初始化失败, 错误码: %d", ret);
            return false;
        }
        
        sdk_initialized_ = true;
        LOG_INFO("SparkChain SDK初始化成功");
        return true;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("SparkChain SDK初始化异常: %s", e.what());
        return false;
    }
}

void LlmService::cleanup_sparkchain_sdk() {
    std::lock_guard<std::mutex> lock(sdk_mutex_);
    
    if (sdk_initialized_) {
        LOG_INFO("清理SparkChain SDK...");
        
        // 释放LLM实例
        llm_instance_.reset();
        
        // 清理SDK
        SparkChain::unInit();
        sdk_initialized_ = false;
        
        LOG_INFO("SparkChain SDK已清理");
    }
}

SparkChain::LLM* LlmService::create_llm_instance(const std::string& model) {
    try {
        SparkChain::LLMConfig* llmConfig = SparkChain::LLMConfig::builder();
        llmConfig->domain(model.c_str()); // 使用指定的模型版本
        
        // 创建带历史记忆的LLM实例（保持5轮对话上下文）
        SparkChain::Memory* memory = SparkChain::Memory::WindowMemory(5);
        SparkChain::LLM* llm = SparkChain::LLMFactory::textGeneration(llmConfig, memory);
        
        if (!llm) {
            LOG_ERROR("创建LLM实例失败");
            return nullptr;
        }
        
        LOG_DEBUG_F("创建LLM实例成功, 模型: %s", model.c_str());
        return llm;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("创建LLM实例异常: %s", e.what());
        return nullptr;
    }
}

} // namespace sparkchain
