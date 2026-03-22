package vn.edu.fpt.doghandbook.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.exception.ErrorCode;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private T data;
    private String message;
    private String errorCode;
    private List<FieldError> errors;
    private LocalDateTime timestamp;

    // ---- Success factories ----

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message("Thành công")
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    // ---- Error factories (backward compatible) ----

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .data(null)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(ErrorCode code) {
        return ApiResponse.<T>builder()
                .success(false)
                .data(null)
                .errorCode(code.name())
                .message(code.getDefaultMessage())
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(ErrorCode code, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .data(null)
                .errorCode(code.name())
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(ErrorCode code, String message, List<FieldError> fieldErrors) {
        return ApiResponse.<T>builder()
                .success(false)
                .data(null)
                .errorCode(code.name())
                .message(message)
                .errors(fieldErrors)
                .timestamp(LocalDateTime.now())
                .build();
    }

    // ---- Inner FieldError ----

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class FieldError {
        private String field;
        private String message;
    }
}
