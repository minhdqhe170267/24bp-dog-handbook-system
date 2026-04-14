package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.HealthSessionRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SessionFollowUpRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthSessionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.time.LocalDateTime;

public interface HealthSessionService {

    HealthSessionResponse create(HealthSessionRequest request, Integer trainerId);

    HealthSessionResponse getById(Integer sessionId);

    PageResponse<HealthSessionResponse> getByTrainer(Integer trainerId, int page, int size);

    PageResponse<HealthSessionResponse> getByDog(Integer dogId, int page, int size);

    HealthSessionResponse addFollowUp(SessionFollowUpRequest request, Integer trainerId);

    HealthSessionResponse resolve(Integer sessionId, String resolutionNotes, Integer trainerId,
                                   LocalDateTime localUpdatedAt);
}
