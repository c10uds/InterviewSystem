#pragma once

#include <memory>
#include <string>
#include <functional>
#include <chrono>

// 引入httplib库 (需要下载httplib.h到third_party目录)
#define CPPHTTPLIB_OPENSSL_SUPPORT
#include "../third_party/httplib.h"

#include "common/types.h"

namespace sparkchain {

class BaseHandler;
class HealthHandler;
class AsrHandler;
class TtsHandler;
class LlmHandler;

class Server {
public:
    explicit Server(int port = 8081);
    ~Server();

    // 启动服务器
    bool start();
    
    // 停止服务器
    void stop();
    
    // 设置服务器配置
    void set_base_dir(const std::string& dir);
    void set_thread_pool_count(size_t count);

private:
    void setup_routes();
    void setup_middlewares();
    void setup_cors();
    
    // 错误处理
    void setup_error_handlers();
    
    // 文件服务
    void setup_file_service();

private:
    int port_;
    std::unique_ptr<httplib::Server> server_;
    std::string base_dir_;
    
    // 处理器
    std::unique_ptr<HealthHandler> health_handler_;
    std::unique_ptr<AsrHandler> asr_handler_;
    std::unique_ptr<TtsHandler> tts_handler_;
    std::unique_ptr<LlmHandler> llm_handler_;
    
    // 服务状态
    bool is_running_;
    std::chrono::steady_clock::time_point start_time_;
};

} // namespace sparkchain
