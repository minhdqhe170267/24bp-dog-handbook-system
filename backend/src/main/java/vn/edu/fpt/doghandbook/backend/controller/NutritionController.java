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
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.NutritionCalculatorService;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/nutrition-standards")
@RequiredArgsConstructor
public class NutritionController {

    private final NutritionService nutritionService;
    private final NutritionCalculatorService nutritionCalculatorService;

    @GetMapping
    public ApiResponse<PageResponse<NutritionStandardResponse>> getAll(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search) {
        return ApiResponse.success(nutritionService.getAll(page, size, search));
    }

    @GetMapping("/{id}")
    public ApiResponse<NutritionStandardResponse> getById(@PathVariable("id") Integer id) {
        return ApiResponse.success(nutritionService.getById(id));
    }

    @GetMapping("/by-breed/{breedId}")
    public ApiResponse<List<NutritionStandardResponse>> getByBreedId(@PathVariable("breedId") Integer breedId) {
        return ApiResponse.success(nutritionService.getByBreedId(breedId));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NutritionStandardResponse>> create(
            @Valid @RequestBody NutritionStandardRequest request,
            Authentication authentication) {
        Integer userId = extractUserId(authentication);
        NutritionStandardResponse response = nutritionService.create(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Tạo khẩu phần thành công"));
    }

    @PutMapping("/{id}")
    public ApiResponse<NutritionStandardResponse> update(
            @PathVariable("id") Integer id,
            @Valid @RequestBody NutritionStandardRequest request) {
        return ApiResponse.success(nutritionService.update(id, request), "Cập nhật thành công");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") Integer id) {
        nutritionService.delete(id);
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
