#include "utils/file_utils.h"
#include "utils/logger.h"

#include <fstream>
#include <filesystem>
#include <algorithm>
#include <random>
#include <ctime>

namespace sparkchain {

bool FileUtils::exists(const std::string& path) {
    try {
        return std::filesystem::exists(path);
    } catch (const std::exception& e) {
        LOG_ERROR_F("检查文件存在性失败: %s, 错误: %s", path.c_str(), e.what());
        return false;
    }
}

bool FileUtils::create_directory(const std::string& path) {
    try {
        return std::filesystem::create_directories(path);
    } catch (const std::exception& e) {
        LOG_ERROR_F("创建目录失败: %s, 错误: %s", path.c_str(), e.what());
        return false;
    }
}

bool FileUtils::remove_file(const std::string& path) {
    try {
        return std::filesystem::remove(path);
    } catch (const std::exception& e) {
        LOG_ERROR_F("删除文件失败: %s, 错误: %s", path.c_str(), e.what());
        return false;
    }
}

bool FileUtils::copy_file(const std::string& src, const std::string& dst) {
    try {
        std::filesystem::copy_file(src, dst, std::filesystem::copy_options::overwrite_existing);
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR_F("复制文件失败: %s -> %s, 错误: %s", src.c_str(), dst.c_str(), e.what());
        return false;
    }
}

std::string FileUtils::read_file(const std::string& path) {
    try {
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) {
            LOG_ERROR_F("打开文件失败: %s", path.c_str());
            return "";
        }
        
        file.seekg(0, std::ios::end);
        size_t size = file.tellg();
        file.seekg(0, std::ios::beg);
        
        std::string content(size, '\0');
        file.read(&content[0], size);
        
        return content;
    } catch (const std::exception& e) {
        LOG_ERROR_F("读取文件失败: %s, 错误: %s", path.c_str(), e.what());
        return "";
    }
}

bool FileUtils::write_file(const std::string& path, const std::string& content) {
    try {
        // 确保目录存在
        std::string dir = get_directory(path);
        if (!dir.empty() && !exists(dir)) {
            create_directory(dir);
        }
        
        std::ofstream file(path, std::ios::binary);
        if (!file.is_open()) {
            LOG_ERROR_F("创建文件失败: %s", path.c_str());
            return false;
        }
        
        file.write(content.c_str(), content.size());
        return file.good();
    } catch (const std::exception& e) {
        LOG_ERROR_F("写入文件失败: %s, 错误: %s", path.c_str(), e.what());
        return false;
    }
}

bool FileUtils::append_file(const std::string& path, const std::string& content) {
    try {
        std::ofstream file(path, std::ios::binary | std::ios::app);
        if (!file.is_open()) {
            LOG_ERROR_F("打开文件失败: %s", path.c_str());
            return false;
        }
        
        file.write(content.c_str(), content.size());
        return file.good();
    } catch (const std::exception& e) {
        LOG_ERROR_F("追加文件失败: %s, 错误: %s", path.c_str(), e.what());
        return false;
    }
}

std::vector<uint8_t> FileUtils::read_binary_file(const std::string& path) {
    try {
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) {
            LOG_ERROR_F("打开二进制文件失败: %s", path.c_str());
            return {};
        }
        
        file.seekg(0, std::ios::end);
        size_t size = file.tellg();
        file.seekg(0, std::ios::beg);
        
        std::vector<uint8_t> data(size);
        file.read(reinterpret_cast<char*>(data.data()), size);
        
        return data;
    } catch (const std::exception& e) {
        LOG_ERROR_F("读取二进制文件失败: %s, 错误: %s", path.c_str(), e.what());
        return {};
    }
}

bool FileUtils::write_binary_file(const std::string& path, 
                                 const std::vector<uint8_t>& data) {
    try {
        // 确保目录存在
        std::string dir = get_directory(path);
        if (!dir.empty() && !exists(dir)) {
            create_directory(dir);
        }
        
        std::ofstream file(path, std::ios::binary);
        if (!file.is_open()) {
            LOG_ERROR_F("创建二进制文件失败: %s", path.c_str());
            return false;
        }
        
        file.write(reinterpret_cast<const char*>(data.data()), data.size());
        return file.good();
    } catch (const std::exception& e) {
        LOG_ERROR_F("写入二进制文件失败: %s, 错误: %s", path.c_str(), e.what());
        return false;
    }
}

std::string FileUtils::get_file_extension(const std::string& path) {
    try {
        std::filesystem::path p(path);
        std::string ext = p.extension().string();
        if (!ext.empty() && ext[0] == '.') {
            ext = ext.substr(1); // 移除点号
        }
        return ext;
    } catch (const std::exception& e) {
        LOG_ERROR_F("获取文件扩展名失败: %s, 错误: %s", path.c_str(), e.what());
        return "";
    }
}

std::string FileUtils::get_filename(const std::string& path) {
    try {
        std::filesystem::path p(path);
        return p.filename().string();
    } catch (const std::exception& e) {
        LOG_ERROR_F("获取文件名失败: %s, 错误: %s", path.c_str(), e.what());
        return "";
    }
}

std::string FileUtils::get_directory(const std::string& path) {
    try {
        std::filesystem::path p(path);
        return p.parent_path().string();
    } catch (const std::exception& e) {
        LOG_ERROR_F("获取目录路径失败: %s, 错误: %s", path.c_str(), e.what());
        return "";
    }
}

std::string FileUtils::join_path(const std::string& dir, const std::string& filename) {
    try {
        std::filesystem::path p = std::filesystem::path(dir) / filename;
        return p.string();
    } catch (const std::exception& e) {
        LOG_ERROR_F("拼接路径失败: %s + %s, 错误: %s", dir.c_str(), filename.c_str(), e.what());
        return "";
    }
}

size_t FileUtils::get_file_size(const std::string& path) {
    try {
        return std::filesystem::file_size(path);
    } catch (const std::exception& e) {
        LOG_ERROR_F("获取文件大小失败: %s, 错误: %s", path.c_str(), e.what());
        return 0;
    }
}

std::string FileUtils::get_file_mime_type(const std::string& path) {
    std::string ext = get_file_extension(path);
    std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);
    
    // 基础MIME类型映射
    if (ext == "html" || ext == "htm") return "text/html";
    if (ext == "css") return "text/css";
    if (ext == "js") return "application/javascript";
    if (ext == "json") return "application/json";
    if (ext == "xml") return "application/xml";
    if (ext == "txt") return "text/plain";
    
    // 图片类型
    if (ext == "jpg" || ext == "jpeg") return "image/jpeg";
    if (ext == "png") return "image/png";
    if (ext == "gif") return "image/gif";
    if (ext == "svg") return "image/svg+xml";
    if (ext == "ico") return "image/x-icon";
    
    // 音频类型
    if (ext == "wav") return "audio/wav";
    if (ext == "mp3") return "audio/mpeg";
    if (ext == "m4a") return "audio/mp4";
    if (ext == "ogg") return "audio/ogg";
    
    // 视频类型
    if (ext == "mp4") return "video/mp4";
    if (ext == "avi") return "video/x-msvideo";
    if (ext == "mov") return "video/quicktime";
    
    return "application/octet-stream";
}

bool FileUtils::is_directory(const std::string& path) {
    try {
        return std::filesystem::is_directory(path);
    } catch (const std::exception& e) {
        LOG_ERROR_F("检查目录失败: %s, 错误: %s", path.c_str(), e.what());
        return false;
    }
}

std::string FileUtils::create_temp_file(const std::string& prefix, const std::string& suffix) {
    try {
        std::string temp_dir = get_temp_directory();
        
        // 生成唯一文件名
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(10000, 99999);
        
        std::string filename = prefix + std::to_string(std::time(nullptr)) + 
                              "_" + std::to_string(dis(gen)) + suffix;
        
        return join_path(temp_dir, filename);
    } catch (const std::exception& e) {
        LOG_ERROR_F("创建临时文件失败: %s", e.what());
        return "";
    }
}

std::string FileUtils::get_temp_directory() {
    try {
        return std::filesystem::temp_directory_path().string();
    } catch (const std::exception& e) {
        LOG_ERROR_F("获取临时目录失败: %s", e.what());
        return "/tmp"; // 回退到标准临时目录
    }
}

std::vector<std::string> FileUtils::list_files(const std::string& directory,
                                              const std::string& pattern) {
    std::vector<std::string> files;
    
    try {
        if (!is_directory(directory)) {
            LOG_WARN_F("路径不是目录: %s", directory.c_str());
            return files;
        }
        
        for (const auto& entry : std::filesystem::directory_iterator(directory)) {
            if (entry.is_regular_file()) {
                std::string filename = entry.path().filename().string();
                
                // 简单的通配符匹配（仅支持 * 和 ?）
                if (pattern == "*" || pattern.empty()) {
                    files.push_back(entry.path().string());
                } else {
                    // 可以添加更复杂的模式匹配逻辑
                    files.push_back(entry.path().string());
                }
            }
        }
        
        // 排序文件列表
        std::sort(files.begin(), files.end());
        
    } catch (const std::exception& e) {
        LOG_ERROR_F("列出文件失败: %s, 错误: %s", directory.c_str(), e.what());
    }
    
    return files;
}

bool FileUtils::ensure_directory_exists(const std::string& path) {
    if (exists(path)) {
        return is_directory(path);
    }
    
    return create_directory(path);
}

std::string FileUtils::normalize_path(const std::string& path) {
    try {
        std::filesystem::path p(path);
        return p.lexically_normal().string();
    } catch (const std::exception& e) {
        LOG_ERROR_F("规范化路径失败: %s, 错误: %s", path.c_str(), e.what());
        return path;
    }
}

} // namespace sparkchain
