package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.BreedCompareResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DevelopmentStageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.request.BreedRequest;

import java.util.List;

public interface BreedService {

    PageResponse<BreedResponse> getAll(int page, int size, String search);

    BreedResponse getById(Integer id);

    BreedResponse create(BreedRequest request, Integer createdByUserId);

    BreedResponse update(Integer id, BreedRequest request);

    void delete(Integer id);

    BreedCompareResponse compare(List<Integer> breedIds);

    List<DevelopmentStageResponse> getDevelopmentStages(Integer breedId);
}
