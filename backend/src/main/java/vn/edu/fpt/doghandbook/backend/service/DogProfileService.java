package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.DogProfileRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogProfileResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface DogProfileService {

    PageResponse<DogProfileResponse> getAll(int page, int size, String search);

    DogProfileResponse getById(Integer id);

    DogProfileResponse create(DogProfileRequest request);

    DogProfileResponse update(Integer id, DogProfileRequest request);

    void delete(Integer id);
}
