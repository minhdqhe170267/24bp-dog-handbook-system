package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.HealthRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthRecordResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface HealthRecordService {

    PageResponse<HealthRecordResponse> getAll(int page, int size);

    PageResponse<HealthRecordResponse> getByDog(Integer dogId, int page, int size);

    HealthRecordResponse getById(Integer recordId);

    HealthRecordResponse create(HealthRecordRequest request, Integer examinerId);

    HealthRecordResponse update(Integer recordId, HealthRecordRequest request, Integer examinerId);
}
