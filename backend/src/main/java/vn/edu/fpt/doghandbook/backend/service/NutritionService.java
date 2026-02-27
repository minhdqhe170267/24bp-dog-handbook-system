package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;

import java.util.List;

public interface NutritionService {

    PageResponse<NutritionStandardResponse> getAll(int page, int size, String search);

    NutritionStandardResponse getById(Integer id);

    List<NutritionStandardResponse> getByBreedId(Integer breedId);

    NutritionStandardResponse create(NutritionStandardRequest request, Integer createdByUserId);

    NutritionStandardResponse update(Integer id, NutritionStandardRequest request);

    void delete(Integer id);
}
