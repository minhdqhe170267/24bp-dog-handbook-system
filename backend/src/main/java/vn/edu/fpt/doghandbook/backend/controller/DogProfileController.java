package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DogProfileResponse> createDogJson(
            @Valid @RequestBody DogProfileRequest request) {
        return ApiResponse.success(dogProfileService.create(request, null));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DogProfileResponse> createDogMultipart(
            @Valid @RequestPart("data") DogProfileRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return ApiResponse.success(dogProfileService.create(request, image));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<DogProfileResponse> updateDogJson(
            @PathVariable Integer id,
            @Valid @RequestBody DogProfileRequest request) {
        return ApiResponse.success(dogProfileService.update(id, request, null));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<DogProfileResponse> updateDogMultipart(
            @PathVariable Integer id,
            @Valid @RequestPart("data") DogProfileRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return ApiResponse.success(dogProfileService.update(id, request, image));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteDog(@PathVariable Integer id) {
        dogProfileService.delete(id);
        return ApiResponse.success(null);
    }
}
