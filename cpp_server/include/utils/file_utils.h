#pragma once

#include <string>
#include <vector>

namespace sparkchain {

class FileUtils {
public:
    // 文件操作
    static bool exists(const std::string& path);
    static bool create_directory(const std::string& path);
    static bool remove_file(const std::string& path);
    static bool copy_file(const std::string& src, const std::string& dst);
    
    // 文件读写
    static std::string read_file(const std::string& path);
    static bool write_file(const std::string& path, const std::string& content);
    static bool append_file(const std::string& path, const std::string& content);
    
    // 二进制文件操作
    static std::vector<uint8_t> read_binary_file(const std::string& path);
    static bool write_binary_file(const std::string& path, 
                                 const std::vector<uint8_t>& data);
    
    // 路径操作
    static std::string get_file_extension(const std::string& path);
    static std::string get_filename(const std::string& path);
    static std::string get_directory(const std::string& path);
    static std::string join_path(const std::string& dir, const std::string& filename);
    
    // 文件信息
    static size_t get_file_size(const std::string& path);
    static std::string get_file_mime_type(const std::string& path);
    static bool is_directory(const std::string& path);
    
    // 临时文件管理
    static std::string create_temp_file(const std::string& prefix = "sparkchain_",
                                       const std::string& suffix = ".tmp");
    static std::string get_temp_directory();
    
    // 文件列表
    static std::vector<std::string> list_files(const std::string& directory,
                                              const std::string& pattern = "*");

private:
    // 内部辅助方法
    static bool ensure_directory_exists(const std::string& path);
    static std::string normalize_path(const std::string& path);
};

} // namespace sparkchain
