package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculateResponse;

public interface NutritionCalculatorService {

    NutritionCalculateResponse calculate(NutritionCalculateRequest request);
}
