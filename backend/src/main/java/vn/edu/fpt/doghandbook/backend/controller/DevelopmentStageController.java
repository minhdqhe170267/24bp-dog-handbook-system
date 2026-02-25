package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/development-stages")
public class DevelopmentStageController {

    @GetMapping
    public ApiResponse<?> getStages(@RequestParam(required = false) Integer breedId) {
        return ApiResponse.success(List.of(
                Map.of("stageId", 1, "stageName", "Chó con", "ageMinMonths", 0, "ageMaxMonths", 3,
                        "stageOrder", 1, "physicalMilestones", "Mở mắt, mọc răng sữa, học đứng và đi lại"),
                Map.of("stageId", 2, "stageName", "Thiếu niên", "ageMinMonths", 3, "ageMaxMonths", 6,
                        "stageOrder", 2, "physicalMilestones", "Răng vĩnh viễn bắt đầu mọc, tăng trưởng nhanh"),
                Map.of("stageId", 3, "stageName", "Thanh niên", "ageMinMonths", 6, "ageMaxMonths", 18,
                        "stageOrder", 3, "physicalMilestones", "Gần đạt kích thước trưởng thành, phát triển cơ bắp"),
                Map.of("stageId", 4, "stageName", "Trưởng thành", "ageMinMonths", 18, "ageMaxMonths", 84,
                        "stageOrder", 4, "physicalMilestones", "Đạt kích thước và cân nặng chuẩn, sẵn sàng tác chiến")
        ));
    }
}
