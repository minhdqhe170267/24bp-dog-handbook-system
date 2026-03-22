package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import vn.edu.fpt.doghandbook.backend.dto.request.DogAssignmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.service.DogAssignmentService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

@RestController
@RequestMapping("/assignments")
@RequiredArgsConstructor
public class DogAssignmentController {

    private final DogAssignmentService dogAssignmentService;

    @PostMapping
    public ResponseEntity<ApiResponse<?>> assign(@Valid @RequestBody DogAssignmentRequest request,
                                                  Authentication authentication) {
        Integer assignorId = AuthenticationUtils.extractUserId(authentication);
        return ResponseEntity.status(201)
                .body(ApiResponse.success(dogAssignmentService.assign(request, assignorId), "Phân công chó thành công"));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable Integer id, @Valid @RequestBody DogAssignmentRequest request) {
        return ApiResponse.success(dogAssignmentService.update(id, request), "Cập nhật phân công thành công");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> unassign(@PathVariable Integer id) {
        dogAssignmentService.unassign(id);
        return ApiResponse.success(null, "Hủy phân công thành công");
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getById(@PathVariable Integer id) {
        return ApiResponse.success(dogAssignmentService.getById(id));
    }

    @GetMapping("/by-trainer/{trainerId}")
    public ApiResponse<?> getByTrainer(@PathVariable Integer trainerId) {
        return ApiResponse.success(dogAssignmentService.getByTrainer(trainerId));
    }

    @GetMapping("/by-dog/{dogId}")
    public ApiResponse<?> getByDog(@PathVariable Integer dogId) {
        return ApiResponse.success(dogAssignmentService.getByDog(dogId));
    }
}
