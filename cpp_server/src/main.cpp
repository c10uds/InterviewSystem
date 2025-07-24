#include <iostream>
#include <signal.h>
#include <thread>
#include <chrono>
#include "server.h"
#include "utils/logger.h"

using namespace sparkchain;

// 全局服务器实例用于信号处理
std::unique_ptr<Server> g_server;

void signal_handler(int signal) {
    if (g_server) {
        LOG_INFO("接收到停止信号，正在关闭服务器...");
        g_server->stop();
    }
}

int main(int argc, char* argv[]) {
    // 设置信号处理
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    // 配置日志
    Logger::getInstance().set_level(LogLevel::INFO);
    Logger::getInstance().set_log_file("sparkchain_server.log");
    
    try {
        // 解析命令行参数
        int port = 8081;
        std::string base_dir = "./public";
        
        if (argc > 1) {
            port = std::atoi(argv[1]);
            if (port <= 0 || port > 65535) {
                LOG_ERROR("无效的端口号");
                return -1;
            }
        }
        
        if (argc > 2) {
            base_dir = argv[2];
        }
        
        LOG_INFO_F("启动SparkChain服务器 端口:%d 静态文件目录:%s", port, base_dir.c_str());
        
        // 创建服务器实例
        g_server = std::make_unique<Server>(port);
        g_server->set_base_dir(base_dir);
        g_server->set_thread_pool_count(8);
        
        // 启动服务器
        if (!g_server->start()) {
            LOG_ERROR("服务器启动失败");
            return -1;
        }
        
        LOG_INFO("SparkChain服务器已启动成功");
        LOG_INFO_F("访问地址: http://127.0.0.1:%d", port);
        LOG_INFO_F("健康检查: http://127.0.0.1:%d/api/health", port);
        
        // 等待服务器运行
        LOG_INFO("服务器正在运行，按 Ctrl+C 停止...");
        while (true) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("服务器启动异常: %s", e.what());
        return -1;
    }
    
    return 0;
}
