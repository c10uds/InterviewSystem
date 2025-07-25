#include "services/audio_service.h"
#include "utils/logger.h"
#include "utils/file_utils.h"

#include <random>
#include <thread>
#include <chrono>
#include <atomic>

// SparkChain SDK头文件
#include "sparkchain.h"
#include "sc_asr.h"
#include "sc_tts.h"

// 使用LLM服务中已定义的SDK配置参数
extern const char* SPARKCHAIN_APPID;
extern const char* SPARKCHAIN_APIKEY;
extern const char* SPARKCHAIN_APISECRET;
extern const char* SPARKCHAIN_WORKDIR;

// SparkChain ASR回调实现
class SparkASRCallbacks : public SparkChain::ASRCallbacks {
private:
    std::atomic<bool>* finished_;
    std::string* result_;
    std::string* error_;
    double* confidence_;
    
public:
    SparkASRCallbacks(std::atomic<bool>* finished, std::string* result, std::string* error, double* confidence)
        : finished_(finished), result_(result), error_(error), confidence_(confidence) {}
    
    void onResult(SparkChain::ASRResult* result, void* usrTag) override {
        if (result) {
            std::string asrResult = result->bestMatchText();
            int status = result->status();
            
            if (!asrResult.empty()) {
                *result_ += asrResult;
            }
            
            if (status == 2) { // 最终结果
                *finished_ = true;
                *confidence_ = 0.90; // 设置置信度
            }
        }
    }
    
    void onError(SparkChain::ASRError* error, void* usrTag) override {
        if (error) {
            int errCode = error->code();
            std::string errMsg = error->errMsg();
            
            *error_ = "ASR Error: Code=" + std::to_string(errCode) + ", Message=" + errMsg;
            *finished_ = true;
        }
    }
};

// SparkChain TTS回调实现  
class SparkTTSCallbacks : public SparkChain::TTSCallbacks {
private:
    std::atomic<bool>* finished_;
    std::string* audio_data_;
    std::string* error_;
    
public:
    SparkTTSCallbacks(std::atomic<bool>* finished, std::string* audio_data, std::string* error)
        : finished_(finished), audio_data_(audio_data), error_(error) {}
    
    void onResult(SparkChain::TTSResult* result, void* usrTag) override {
        if (result) {
            const char* data = result->data();
            int len = result->len();
            int status = result->status();
            
            if (data && len > 0) {
                audio_data_->append(data, len);
            }
            
            if (status == 2) { // 合成完成
                *finished_ = true;
            }
        }
    }
    
    void onError(SparkChain::TTSError* error, void* usrTag) override {
        if (error) {
            int errCode = error->code();
            std::string errMsg = error->errMsg();
            
            *error_ = "TTS Error: Code=" + std::to_string(errCode) + ", Message=" + errMsg;
            *finished_ = true;
        }
    }
};

namespace sparkchain {

// SDK配置参数 - 请替换为您的实际参数
const char* AudioService::APPID = SPARKCHAIN_APPID;
const char* AudioService::APIKEY = SPARKCHAIN_APIKEY;
const char* AudioService::APISECRET = SPARKCHAIN_APISECRET;
const char* AudioService::WORKDIR = SPARKCHAIN_WORKDIR;

AudioService::AudioService() 
    : is_initialized_(false)
    , sdk_initialized_(false)
    , temp_dir_(FileUtils::get_temp_directory())
    , model_path_("./models/audio")
    , asr_finished_(false)
    , tts_finished_(false) {
}

AudioService::~AudioService() {
    cleanup();
}

bool AudioService::initialize() {
    if (is_initialized_) {
        return true;
    }
    
    try {
        LOG_INFO("初始化音频服务...");
        
        // 初始化SparkChain SDK
        if (!init_sparkchain_audio_sdk()) {
            LOG_ERROR("SparkChain音频SDK初始化失败");
            return false;
        }
        
        // 创建临时目录
        if (!FileUtils::exists(temp_dir_)) {
            FileUtils::create_directory(temp_dir_);
        }
        
        // 检查模型文件
        if (!FileUtils::exists(model_path_)) {
            LOG_WARN_F("音频模型路径不存在: %s, 使用SDK默认配置", model_path_.c_str());
        }
        
        is_initialized_ = true;
        LOG_INFO("音频服务初始化完成");
        return true;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("音频服务初始化失败: %s", e.what());
        return false;
    }
}

void AudioService::cleanup() {
    if (is_initialized_) {
        LOG_INFO("清理音频服务资源...");
        cleanup_sparkchain_audio_sdk();
        is_initialized_ = false;
    }
}

AsrResponse AudioService::speech_to_text(const AsrRequest& request) {
    AsrResponse response;
    
    try {
        if (!is_initialized_) {
            response.success = false;
            response.error = "Audio service not initialized";
            return response;
        }
        
        LOG_INFO_F("开始语音识别, 语言: %s, 数据大小: %zu bytes", 
                  request.language.c_str(), request.audio_data.size());
        
        // 验证音频质量
        if (!validate_audio_quality(request.audio_data)) {
            response.success = false;
            response.error = "Invalid audio quality";
            return response;
        }
        
        // 调用实际的语音识别处理
        response = process_audio_recognition(request.audio_data, request.language);
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("语音识别处理异常: %s", e.what());
        response.success = false;
        response.error = e.what();
    }
    
    return response;
}

TtsResponse AudioService::text_to_speech(const TtsRequest& request) {
    TtsResponse response;
    
    try {
        if (!is_initialized_) {
            response.success = false;
            response.error = "Audio service not initialized";
            return response;
        }
        
        LOG_INFO_F("开始语音合成, 发音人: %s, 文本长度: %zu", 
                  request.voice.c_str(), request.text.length());
        
        // 调用实际的语音合成处理
        response = process_speech_synthesis(request.text, request.voice);
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("语音合成处理异常: %s", e.what());
        response.success = false;
        response.error = e.what();
    }
    
    return response;
}

AsrResponse AudioService::process_audio_recognition(const std::string& audio_data, 
                                                  const std::string& language) {
    AsrResponse response;
    
    try {
        LOG_INFO_F("调用SparkChain ASR, 语言: %s, 音频长度: %zu", language.c_str(), audio_data.size());
        
        // 确保SDK已初始化
        if (!sdk_initialized_) {
            response.success = false;
            response.error = "SparkChain SDK not initialized";
            return response;
        }
        
        // 重置标志
        asr_finished_ = false;
        std::string result_text;
        std::string error_msg;
        double confidence = 0.0;
        
        // 创建ASR实例
        std::string lang = (language == "zh_cn") ? "zh_cn" : "en_us";
        SparkChain::ASR asr(lang.c_str(), "iat", "mandarin");
        asr.vinfo(true); // 返回vad信息
        
        // 创建回调实例
        SparkASRCallbacks callbacks(&asr_finished_, &result_text, &error_msg, &confidence);
        asr.registerCallbacks(&callbacks);
        
        // 设置音频属性
        SparkChain::AudioAttributes attr;
        attr.setSampleRate(16000);  // 16K采样率
        attr.setEncoding("raw");    // PCM音频
        attr.setChannels(1);        // 单声道
        
        // 开始识别
        asr.start(attr);
        
        // 发送音频数据（分帧发送）
        const int per_frame_size = 1280 * 8; // 每帧大小
        size_t sent_len = 0;
        while (sent_len < audio_data.size()) {
            size_t cur_size = per_frame_size;
            if (sent_len + per_frame_size > audio_data.size()) {
                cur_size = audio_data.size() - sent_len;
            }
            
            asr.write(audio_data.data() + sent_len, cur_size);
            sent_len += cur_size;
            
            // 模拟40ms间隔
            std::this_thread::sleep_for(std::chrono::milliseconds(40));
        }
        
        // 结束发送
        asr.stop();
        
        // 等待结果（最多等待30秒）
        int wait_times = 0;
        while (!asr_finished_ && wait_times < 300) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            wait_times++;
        }
        
        if (!asr_finished_) {
            response.success = false;
            response.error = "ASR timeout - no response within 30 seconds";
            return response;
        }
        
        if (!error_msg.empty()) {
            response.success = false;
            response.error = error_msg;
            return response;
        }
        
        // 成功处理结果
        response.success = true;
        response.text = result_text;
        response.confidence = confidence;
        
        LOG_INFO_F("语音识别完成, 识别文本: %s, 置信度: %.2f", 
                  response.text.c_str(), response.confidence);
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("ASR处理异常: %s", e.what());
        response.success = false;
        response.error = "ASR processing exception: " + std::string(e.what());
    }
    
    return response;
}

TtsResponse AudioService::process_speech_synthesis(const std::string& text, 
                                                 const std::string& voice) {
    TtsResponse response;
    
    try {
        LOG_INFO_F("调用SparkChain TTS, 发音人: %s, 文本长度: %zu", voice.c_str(), text.length());
        
        // 确保SDK已初始化
        if (!sdk_initialized_) {
            response.success = false;
            response.error = "SparkChain SDK not initialized";
            return response;
        }
        
        // 重置标志
        tts_finished_ = false;
        std::string audio_data;
        std::string error_msg;
        
        // 映射声音名称
        std::string vcn = voice;
        if (voice == "xiaoyan" || voice == "female") {
            vcn = "xiaoyan";  // 讯飞小燕
        } else if (voice == "male") {
            vcn = "aisjiuxu"; // 讯飞许久
        } else if (voice.empty()) {
            vcn = "xiaoyan";  // 默认发音人
        }
        
        // 创建TTS实例
        SparkChain::OnlineTTS tts(vcn.c_str());
        
        // 创建回调实例
        SparkTTSCallbacks callbacks(&tts_finished_, &audio_data, &error_msg);
        tts.registerCallbacks(&callbacks);
        
        // 开始合成
        int ret = tts.arun(text.c_str());
        if (ret != 0) {
            response.success = false;
            response.error = "TTS synthesis failed, error code: " + std::to_string(ret);
            return response;
        }
        
        // 等待合成完成（最多等待60秒）
        int wait_times = 0;
        while (!tts_finished_ && wait_times < 600) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            wait_times++;
        }
        
        if (!tts_finished_) {
            response.success = false;
            response.error = "TTS timeout - no response within 60 seconds";
            return response;
        }
        
        if (!error_msg.empty()) {
            response.success = false;
            response.error = error_msg;
            return response;
        }
        
        if (audio_data.empty()) {
            response.success = false;
            response.error = "TTS generated empty audio data";
            return response;
        }
        
        // 生成音频文件
        std::string audio_filename = "tts_" + std::to_string(std::time(nullptr)) + "_" + 
                                   std::to_string(rand() % 10000) + ".pcm";
        std::string audio_path = FileUtils::join_path(temp_dir_, audio_filename);
        
        if (FileUtils::write_file(audio_path, audio_data)) {
            response.success = true;
            response.audio_url = "/audio/" + audio_filename; // 相对URL
            response.audio_size = audio_data.size();
            
            LOG_INFO_F("语音合成完成, 音频文件: %s, 大小: %zu bytes", 
                      response.audio_url.c_str(), response.audio_size);
        } else {
            response.success = false;
            response.error = "Failed to save audio file";
        }
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("TTS处理异常: %s", e.what());
        response.success = false;
        response.error = "TTS processing exception: " + std::string(e.what());
    }
    
    return response;
}

std::string AudioService::convert_audio_format(const std::string& audio_data, 
                                              const std::string& from_format,
                                              const std::string& to_format) {
    // 音频格式转换的模拟实现
    // 实际应用中需要使用FFmpeg或其他音频处理库
    
    if (from_format == to_format) {
        return audio_data;
    }
    
    LOG_INFO_F("转换音频格式: %s -> %s", from_format.c_str(), to_format.c_str());
    
    // 模拟转换过程
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    return audio_data; // 返回原始数据作为模拟
}

bool AudioService::validate_audio_quality(const std::string& audio_data) {
    // 基本的音频质量检查
    if (audio_data.empty()) {
        LOG_WARN("音频数据为空");
        return false;
    }
    
    if (audio_data.size() < 1024) { // 最小1KB
        LOG_WARN("音频数据过小，可能无效");
        return false;
    }
    
    if (audio_data.size() > 50 * 1024 * 1024) { // 最大50MB
        LOG_WARN("音频数据过大");
        return false;
    }
    
    // 可以添加更多音频格式和质量检查
    return true;
}

bool AudioService::init_sparkchain_audio_sdk() {
    std::lock_guard<std::mutex> lock(sdk_mutex_);
    
    if (sdk_initialized_) {
        return true;
    }
    
    try {
        LOG_INFO("SparkChain音频SDK使用LLM服务已初始化的SDK实例");
        
        // 不需要再次初始化SDK，因为LLM服务已经初始化过了
        // SparkChain SDK只能初始化一次，多个服务共享同一个SDK实例
        
        sdk_initialized_ = true;
        LOG_INFO("SparkChain音频SDK准备就绪");
        return true;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("SparkChain音频SDK准备异常: %s", e.what());
        return false;
    }
}

void AudioService::cleanup_sparkchain_audio_sdk() {
    std::lock_guard<std::mutex> lock(sdk_mutex_);
    
    if (sdk_initialized_) {
        LOG_INFO("SparkChain音频SDK清理由LLM服务统一管理");
        
        // 不需要在这里调用unInit()，因为LLM服务会统一清理SDK
        sdk_initialized_ = false;
        
        LOG_INFO("SparkChain音频SDK标记为已清理");
    }
}

} // namespace sparkchain
