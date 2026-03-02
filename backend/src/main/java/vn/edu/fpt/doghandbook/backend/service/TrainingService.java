package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.TrainingExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingMethodRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingRoadmapRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingExerciseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingMethodResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingRoadmapResponse;

public interface TrainingService {

    PageResponse<TrainingMethodResponse> getAllMethods(int page, int size, String search);

    TrainingMethodResponse getMethodById(Integer id);

    TrainingMethodResponse createMethod(TrainingMethodRequest request, Integer userId);

    TrainingMethodResponse updateMethod(Integer id, TrainingMethodRequest request);

    void deleteMethod(Integer id);

    PageResponse<TrainingExerciseResponse> getAllExercises(int page, int size, String search, String difficulty);

    TrainingExerciseResponse getExerciseById(Integer id);

    TrainingExerciseResponse createExercise(TrainingExerciseRequest request, Integer userId);

    TrainingExerciseResponse updateExercise(Integer id, TrainingExerciseRequest request);

    void deleteExercise(Integer id);

    PageResponse<TrainingRoadmapResponse> getAllRoadmaps(int page, int size);

    TrainingRoadmapResponse getRoadmapById(Integer id);

    TrainingRoadmapResponse createRoadmap(TrainingRoadmapRequest request, Integer userId);

    void deleteRoadmap(Integer id);
}
