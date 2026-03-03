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
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingExerciseResponse;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.TrainingService;

import java.util.Locale;

@RestController
@RequestMapping("/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final TrainingService trainingService;

    @GetMapping
    public ApiResponse<PageResponse<TrainingExerciseResponse>> getAllExercises(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "difficulty", required = false) String difficulty) {
        return ApiResponse.success(trainingService.getAllExercises(page, size, search, difficulty));
    }

    @GetMapping("/{id}")
    public ApiResponse<TrainingExerciseResponse> getExerciseById(@PathVariable("id") Integer id) {
        return ApiResponse.success(trainingService.getExerciseById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TrainingExerciseResponse>> createExercise(
            @Valid @RequestBody TrainingExerciseRequest request,
            Authentication authentication) {
        TrainingExerciseResponse response = trainingService.createExercise(request, extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<TrainingExerciseResponse> updateExercise(
            @PathVariable("id") Integer id,
            @Valid @RequestBody TrainingExerciseRequest request) {
        return ApiResponse.success(trainingService.updateExercise(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteExercise(@PathVariable("id") Integer id) {
        trainingService.deleteExercise(id);
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
