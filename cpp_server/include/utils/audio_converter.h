#pragma once

#include <string>
#include <memory>
#include <vector>

// FFmpeg 头文件
extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libswresample/swresample.h>
#include <libavutil/opt.h>
#include <libavutil/channel_layout.h>
#include <libavutil/samplefmt.h>
}

namespace sparkchain {

/**
 * FFmpeg 音频格式转换工具类
 */
class AudioConverter {
public:
    AudioConverter();
    ~AudioConverter();

    /**
     * 将音频数据从一种格式转换为另一种格式
     * 
     * @param input_data 输入音频数据
     * @param input_format 输入格式 (wav, mp3, pcm, etc.)
     * @param output_format 输出格式 (wav, mp3, pcm, etc.)
     * @param sample_rate 目标采样率 (default: 16000)
     * @param channels 目标声道数 (default: 1)
     * @return 转换后的音频数据
     */
    std::string convert_format(const std::string& input_data,
                              const std::string& input_format,
                              const std::string& output_format,
                              int sample_rate = 16000,
                              int channels = 1);

    /**
     * 检测音频格式
     * 
     * @param audio_data 音频数据
     * @return 检测到的格式名称
     */
    std::string detect_format(const std::string& audio_data);

    /**
     * 验证音频数据是否有效
     * 
     * @param audio_data 音频数据
     * @param format 音频格式
     * @return true if valid, false otherwise
     */
    bool validate_audio_data(const std::string& audio_data, const std::string& format);

    /**
     * 获取音频信息
     * 
     * @param audio_data 音频数据
     * @param format 音频格式
     * @return 包含音频信息的结构体
     */
    struct AudioInfo {
        int sample_rate = 0;
        int channels = 0;
        int bit_rate = 0;
        double duration = 0.0;
        std::string codec_name;
        bool is_valid = false;
    };
    
    AudioInfo get_audio_info(const std::string& audio_data, const std::string& format);

private:
    /**
     * 初始化 FFmpeg
     */
    void init_ffmpeg();

    /**
     * 清理 FFmpeg 资源
     */
    void cleanup_ffmpeg();

    /**
     * 将内存数据转换为 AVFormatContext
     */
    AVFormatContext* create_input_context(const std::string& audio_data, const std::string& format);

    /**
     * 创建输出上下文
     */
    AVFormatContext* create_output_context(const std::string& format);

    /**
     * 执行音频重采样
     */
    std::string resample_audio(AVFrame* input_frame, 
                              int target_sample_rate, 
                              int target_channels,
                              AVSampleFormat target_format);

    /**
     * 格式名称映射
     */
    const char* get_ffmpeg_format_name(const std::string& format);
    AVCodecID get_codec_id(const std::string& format);
    AVSampleFormat get_sample_format(const std::string& format);

    /**
     * 为PCM数据添加WAV头
     */
    std::string add_wav_header(const std::vector<uint8_t>& pcm_data, int sample_rate, int channels);

    bool initialized_;
};

} // namespace sparkchain
