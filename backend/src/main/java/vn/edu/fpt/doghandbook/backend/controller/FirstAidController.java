package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/first-aid-guides")
public class FirstAidController {

    @GetMapping
    public ApiResponse<?> getAllGuides() {
        List<Map<String, Object>> guides = List.of(
                Map.of("guideId", 1, "guideName", "Sơ cứu ngộ độc",
                        "description", "Hướng dẫn xử lý khi chó bị ngộ độc thực phẩm hoặc hóa chất",
                        "steps", List.of(
                                "Tách chó khỏi nguồn độc",
                                "Không tự ý gây nôn nếu không có chỉ định",
                                "Liên hệ bác sĩ thú y ngay lập tức",
                                "Mang mẫu chất độc đến cơ sở y tế"
                        ),
                        "status", "PUBLISHED"),
                Map.of("guideId", 2, "guideName", "Sơ cứu say nắng",
                        "description", "Hướng dẫn xử lý khi chó bị say nắng trong huấn luyện ngoài trời",
                        "steps", List.of(
                                "Đưa chó vào nơi mát ngay lập tức",
                                "Làm ướt lông bằng nước mát (không phải nước lạnh)",
                                "Cho uống nước từng ít một",
                                "Đưa đến bác sĩ thú y nếu không cải thiện"
                        ),
                        "status", "PUBLISHED")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(guides)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }
}
