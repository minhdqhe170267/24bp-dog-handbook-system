package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingSpecialtyRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.service.TrainingSpecialtyService;

@RestController
@RequestMapping("/training-specialties")
@RequiredArgsConstructor
public class TrainingSpecialtyController {

    private final TrainingSpecialtyService trainingSpecialtyService;

    @GetMapping
    public ApiResponse<?> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(trainingSpecialtyService.getAll(page, size, search));
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getById(@PathVariable Integer id) {
        return ApiResponse.success(trainingSpecialtyService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<?> create(@Valid @RequestBody TrainingSpecialtyRequest request) {
        return ApiResponse.success(trainingSpecialtyService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable Integer id, @Valid @RequestBody TrainingSpecialtyRequest request) {
        return ApiResponse.success(trainingSpecialtyService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> delete(@PathVariable Integer id) {
        trainingSpecialtyService.delete(id);
        return ApiResponse.success(null, "Xóa chuyên ngành thành công");
    }
}
