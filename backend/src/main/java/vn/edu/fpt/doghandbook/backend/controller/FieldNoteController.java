package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.request.FieldNoteRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.FieldNoteResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.FieldNoteService;

@RestController
@RequestMapping("/field-notes")
@RequiredArgsConstructor
public class FieldNoteController {

    private final FieldNoteService fieldNoteService;

    @GetMapping
    public ApiResponse<PageResponse<FieldNoteResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(fieldNoteService.getAll(page, size, search));
    }

    @GetMapping("/my")
    public ApiResponse<PageResponse<FieldNoteResponse>> getByTrainer(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer trainerId = userDetails.getUser().getUserId();
        return ApiResponse.success(fieldNoteService.getByTrainer(trainerId, page, size));
    }

    @GetMapping("/by-dog/{dogId}")
    public ApiResponse<PageResponse<FieldNoteResponse>> getByDog(
            @PathVariable Integer dogId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.success(fieldNoteService.getByDog(dogId, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<FieldNoteResponse> getById(@PathVariable Integer id) {
        return ApiResponse.success(fieldNoteService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FieldNoteResponse>> create(
            @Valid @RequestBody FieldNoteRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer trainerId = userDetails.getUser().getUserId();
        FieldNoteResponse response = fieldNoteService.create(request, trainerId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<FieldNoteResponse> update(
            @PathVariable Integer id,
            @Valid @RequestBody FieldNoteRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer trainerId = userDetails.getUser().getUserId();
        return ApiResponse.success(fieldNoteService.update(id, request, trainerId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @PathVariable Integer id,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer trainerId = userDetails.getUser().getUserId();
        fieldNoteService.delete(id, trainerId);
        return ApiResponse.success(null);
    }
}
