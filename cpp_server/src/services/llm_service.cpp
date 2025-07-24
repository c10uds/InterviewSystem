#include "services/llm_service.h"
#include "utils/logger.h"
#include "utils/file_utils.h"

#include <random>
#include <thread>
#include <chrono>
#include <algorithm>
#include <mutex>

namespace sparkchain {

LlmService::LlmService() 
    : is_initialized_(false)
    , model_path_("./models/llm")
    , config_path_("./config/llm_config.json") {
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
        
        // 检查模型文件
        if (!FileUtils::exists(model_path_)) {
            LOG_WARN_F("LLM模型路径不存在: %s, 使用模拟模式", model_path_.c_str());
        }
        
        // 加载配置
        if (FileUtils::exists(config_path_)) {
            LOG_INFO_F("加载LLM配置: %s", config_path_.c_str());
        }
        
        // 初始化模型配置
        model_configs_["spark"] = "spark_model_config";
        model_configs_["gpt"] = "gpt_model_config";
        model_configs_["claude"] = "claude_model_config";
        model_configs_["llama"] = "llama_model_config";
        
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
        
        std::lock_guard<std::mutex> lock(history_mutex_);
        chat_histories_.clear();
        
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
    
    // 模拟LLM处理时间
    std::this_thread::sleep_for(std::chrono::milliseconds(800));
    
    // 获取对话历史
    auto history = get_chat_history(chat_id);
    
    // 这里应该调用实际的LLM引擎（如科大讯飞星火、OpenAI GPT等）
    // 目前使用模拟实现
    std::string answer;
    
    // 简单的关键词匹配模拟
    std::string lower_question = question;
    std::transform(lower_question.begin(), lower_question.end(), 
                  lower_question.begin(), ::tolower);
    
    if (lower_question.find("面试") != std::string::npos || 
        lower_question.find("interview") != std::string::npos) {
        answer = "关于面试，我建议您：\n"
                "1. 提前准备常见面试问题的回答\n"
                "2. 了解目标公司的文化和业务\n"
                "3. 准备一些具体的项目案例\n"
                "4. 保持自信和积极的态度\n"
                "5. 准备一些想要问面试官的问题";
    } else if (lower_question.find("技能") != std::string::npos || 
               lower_question.find("skill") != std::string::npos) {
        answer = "技能提升建议：\n"
                "1. 持续学习新技术和工具\n"
                "2. 通过实际项目练习\n"
                "3. 参与开源项目贡献\n"
                "4. 参加技术社区和会议\n"
                "5. 定期总结和反思";
    } else if (lower_question.find("你好") != std::string::npos || 
               lower_question.find("hello") != std::string::npos) {
        answer = "您好！我是SparkChain智能助手，很高兴为您服务。我可以帮助您进行面试练习、技能评估和职业规划。请告诉我您需要什么帮助？";
    } else {
        // 通用回答
        answer = "感谢您的问题。基于您的询问，我建议您可以从以下几个方面考虑：\n"
                "1. 明确目标和需求\n"
                "2. 制定详细的行动计划\n"
                "3. 持续学习和实践\n"
                "4. 寻求专业指导和反馈\n"
                "5. 保持耐心和坚持\n\n"
                "如果您能提供更多具体信息，我可以给出更有针对性的建议。";
    }
    
    // 后处理答案
    answer = postprocess_answer(answer);
    
    response.success = true;
    response.answer = answer;
    
    LOG_INFO_F("LLM对话完成, 回答长度: %zu", response.answer.length());
    
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

} // namespace sparkchain
