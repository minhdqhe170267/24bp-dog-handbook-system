package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.TrainingSpecialtyRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingSpecialtyResponse;

public interface TrainingSpecialtyService {

    PageResponse<TrainingSpecialtyResponse> getAll(int page, int size, String search);

    TrainingSpecialtyResponse getById(Integer id);

    TrainingSpecialtyResponse create(TrainingSpecialtyRequest request);

    TrainingSpecialtyResponse update(Integer id, TrainingSpecialtyRequest request);

    void delete(Integer id);
}
