package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/training-methods")
public class TrainingMethodController {

    @GetMapping
    public ApiResponse<?> getAllMethods() {
        List<Map<String, Object>> methods = List.of(
                Map.of("methodId", 1, "methodName", "Huấn luyện bằng phần thưởng",
                        "description", "Sử dụng phần thưởng (thức ăn, khen ngợi) để khuyến khích hành vi tốt",
                        "advantages", "Hiệu quả cao, tạo mối quan hệ tốt giữa người và chó",
                        "status", "PUBLISHED"),
                Map.of("methodId", 2, "methodName", "Huấn luyện bằng mệnh lệnh",
                        "description", "Sử dụng các lệnh chuẩn và tín hiệu tay để điều khiển chó trong môi trường quân sự",
                        "advantages", "Phù hợp môi trường tác chiến, phản ứng nhanh và nhất quán",
                        "status", "PUBLISHED")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(methods)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }
}
