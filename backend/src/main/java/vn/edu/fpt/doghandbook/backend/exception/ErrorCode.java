package vn.edu.fpt.doghandbook.backend.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {

    // --- Authentication ---
    UNAUTHORIZED("Phiên đăng nhập đã hết hạn hoặc không hợp lệ"),
    USER_NOT_FOUND("Tài khoản không tồn tại"),
    USER_LOCKED("Tài khoản đã bị khóa"),
    USER_DISABLED("Tài khoản đã bị vô hiệu hóa"),
    WRONG_PASSWORD("Sai mật khẩu"),

    // --- Authorization ---
    ACCESS_DENIED("Bạn không có quyền thực hiện thao tác này"),

    // --- Validation ---
    VALIDATION_ERROR("Dữ liệu không hợp lệ"),
    MISSING_PARAMETER("Thiếu tham số bắt buộc"),

    // --- Resource ---
    NOT_FOUND("Không tìm thấy tài nguyên"),
    ENDPOINT_NOT_FOUND("Không tìm thấy endpoint"),

    // --- Conflict ---
    CONFLICT("Dữ liệu bị trùng lặp hoặc xung đột"),
    SYNC_CONFLICT("Xung đột đồng bộ dữ liệu"),

    // --- Content workflow ---
    CONTENT_PUBLISHED("Nội dung đã xuất bản, cần gỡ xuất bản trước"),

    // --- Media ---
    FILE_REQUIRED("File là bắt buộc"),
    FILE_INVALID("File không hợp lệ"),
    FILE_TOO_LARGE("File vượt quá dung lượng cho phép"),
    UNSUPPORTED_FORMAT("Định dạng file không được hỗ trợ"),

    // --- Import ---
    IMPORT_ERROR("Lỗi import dữ liệu"),

    // --- General ---
    BAD_REQUEST("Yêu cầu không hợp lệ"),
    INTERNAL_ERROR("Đã xảy ra lỗi hệ thống");

    private final String defaultMessage;

    ErrorCode(String defaultMessage) {
        this.defaultMessage = defaultMessage;
    }
}
