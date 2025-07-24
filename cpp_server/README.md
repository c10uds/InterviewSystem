# SparkChain C++ HTTP Server

基于 C++17 开发的高性能 HTTP 服务器，为 SparkChain SDK 提供后端服务支持。

## 功能特性

- **RESTful API**：提供标准的 HTTP REST 接口
- **语音识别**：支持多语言语音转文字服务
- **语音合成**：支持多发音人文字转语音服务  
- **大模型对话**：集成 LLM 对话服务
- **健康检查**：服务状态监控和健康检查
- **静态文件服务**：支持静态资源访问
- **多线程处理**：基于线程池的并发处理
- **日志系统**：完整的日志记录和管理

## 系统要求

- **操作系统**：Linux/macOS/Windows
- **编译器**：GCC 7.0+ 或 Clang 5.0+，支持 C++17
- **依赖库**：
  - CMake 3.16+
  - OpenSSL 1.1.0+
  - jsoncpp
  - httplib (已包含在项目中)

## 快速开始

### 1. 安装依赖

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install cmake g++ libssl-dev libjsoncpp-dev
```

**CentOS/RHEL:**
```bash
sudo yum install cmake gcc-c++ openssl-devel jsoncpp-devel
```

**macOS:**
```bash
brew install cmake openssl jsoncpp
```

### 2. 下载 httplib

```bash
cd third_party
wget https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h
```

### 3. 编译项目

```bash
mkdir build
cd build
cmake ..
make -j$(nproc)
```

### 4. 运行服务器

```bash
# 使用默认端口 8081
./sparkchain_server

# 指定端口和静态文件目录
./sparkchain_server 8080 ./public
```

## API 接口

### 健康检查
```
GET /api/health
```

响应示例：
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-20 10:30:45",
  "uptime": "2h 15m 30s"
}
```

### 语音识别
```
POST /api/asr
Content-Type: multipart/form-data

Parameters:
- audio: 音频文件 (支持 wav, mp3, m4a)
- language: 语言类型 (zh_cn, en_us)
```

响应示例：
```json
{
  "success": true,
  "text": "识别的文本内容",
  "confidence": 0.95
}
```

### 语音合成
```
POST /api/tts
Content-Type: application/x-www-form-urlencoded

Parameters:
- text: 要合成的文本
- voice: 发音人 (xiaoyan, xiaofeng, xiaodong, xiaoyun)
- format: 输出格式 (wav, mp3)
```

响应示例：
```json
{
  "success": true,
  "audio_url": "/audio/tts_1642665045_1234.wav",
  "audio_size": 102400
}
```

### LLM 对话
```
POST /api/llm
Content-Type: application/x-www-form-urlencoded

Parameters:
- question: 用户问题
- chat_id: 会话ID (可选)
- model: 模型类型 (spark, gpt, claude, llama)
```

响应示例：
```json
{
  "success": true,
  "answer": "AI助手的回答内容",
  "chat_id": "chat_1642665045_5678"
}
```

## 配置说明

### 服务器配置
- **端口**：默认 8081，可通过命令行参数修改
- **线程池**：默认 8 个工作线程
- **静态文件目录**：默认 ./public

### 日志配置
- **日志级别**：DEBUG, INFO, WARN, ERROR
- **日志文件**：sparkchain_server.log
- **日志格式**：[时间戳] [级别] 消息内容

### 限制设置
- **音频文件大小**：最大 50MB
- **文本长度**：最大 2000 字符
- **请求体大小**：最大 10MB

## 架构设计

```
sparkchain_server/
├── include/              # 头文件
│   ├── common/          # 通用类型定义
│   ├── handlers/        # HTTP 请求处理器
│   ├── services/        # 业务逻辑服务
│   └── utils/           # 工具类
├── src/                 # 源文件
│   ├── handlers/        # 处理器实现
│   ├── services/        # 服务实现
│   └── utils/           # 工具类实现
├── third_party/         # 第三方库
└── public/              # 静态文件目录
```

## 开发指南

### 添加新的 API 接口

1. **定义请求/响应结构**（common/types.h）
2. **创建处理器类**（handlers/）
3. **实现业务逻辑**（services/）
4. **注册路由**（server.cpp）

### 自定义服务实现

当前项目提供了模拟的服务实现，在生产环境中需要集成真实的：

- **ASR 引擎**：科大讯飞、百度、阿里云等
- **TTS 引擎**：科大讯飞、百度、微软等
- **LLM 模型**：OpenAI GPT、百度文心、科大讯飞星火等

### 错误处理

所有 API 接口都支持统一的错误响应格式：
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

## 性能优化

- **连接池**：复用 HTTP 连接
- **线程池**：异步处理请求
- **内存管理**：智能指针避免内存泄漏
- **日志优化**：分级日志减少 I/O 开销

## 监控和运维

### 健康检查
- 定期调用 `/api/health` 接口
- 监控服务响应时间和可用性

### 日志分析
- 监控错误日志数量和类型
- 分析请求处理时间分布

### 资源监控
- CPU 使用率
- 内存占用
- 磁盘空间（临时文件清理）

## 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。

## 联系我们

如有问题或建议，请通过以下方式联系：
- 邮箱：support@sparkchain.com
- 文档：https://docs.sparkchain.com
