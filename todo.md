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