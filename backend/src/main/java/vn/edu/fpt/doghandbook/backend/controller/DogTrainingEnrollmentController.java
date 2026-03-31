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
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.EnrollDogRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.EvaluateExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.UpdateEnrollmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.EnrollmentDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.EnrollmentResponse;
import vn.edu.fpt.doghandbook.backend.service.DogTrainingEnrollmentService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

import java.util.List;

@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
public class DogTrainingEnrollmentController {

    private final DogTrainingEnrollmentService dogTrainingEnrollmentService;

    @PostMapping
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enrollDog(@Valid @RequestBody EnrollDogRequest request) {
        EnrollmentResponse response = dogTrainingEnrollmentService.enrollDog(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/my")
    public ApiResponse<List<EnrollmentResponse>> getMyEnrollments(Authentication authentication) {
        Integer trainerId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(dogTrainingEnrollmentService.getMyEnrollments(trainerId));
    }

    @GetMapping("/{id}")
    public ApiResponse<EnrollmentDetailResponse> getEnrollmentDetail(@PathVariable("id") Integer id) {
        return ApiResponse.success(dogTrainingEnrollmentService.getEnrollmentDetail(id));
    }

    @GetMapping("/dog/{dogId}")
    public ApiResponse<List<EnrollmentResponse>> getEnrollmentsByDog(@PathVariable Integer dogId) {
        return ApiResponse.success(dogTrainingEnrollmentService.getEnrollmentsByDog(dogId));
    }

    @GetMapping("/trainer/{trainerId}")
    public ApiResponse<List<EnrollmentResponse>> getEnrollmentsByTrainer(@PathVariable Integer trainerId) {
        return ApiResponse.success(dogTrainingEnrollmentService.getEnrollmentsByTrainer(trainerId));
    }

    @PutMapping("/{id}")
    public ApiResponse<EnrollmentResponse> updateEnrollment(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateEnrollmentRequest request
    ) {
        return ApiResponse.success(dogTrainingEnrollmentService.updateEnrollment(id, request));
    }

    @PutMapping("/{id}/restore")
    public ApiResponse<EnrollmentResponse> restoreEnrollment(@PathVariable Integer id) {
        return ApiResponse.success(dogTrainingEnrollmentService.restoreEnrollment(id), "Khôi phục thành công");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteEnrollment(@PathVariable Integer id) {
        dogTrainingEnrollmentService.deleteEnrollment(id);
        return ApiResponse.success(null, "Xóa thành công");
    }

    @PostMapping("/{id}/evaluate")
    public ApiResponse<EnrollmentResponse> evaluateExercise(
            @PathVariable Integer id,
            @Valid @RequestBody EvaluateExerciseRequest request,
            Authentication authentication
    ) {
        Integer evaluatorId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(dogTrainingEnrollmentService.evaluateExercise(id, request, evaluatorId));
    }
}
