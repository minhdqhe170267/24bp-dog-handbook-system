package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {

    @GetMapping
    public ApiResponse<?> getAllUsers() {
        List<Map<String, Object>> users = List.of(
                Map.of("userId", 1, "username", "admin01",
                        "fullName", "Nguyễn Văn Admin", "role", "ADMIN",
                        "isActive", true),
                Map.of("userId", 2, "username", "editor01",
                        "fullName", "Trần Thị Biên Tập", "role", "CONTENT_EDITOR",
                        "isActive", true),
                Map.of("userId", 3, "username", "trainer01",
                        "fullName", "Nguyễn Văn Kiên", "role", "TRAINER",
                        "militaryRank", "Trung úy", "unit", "Tiểu đoàn 24", "isActive", true)
        );
        return ApiResponse.success(PageResponse.builder()
                .content(users)
                .page(0).size(10).totalElements(3).totalPages(1)
                .build());
    }
}
