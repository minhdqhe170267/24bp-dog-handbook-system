package vn.edu.fpt.doghandbook.backend.entity.enums;

public enum ConflictStatus {
    PENDING,    // Chưa resolve
    RESOLVED,   // Admin đã resolve (KEEP_LOCAL hoặc MERGED)
    DISMISSED   // Admin giữ bản server (KEEP_SERVER)
}
