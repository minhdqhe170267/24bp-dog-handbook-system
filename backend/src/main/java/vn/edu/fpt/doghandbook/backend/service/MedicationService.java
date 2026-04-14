package vn.edu.fpt.doghandbook.backend.service;

import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.MedicationRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.MedicationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface MedicationService {

    PageResponse<MedicationResponse> getAll(int page, int size, String search, String status);

    MedicationResponse getById(Integer id);

    MedicationResponse create(MedicationRequest request, Integer createdByUserId, MultipartFile image);

    MedicationResponse update(Integer id, MedicationRequest request, Integer actorUserId, MultipartFile image);

    void delete(Integer id);
}
