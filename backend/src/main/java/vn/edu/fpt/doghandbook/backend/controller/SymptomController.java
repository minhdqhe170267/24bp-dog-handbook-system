package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.request.SymptomRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomResponse;
import vn.edu.fpt.doghandbook.backend.service.SymptomService;

import java.util.List;

@RestController
@RequestMapping("/symptoms")
@RequiredArgsConstructor
public class SymptomController {

    private final SymptomService symptomService;

    @GetMapping
    public ApiResponse<List<SymptomResponse>> getAllSymptoms() {
        return ApiResponse.success(symptomService.getAll());
    }

    @GetMapping("/{id}")
    public ApiResponse<SymptomResponse> getById(@PathVariable("id") Integer id) {
        return ApiResponse.success(symptomService.getById(id));
    }

    @GetMapping("/by-category")
    public ApiResponse<List<SymptomResponse>> getByCategory(@RequestParam String category) {
        return ApiResponse.success(symptomService.getByCategory(category));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SymptomResponse>> create(
            @Valid @RequestBody SymptomRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(symptomService.create(request)));
    }

    @PutMapping("/{id}")
    public ApiResponse<SymptomResponse> update(
            @PathVariable("id") Integer id,
            @Valid @RequestBody SymptomRequest request) {
        return ApiResponse.success(symptomService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") Integer id) {
        symptomService.delete(id);
        return ApiResponse.success(null, "Xóa triệu chứng thành công");
    }
}
