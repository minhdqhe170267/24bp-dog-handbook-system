package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.EvaluateExerciseProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.UpdateTrainingProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingProgressDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingProgressSummaryResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;

import java.util.List;

public interface DogTrainingProgressService {

    void initializeForAssignment(DogAssignment assignment);

    void suspendForAssignment(DogAssignment assignment);

    List<TrainingProgressSummaryResponse> getByDog(Integer dogId);

    List<TrainingProgressSummaryResponse> getByTrainer(Integer trainerId);

    List<TrainingProgressSummaryResponse> getMine(Integer trainerId);

    TrainingProgressDetailResponse getDetail(Integer enrollmentId);

    TrainingProgressSummaryResponse updateEnrollment(Integer enrollmentId, UpdateTrainingProgressRequest request);

    TrainingProgressSummaryResponse evaluateExercise(Integer progressId, EvaluateExerciseProgressRequest request, Integer evaluatorId);
}
