package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.EnrollDogRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.EvaluateExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.UpdateEnrollmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.EnrollmentDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.EnrollmentResponse;

import java.util.List;

public interface DogTrainingEnrollmentService {

    EnrollmentResponse enrollDog(EnrollDogRequest request);

    EnrollmentDetailResponse getEnrollmentDetail(Integer enrollmentId);

    EnrollmentResponse evaluateExercise(Integer enrollmentId, EvaluateExerciseRequest request, Integer evaluatorId);

    List<EnrollmentResponse> getEnrollmentsByDog(Integer dogId);

    List<EnrollmentResponse> getEnrollmentsByTrainer(Integer trainerId);

    List<EnrollmentResponse> getMyEnrollments(Integer trainerId);

    EnrollmentResponse updateEnrollment(Integer enrollmentId, UpdateEnrollmentRequest request);

    void deleteEnrollment(Integer enrollmentId);

    EnrollmentResponse restoreEnrollment(Integer enrollmentId);
}
