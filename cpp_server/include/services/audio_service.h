#pragma once

#include <string>
#include <memory>
#include <mutex>
#include <atomic>
#include "common/types.h"

// SparkChain SDK前向声明
namespace SparkChain {
    class ASR;
    class OnlineTTS;
    class ASRCallbacks;
    class TTSCallbacks;
}

namespace sparkchain {

class AudioService {
public:
    AudioService();
    ~AudioService();
    
    // 语音识别
    AsrResponse speech_to_text(const AsrRequest& request);
    
    // 语音合成
    TtsResponse text_to_speech(const TtsRequest& request);
    
    // 初始化音频引擎
    bool initialize();
    
    // 释放资源
    void cleanup();
    
private:
    // 内部实现方法
    AsrResponse process_audio_recognition(const std::string& audio_data, 
                                        const std::string& language);
    
    TtsResponse process_speech_synthesis(const std::string& text, 
                                       const std::string& voice);
    
    // 音频格式转换
    std::string convert_audio_format(const std::string& audio_data, 
                                   const std::string& from_format,
                                   const std::string& to_format);
    
    // 音频质量检查
    bool validate_audio_quality(const std::string& audio_data);
    
    // SparkChain SDK相关方法
    bool init_sparkchain_audio_sdk();
    void cleanup_sparkchain_audio_sdk();
    
    // SDK配置参数
    static const char* APPID;
    static const char* APIKEY;
    static const char* APISECRET;
    static const char* WORKDIR;
    
private:
    bool is_initialized_;
    bool sdk_initialized_;
    std::string temp_dir_;
    std::string model_path_;
    std::mutex sdk_mutex_;
    std::atomic<bool> asr_finished_;
    std::atomic<bool> tts_finished_;
};

} // namespace sparkchain
