package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingMethodRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingMethodResponse;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.TrainingService;

import java.util.Locale;

@RestController
@RequestMapping("/training-methods")
@RequiredArgsConstructor
public class TrainingMethodController {

    private final TrainingService trainingService;

    @GetMapping
    public ApiResponse<PageResponse<TrainingMethodResponse>> getAllMethods(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search) {
        return ApiResponse.success(trainingService.getAllMethods(page, size, search));
    }

    @GetMapping("/{id}")
    public ApiResponse<TrainingMethodResponse> getMethodById(@PathVariable("id") Integer id) {
        return ApiResponse.success(trainingService.getMethodById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TrainingMethodResponse>> createMethod(
            @Valid @RequestBody TrainingMethodRequest request,
            Authentication authentication) {
        TrainingMethodResponse response = trainingService.createMethod(request, extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<TrainingMethodResponse> updateMethod(
            @PathVariable("id") Integer id,
            @Valid @RequestBody TrainingMethodRequest request) {
        return ApiResponse.success(trainingService.updateMethod(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteMethod(@PathVariable("id") Integer id) {
        trainingService.deleteMethod(id);
        return ApiResponse.success(null, "Xóa thành công");
    }

    private Integer extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new BadRequestException("Không xác định được người dùng đăng nhập");
        }

        Object principal = authentication.getPrincipal();

        try {
            Object value = principal.getClass().getMethod("getUserId").invoke(principal);
            if (value instanceof Number number) {
                return number.intValue();
            }
        } catch (ReflectiveOperationException ignored) {
        }

        if (principal instanceof Number number) {
            return number.intValue();
        }

        if (principal instanceof String text) {
            try {
                return Integer.valueOf(text.trim());
            } catch (NumberFormatException ignored) {
                if ("anonymousUser".equals(text.toLowerCase(Locale.ROOT))) {
                    throw new BadRequestException("Không xác định được người dùng đăng nhập");
                }
            }
        }

        throw new BadRequestException("Không xác định được userId từ Authentication principal");
    }
}
