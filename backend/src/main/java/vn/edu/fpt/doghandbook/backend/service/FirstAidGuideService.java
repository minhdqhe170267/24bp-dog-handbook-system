package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.FirstAidGuideRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FirstAidGuideResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface FirstAidGuideService {

    PageResponse<FirstAidGuideResponse> getAll(int page, int size, String search, String status);

    FirstAidGuideResponse getById(Integer id);

    FirstAidGuideResponse create(FirstAidGuideRequest request, Integer createdByUserId);

    FirstAidGuideResponse update(Integer id, FirstAidGuideRequest request, Integer actorUserId);

    FirstAidGuideResponse publish(Integer id);

    FirstAidGuideResponse unpublish(Integer id);

    void delete(Integer id);
}
