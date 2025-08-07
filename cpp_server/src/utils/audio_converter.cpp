#include "utils/audio_converter.h"
#include "utils/logger.h"
#include "utils/file_utils.h"

#include <iostream>
#include <vector>
#include <cstring>
#include <algorithm>

namespace sparkchain {

// 自定义 AVIOContext 读取回调
struct MemoryBuffer {
    const uint8_t* data;
    size_t size;
    size_t pos;
};

static int read_packet(void* opaque, uint8_t* buf, int buf_size) {
    MemoryBuffer* buffer = static_cast<MemoryBuffer*>(opaque);
    
    if (buffer->pos >= buffer->size) {
        return AVERROR_EOF;
    }
    
    size_t remaining = buffer->size - buffer->pos;
    size_t to_read = std::min(static_cast<size_t>(buf_size), remaining);
    
    memcpy(buf, buffer->data + buffer->pos, to_read);
    buffer->pos += to_read;
    
    return static_cast<int>(to_read);
}

static int64_t seek_packet(void* opaque, int64_t offset, int whence) {
    MemoryBuffer* buffer = static_cast<MemoryBuffer*>(opaque);
    
    switch (whence) {
        case AVSEEK_SIZE:
            return buffer->size;
        case SEEK_SET:
            buffer->pos = offset;
            break;
        case SEEK_CUR:
            buffer->pos += offset;
            break;
        case SEEK_END:
            buffer->pos = buffer->size + offset;
            break;
        default:
            return -1;
    }
    
    if (buffer->pos > buffer->size) {
        buffer->pos = buffer->size;
    }
    
    return buffer->pos;
}

AudioConverter::AudioConverter() : initialized_(false) {
    init_ffmpeg();
}

AudioConverter::~AudioConverter() {
    cleanup_ffmpeg();
}

void AudioConverter::init_ffmpeg() {
    if (initialized_) {
        return;
    }
    
    try {
        // 初始化FFmpeg库 (FFmpeg 4.4+ 不需要显式注册)
        // av_register_all(); // 在新版本中已被废弃
        
        initialized_ = true;
        LOG_INFO("FFmpeg 音频转换器初始化完成");
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("FFmpeg 初始化失败: %s", e.what());
        initialized_ = false;
    }
}

void AudioConverter::cleanup_ffmpeg() {
    if (initialized_) {
        LOG_INFO("清理 FFmpeg 音频转换器资源...");
        initialized_ = false;
    }
}

std::string AudioConverter::convert_format(const std::string& input_data,
                                          const std::string& input_format,
                                          const std::string& output_format,
                                          int sample_rate,
                                          int channels) {
    if (!initialized_) {
        LOG_ERROR("FFmpeg 未初始化");
        return "";
    }
    
    if (input_data.empty()) {
        LOG_ERROR("输入音频数据为空");
        return "";
    }
    
    // 如果格式相同，直接返回原数据
    if (input_format == output_format) {
        LOG_INFO("输入输出格式相同，直接返回原数据");
        return input_data;
    }
    
    LOG_INFO_F("开始音频格式转换: %s -> %s, 采样率: %d, 声道: %d", 
              input_format.c_str(), output_format.c_str(), sample_rate, channels);
    
    AVFormatContext* input_ctx = nullptr;
    AVFormatContext* output_ctx = nullptr;
    AVCodecContext* decoder_ctx = nullptr;
    AVCodecContext* encoder_ctx = nullptr;
    SwrContext* swr_ctx = nullptr;
    
    std::string result;
    
    try {
        // 创建输入上下文
        input_ctx = create_input_context(input_data, input_format);
        if (!input_ctx) {
            throw std::runtime_error("无法创建输入上下文");
        }
        
        // 查找音频流
        int audio_stream_index = -1;
        for (unsigned int i = 0; i < input_ctx->nb_streams; i++) {
            if (input_ctx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_AUDIO) {
                audio_stream_index = i;
                break;
            }
        }
        
        if (audio_stream_index == -1) {
            throw std::runtime_error("未找到音频流");
        }
        
        AVStream* input_stream = input_ctx->streams[audio_stream_index];
        AVCodecParameters* input_codecpar = input_stream->codecpar;
        
        // 创建解码器
        const AVCodec* decoder = avcodec_find_decoder(input_codecpar->codec_id);
        if (!decoder) {
            throw std::runtime_error("未找到解码器");
        }
        
        decoder_ctx = avcodec_alloc_context3(decoder);
        if (!decoder_ctx) {
            throw std::runtime_error("无法分配解码器上下文");
        }
        
        if (avcodec_parameters_to_context(decoder_ctx, input_codecpar) < 0) {
            throw std::runtime_error("无法复制解码器参数");
        }
        
        if (avcodec_open2(decoder_ctx, decoder, nullptr) < 0) {
            throw std::runtime_error("无法打开解码器");
        }
        
        // 设置重采样参数
        swr_ctx = swr_alloc();
        if (!swr_ctx) {
            throw std::runtime_error("无法分配重采样上下文件");
        }
        
        // 配置重采样参数
        av_opt_set_int(swr_ctx, "in_channel_layout", decoder_ctx->channel_layout ? decoder_ctx->channel_layout : av_get_default_channel_layout(decoder_ctx->channels), 0);
        av_opt_set_int(swr_ctx, "in_sample_rate", decoder_ctx->sample_rate, 0);
        av_opt_set_sample_fmt(swr_ctx, "in_sample_fmt", decoder_ctx->sample_fmt, 0);
        
        av_opt_set_int(swr_ctx, "out_channel_layout", av_get_default_channel_layout(channels), 0);
        av_opt_set_int(swr_ctx, "out_sample_rate", sample_rate, 0);
        av_opt_set_sample_fmt(swr_ctx, "out_sample_fmt", AV_SAMPLE_FMT_S16, 0);
        
        if (swr_init(swr_ctx) < 0) {
            throw std::runtime_error("无法初始化重采样器");
        }
        
        // 解码和重采样
        AVPacket* packet = av_packet_alloc();
        AVFrame* frame = av_frame_alloc();
        AVFrame* resampled_frame = av_frame_alloc();
        
        std::vector<uint8_t> output_buffer;
        
        while (av_read_frame(input_ctx, packet) >= 0) {
            if (packet->stream_index == audio_stream_index) {
                if (avcodec_send_packet(decoder_ctx, packet) >= 0) {
                    while (avcodec_receive_frame(decoder_ctx, frame) >= 0) {
                        // 分配重采样输出缓冲区
                        int out_samples = swr_get_out_samples(swr_ctx, frame->nb_samples);
                        
                        resampled_frame->format = AV_SAMPLE_FMT_S16;
                        resampled_frame->channel_layout = av_get_default_channel_layout(channels);
                        resampled_frame->sample_rate = sample_rate;
                        resampled_frame->nb_samples = out_samples;
                        
                        if (av_frame_get_buffer(resampled_frame, 0) < 0) {
                            throw std::runtime_error("无法分配重采样帧缓冲区");
                        }
                        
                        // 执行重采样
                        int converted_samples = swr_convert(swr_ctx,
                                                          resampled_frame->data, out_samples,
                                                          (const uint8_t**)frame->data, frame->nb_samples);
                        
                        if (converted_samples < 0) {
                            throw std::runtime_error("重采样失败");
                        }
                        
                        // 将重采样后的数据添加到输出缓冲区
                        int data_size = converted_samples * channels * sizeof(int16_t);
                        output_buffer.insert(output_buffer.end(), 
                                           resampled_frame->data[0], 
                                           resampled_frame->data[0] + data_size);
                        
                        av_frame_unref(resampled_frame);
                    }
                }
            }
            av_packet_unref(packet);
        }
        
        // 冲刷重采样器
        int converted_samples = swr_convert(swr_ctx, resampled_frame->data, 4096, nullptr, 0);
        if (converted_samples > 0) {
            int data_size = converted_samples * channels * sizeof(int16_t);
            output_buffer.insert(output_buffer.end(), 
                               resampled_frame->data[0], 
                               resampled_frame->data[0] + data_size);
        }
        
        // 根据输出格式处理数据
        if (output_format == "pcm" || output_format == "raw") {
            // PCM 原始数据
            result = std::string(reinterpret_cast<const char*>(output_buffer.data()), output_buffer.size());
        } else if (output_format == "wav") {
            // 添加 WAV 头
            result = add_wav_header(output_buffer, sample_rate, channels);
        } else {
            // 其他格式暂时不支持
            LOG_WARN_F("输出格式 %s 暂不支持，返回 PCM 数据", output_format.c_str());
            result = std::string(reinterpret_cast<const char*>(output_buffer.data()), output_buffer.size());
        }
        
        // 清理资源
        av_frame_free(&frame);
        av_frame_free(&resampled_frame);
        av_packet_free(&packet);
        
        LOG_INFO_F("音频格式转换完成，输出大小: %zu bytes", result.size());
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("音频格式转换失败: %s", e.what());
        result.clear();
    }
    
    // 清理资源
    if (swr_ctx) {
        swr_free(&swr_ctx);
    }
    if (decoder_ctx) {
        avcodec_free_context(&decoder_ctx);
    }
    if (encoder_ctx) {
        avcodec_free_context(&encoder_ctx);
    }
    if (input_ctx) {
        avformat_close_input(&input_ctx);
    }
    if (output_ctx) {
        avformat_free_context(output_ctx);
    }
    
    return result;
}

std::string AudioConverter::detect_format(const std::string& audio_data) {
    if (audio_data.size() < 12) {
        return "unknown";
    }
    
    const uint8_t* data = reinterpret_cast<const uint8_t*>(audio_data.data());
    
    // WAV format detection
    if (memcmp(data, "RIFF", 4) == 0 && memcmp(data + 8, "WAVE", 4) == 0) {
        return "wav";
    }
    
    // MP3 format detection
    if ((data[0] == 0xFF && (data[1] & 0xE0) == 0xE0) ||  // MP3 sync word
        memcmp(data, "ID3", 3) == 0) {  // ID3 tag
        return "mp3";
    }
    
    // FLAC format detection
    if (memcmp(data, "fLaC", 4) == 0) {
        return "flac";
    }
    
    // OGG format detection
    if (memcmp(data, "OggS", 4) == 0) {
        return "ogg";
    }
    
    // AAC format detection (ADTS)
    if (data[0] == 0xFF && (data[1] & 0xF0) == 0xF0) {
        return "aac";
    }
    
    // 默认假设为 PCM
    return "pcm";
}

bool AudioConverter::validate_audio_data(const std::string& audio_data, const std::string& format) {
    if (audio_data.empty()) {
        return false;
    }
    
    if (audio_data.size() < 44 && format == "wav") {  // WAV minimum header size
        return false;
    }
    
    if (audio_data.size() < 10 && format == "mp3") {  // MP3 minimum frame size
        return false;
    }
    
    std::string detected_format = detect_format(audio_data);
    if (detected_format != format && detected_format != "unknown") {
        LOG_WARN_F("检测到的格式 (%s) 与指定格式 (%s) 不匹配", 
                  detected_format.c_str(), format.c_str());
        return false;
    }
    
    return true;
}

AudioConverter::AudioInfo AudioConverter::get_audio_info(const std::string& audio_data, const std::string& format) {
    AudioInfo info;
    
    if (!initialized_ || audio_data.empty()) {
        return info;
    }
    
    AVFormatContext* input_ctx = nullptr;
    
    try {
        input_ctx = create_input_context(audio_data, format);
        if (!input_ctx) {
            return info;
        }
        
        // 查找音频流
        int audio_stream_index = -1;
        for (unsigned int i = 0; i < input_ctx->nb_streams; i++) {
            if (input_ctx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_AUDIO) {
                audio_stream_index = i;
                break;
            }
        }
        
        if (audio_stream_index == -1) {
            return info;
        }
        
        AVStream* stream = input_ctx->streams[audio_stream_index];
        AVCodecParameters* codecpar = stream->codecpar;
        
        info.sample_rate = codecpar->sample_rate;
        info.channels = codecpar->channels;
        info.bit_rate = static_cast<int>(codecpar->bit_rate);
        info.duration = static_cast<double>(input_ctx->duration) / AV_TIME_BASE;
        
        const AVCodec* codec = avcodec_find_decoder(codecpar->codec_id);
        if (codec) {
            info.codec_name = codec->name;
        }
        
        info.is_valid = true;
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("获取音频信息失败: %s", e.what()); 
    }
    
    if (input_ctx) {
        avformat_close_input(&input_ctx);
    }
    
    return info;
}

AVFormatContext* AudioConverter::create_input_context(const std::string& audio_data, const std::string& format) {
    AVFormatContext* format_ctx = avformat_alloc_context();
    if (!format_ctx) {
        return nullptr;
    }
    
    // 创建内存缓冲区
    MemoryBuffer* buffer = new MemoryBuffer();
    buffer->data = reinterpret_cast<const uint8_t*>(audio_data.data());
    buffer->size = audio_data.size();
    buffer->pos = 0;
    
    // 创建 AVIOContext
    uint8_t* avio_buffer = static_cast<uint8_t*>(av_malloc(4096));
    AVIOContext* avio_ctx = avio_alloc_context(avio_buffer, 4096, 0, buffer, read_packet, nullptr, seek_packet);
    
    if (!avio_ctx) {
        delete buffer;
        av_free(avio_buffer);
        avformat_free_context(format_ctx);
        return nullptr;
    }
    
    format_ctx->pb = avio_ctx;
    
    // 尝试打开输入
    AVInputFormat* input_format = nullptr;
    if (format != "auto") {
        input_format = av_find_input_format(get_ffmpeg_format_name(format));
    }
    
    if (avformat_open_input(&format_ctx, nullptr, input_format, nullptr) < 0) {
        delete buffer;
        av_free(avio_ctx->buffer);
        av_free(avio_ctx);
        return nullptr;
    }
    
    if (avformat_find_stream_info(format_ctx, nullptr) < 0) {
        delete buffer;
        avformat_close_input(&format_ctx);
        return nullptr;
    }
    
    return format_ctx;
}

AVFormatContext* AudioConverter::create_output_context(const std::string& format) {
    AVFormatContext* format_ctx = nullptr;
    
    const char* format_name = get_ffmpeg_format_name(format);
    if (avformat_alloc_output_context2(&format_ctx, nullptr, format_name, nullptr) < 0) {
        return nullptr;
    }
    
    return format_ctx;
}

const char* AudioConverter::get_ffmpeg_format_name(const std::string& format) {
    if (format == "wav") return "wav";
    if (format == "mp3") return "mp3";
    if (format == "flac") return "flac";
    if (format == "ogg") return "ogg";
    if (format == "aac") return "aac";
    if (format == "pcm" || format == "raw") return "s16le";
    return "wav";  // default
}

AVCodecID AudioConverter::get_codec_id(const std::string& format) {
    if (format == "wav") return AV_CODEC_ID_PCM_S16LE;
    if (format == "mp3") return AV_CODEC_ID_MP3;
    if (format == "flac") return AV_CODEC_ID_FLAC;
    if (format == "aac") return AV_CODEC_ID_AAC;
    if (format == "pcm" || format == "raw") return AV_CODEC_ID_PCM_S16LE;
    return AV_CODEC_ID_PCM_S16LE;  // default
}

AVSampleFormat AudioConverter::get_sample_format(const std::string& format) {
    if (format == "wav") return AV_SAMPLE_FMT_S16;
    if (format == "mp3") return AV_SAMPLE_FMT_S16P;
    if (format == "flac") return AV_SAMPLE_FMT_S32;
    if (format == "aac") return AV_SAMPLE_FMT_FLTP;
    if (format == "pcm" || format == "raw") return AV_SAMPLE_FMT_S16;
    return AV_SAMPLE_FMT_S16;  // default
}

std::string AudioConverter::add_wav_header(const std::vector<uint8_t>& pcm_data, int sample_rate, int channels) {
    struct WAVHeader {
        char riff[4] = {'R', 'I', 'F', 'F'};
        uint32_t file_size;
        char wave[4] = {'W', 'A', 'V', 'E'};
        char fmt[4] = {'f', 'm', 't', ' '};
        uint32_t fmt_size = 16;
        uint16_t format = 1;  // PCM
        uint16_t channels;
        uint32_t sample_rate;
        uint32_t byte_rate;
        uint16_t block_align;
        uint16_t bits_per_sample = 16;
        char data[4] = {'d', 'a', 't', 'a'};
        uint32_t data_size;
    };
    
    WAVHeader header;
    header.channels = channels;
    header.sample_rate = sample_rate;
    header.byte_rate = sample_rate * channels * 2;  // 16-bit samples
    header.block_align = channels * 2;
    header.data_size = pcm_data.size();
    header.file_size = sizeof(WAVHeader) - 8 + pcm_data.size();
    
    std::string result;
    result.reserve(sizeof(WAVHeader) + pcm_data.size());
    
    // 添加WAV头
    result.append(reinterpret_cast<const char*>(&header), sizeof(WAVHeader));
    
    // 添加PCM数据
    result.append(reinterpret_cast<const char*>(pcm_data.data()), pcm_data.size());
    
    return result;
}

} // namespace sparkchain
