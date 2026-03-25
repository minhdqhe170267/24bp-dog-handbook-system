package vn.edu.fpt.doghandbook.backend.entity.enums;

public enum ResolutionType {
    KEEP_SERVER,  // Giữ bản server, bỏ bản trainer
    KEEP_LOCAL,   // Overwrite server bằng bản trainer
    MERGED        // Admin chọn từng field → tạo bản merged
}
