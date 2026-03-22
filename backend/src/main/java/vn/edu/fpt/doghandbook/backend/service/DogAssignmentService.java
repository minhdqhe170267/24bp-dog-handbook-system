package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.DogAssignmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogAssignmentResponse;

import java.util.List;

public interface DogAssignmentService {

    DogAssignmentResponse assign(DogAssignmentRequest request, Integer assignorId);

    DogAssignmentResponse update(Integer assignmentId, DogAssignmentRequest request);

    void unassign(Integer assignmentId);

    List<DogAssignmentResponse> getByTrainer(Integer trainerId);

    List<DogAssignmentResponse> getByDog(Integer dogId);

    DogAssignmentResponse getById(Integer assignmentId);
}
