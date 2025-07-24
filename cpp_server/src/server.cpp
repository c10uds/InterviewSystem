#include "server.h"
#include "handlers/health_handler.h"
#include "handlers/asr_handler.h"
#include "handlers/tts_handler.h"
#include "handlers/llm_handler.h"
#include "utils/logger.h"
#include "utils/file_utils.h"

#include <chrono>
#include <thread>

namespace sparkchain {

Server::Server(int port) 
    : port_(port)
    , server_(std::make_unique<httplib::Server>())
    , base_dir_("./public")
    , is_running_(false)
    , start_time_(std::chrono::steady_clock::now()) {
    
    // 创建处理器实例
    health_handler_ = std::make_unique<HealthHandler>();
    asr_handler_ = std::make_unique<AsrHandler>();
    tts_handler_ = std::make_unique<TtsHandler>();
    llm_handler_ = std::make_unique<LlmHandler>();
}

Server::~Server() {
    if (is_running_) {
        stop();
    }
}

bool Server::start() {
    try {
        // 设置服务器配置
        setup_middlewares();
        setup_cors();
        setup_routes();
        setup_error_handlers();
        setup_file_service();
        
        // 启动服务器
        LOG_INFO_F("正在启动HTTP服务器，端口: %d", port_);
        
        is_running_ = true;
        start_time_ = std::chrono::steady_clock::now();
        
        // 在单独的线程中启动服务器
        std::thread server_thread([this]() {
            if (!server_->listen("0.0.0.0", port_)) {
                LOG_ERROR("服务器启动失败");
                is_running_ = false;
            }
        });
        
        // 等待一小段时间确保服务器启动
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        
        if (is_running_) {
            server_thread.detach();
            return true;
        } else {
            if (server_thread.joinable()) {
                server_thread.join();
            }
            return false;
        }
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("服务器启动异常: %s", e.what());
        return false;
    }
}

void Server::stop() {
    if (is_running_) {
        LOG_INFO("正在停止服务器...");
        is_running_ = false;
        server_->stop();
        LOG_INFO("服务器已停止");
    }
}

void Server::set_base_dir(const std::string& dir) {
    base_dir_ = dir;
    // 确保目录存在
    if (!FileUtils::exists(base_dir_)) {
        FileUtils::create_directory(base_dir_);
    }
}

void Server::set_thread_pool_count(size_t count) {
    server_->new_task_queue = [count] {
        return new httplib::ThreadPool(count);
    };
}

void Server::setup_routes() {
    // 健康检查接口
    server_->Get("/api/health", [this](const httplib::Request& req, httplib::Response& res) {
        health_handler_->handle_get(req, res);
    });
    
    // 语音识别接口
    server_->Post("/api/asr", [this](const httplib::Request& req, httplib::Response& res) {
        asr_handler_->handle_post(req, res);
    });
    
    // 语音合成接口
    server_->Post("/api/tts", [this](const httplib::Request& req, httplib::Response& res) {
        tts_handler_->handle_post(req, res);
    });
    
    // LLM对话接口
    server_->Post("/api/llm", [this](const httplib::Request& req, httplib::Response& res) {
        llm_handler_->handle_post(req, res);
    });
    
    LOG_INFO("API路由设置完成");
}

void Server::setup_middlewares() {
    // 请求日志中间件
    server_->set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        LOG_INFO_F("收到请求: %s %s", req.method.c_str(), req.path.c_str());
        return httplib::Server::HandlerResponse::Unhandled;
    });
    
    // 响应日志中间件
    server_->set_post_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        LOG_INFO_F("响应: %s %s -> %d", req.method.c_str(), req.path.c_str(), res.status);
    });
}

void Server::setup_cors() {
    // CORS处理
    server_->set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        if (req.method == "OPTIONS") {
            res.status = 200;
            return httplib::Server::HandlerResponse::Handled;
        }
        
        return httplib::Server::HandlerResponse::Unhandled;
    });
}

void Server::setup_error_handlers() {
    // 404错误处理
    server_->set_error_handler([](const httplib::Request& req, httplib::Response& res) {
        if (res.status == 404) {
            res.set_content("{\"error\":\"API endpoint not found\"}", "application/json");
        } else if (res.status == 500) {
            res.set_content("{\"error\":\"Internal server error\"}", "application/json");
        }
    });
    
    // 异常处理
    server_->set_exception_handler([](const httplib::Request& req, httplib::Response& res, std::exception_ptr ep) {
        try {
            std::rethrow_exception(ep);
        } catch (const std::exception& e) {
            LOG_ERROR_F("请求处理异常: %s", e.what());
            res.status = 500;
            res.set_content("{\"error\":\"Internal server error\"}", "application/json");
        }
    });
}

void Server::setup_file_service() {
    // 静态文件服务
    server_->set_mount_point("/", base_dir_);
    
    // 设置文件扩展名和MIME类型的映射
    server_->set_file_extension_and_mimetype_mapping("html", "text/html");
    server_->set_file_extension_and_mimetype_mapping("css", "text/css");
    server_->set_file_extension_and_mimetype_mapping("js", "application/javascript");
    server_->set_file_extension_and_mimetype_mapping("json", "application/json");
    server_->set_file_extension_and_mimetype_mapping("png", "image/png");
    server_->set_file_extension_and_mimetype_mapping("jpg", "image/jpeg");
    server_->set_file_extension_and_mimetype_mapping("wav", "audio/wav");
    server_->set_file_extension_and_mimetype_mapping("mp3", "audio/mpeg");
    
    LOG_INFO_F("静态文件服务已设置，根目录: %s", base_dir_.c_str());
}

} // namespace sparkchain
