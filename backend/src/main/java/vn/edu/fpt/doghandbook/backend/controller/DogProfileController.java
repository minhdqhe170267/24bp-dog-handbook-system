package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.request.DogProfileRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DogProfileResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.DogProfileService;

@RestController
@RequestMapping("/dogs")
@RequiredArgsConstructor
public class DogProfileController {

    private final DogProfileService dogProfileService;

    @GetMapping
    public ApiResponse<PageResponse<DogProfileResponse>> getAllDogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(dogProfileService.getAll(page, size, search));
    }

    @GetMapping("/{id}")
    public ApiResponse<DogProfileResponse> getDogById(@PathVariable Integer id) {
        return ApiResponse.success(dogProfileService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DogProfileResponse> createDog(@Valid @RequestBody DogProfileRequest request) {
        return ApiResponse.success(dogProfileService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<DogProfileResponse> updateDog(
            @PathVariable Integer id,
            @Valid @RequestBody DogProfileRequest request) {
        return ApiResponse.success(dogProfileService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteDog(@PathVariable Integer id) {
        dogProfileService.delete(id);
        return ApiResponse.success(null);
    }
}
