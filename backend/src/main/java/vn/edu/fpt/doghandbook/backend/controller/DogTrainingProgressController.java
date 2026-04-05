package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import vn.edu.fpt.doghandbook.backend.dto.request.EvaluateExerciseProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.UpdateTrainingProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.service.DogTrainingProgressService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

@RestController
@RequestMapping("/training-progress")
@RequiredArgsConstructor
public class DogTrainingProgressController {

    private final DogTrainingProgressService dogTrainingProgressService;

    @GetMapping("/{id}")
    public ApiResponse<?> getDetail(@PathVariable Integer id) {
        return ApiResponse.success(dogTrainingProgressService.getDetail(id));
    }

    @GetMapping("/dog/{dogId}")
    public ApiResponse<?> getByDog(@PathVariable Integer dogId) {
        return ApiResponse.success(dogTrainingProgressService.getByDog(dogId));
    }

    @GetMapping("/trainer/{trainerId}")
    public ApiResponse<?> getByTrainer(@PathVariable Integer trainerId) {
        return ApiResponse.success(dogTrainingProgressService.getByTrainer(trainerId));
    }

    @GetMapping("/my")
    public ApiResponse<?> getMine(Authentication authentication) {
        return ApiResponse.success(dogTrainingProgressService.getMine(AuthenticationUtils.extractUserId(authentication)));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> updateEnrollment(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateTrainingProgressRequest request) {
        return ApiResponse.success(dogTrainingProgressService.updateEnrollment(id, request));
    }

    @PostMapping("/exercises/{progressId}/evaluate")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<?> evaluateExercise(
            @PathVariable Integer progressId,
            @Valid @RequestBody EvaluateExerciseProgressRequest request,
            Authentication authentication) {
        return ApiResponse.success(
                dogTrainingProgressService.evaluateExercise(
                        progressId,
                        request,
                        AuthenticationUtils.extractUserId(authentication)
                )
        );
    }
}
