package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.MedicationRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.MedicationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface MedicationService {

    PageResponse<MedicationResponse> getAll(int page, int size, String search, String status);

    MedicationResponse getById(Integer id);

    MedicationResponse create(MedicationRequest request, Integer createdByUserId);

    MedicationResponse update(Integer id, MedicationRequest request, Integer actorUserId);

    void delete(Integer id);
}
