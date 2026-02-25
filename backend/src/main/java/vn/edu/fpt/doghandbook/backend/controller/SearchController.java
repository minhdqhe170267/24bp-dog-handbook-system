package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/search")
public class SearchController {

    @GetMapping
    public ApiResponse<?> search(@RequestParam String q) {
        return ApiResponse.success(List.of(
                Map.of("entityType", "BREED", "entityId", 1,
                        "title", "Berger Đức",
                        "snippet", "Chó cảnh sát, quân sự đa năng nổi tiếng thế giới"),
                Map.of("entityType", "DISEASE", "entityId", 3,
                        "title", "Bệnh ngoài da ở Berger",
                        "snippet", "Viêm da, rụng lông thường gặp ở Berger Đức")
        ));
    }
}
