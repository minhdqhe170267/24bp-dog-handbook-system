package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DevelopmentStageResponse;
import vn.edu.fpt.doghandbook.backend.service.BreedService;

import java.util.List;

@RestController
@RequestMapping("/development-stages")
@RequiredArgsConstructor
public class DevelopmentStageController {

    private final BreedService breedService;

    @GetMapping
    public ApiResponse<List<DevelopmentStageResponse>> getStages(
            @RequestParam(required = false) Integer breedId) {
        if (breedId == null) {
            return ApiResponse.success(List.of());
        }
        return ApiResponse.success(breedService.getDevelopmentStages(breedId));
    }
}
