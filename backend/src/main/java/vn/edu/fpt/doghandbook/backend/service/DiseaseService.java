package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.DiseaseRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DiseaseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface DiseaseService {

    PageResponse<DiseaseResponse> getAll(int page, int size, String search);

    DiseaseResponse getById(Integer id);

    DiseaseResponse create(DiseaseRequest request, Integer createdByUserId);

    DiseaseResponse update(Integer id, DiseaseRequest request);

    void delete(Integer id);
}
