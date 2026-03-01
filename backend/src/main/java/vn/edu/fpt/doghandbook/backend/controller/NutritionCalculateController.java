package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculateResponse;
import vn.edu.fpt.doghandbook.backend.service.NutritionCalculatorService;

@RestController
@RequiredArgsConstructor
public class NutritionCalculateController {

    private final NutritionCalculatorService nutritionCalculatorService;

    @PostMapping("/nutrition/calculate")
    public ApiResponse<NutritionCalculateResponse> calculate(@Valid @RequestBody NutritionCalculateRequest request) {
        NutritionCalculateResponse response = nutritionCalculatorService.calculate(request);
        return ApiResponse.success(response, "Tính toán thành công");
    }
}
