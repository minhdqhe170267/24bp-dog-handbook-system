package vn.edu.fpt.doghandbook.backend.service;

import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.DogProfileRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogProfileResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface DogProfileService {

    PageResponse<DogProfileResponse> getAll(int page, int size, String search);

    DogProfileResponse getById(Integer id);

    DogProfileResponse create(DogProfileRequest request, MultipartFile image);

    DogProfileResponse update(Integer id, DogProfileRequest request, MultipartFile image);

    void delete(Integer id);
}
