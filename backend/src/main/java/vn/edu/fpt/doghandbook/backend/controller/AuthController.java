package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @PostMapping("/login")
    public ApiResponse<?> login(@RequestBody Map<String, String> request) {
        return ApiResponse.success(Map.of(
                "token", "eyJhbG...STUB_TOKEN",
                "tokenType", "Bearer",
                "expiresIn", 86400,
                "user", Map.of(
                        "userId", 1,
                        "username", "trainer01",
                        "fullName", "Nguyễn Văn Kiên",
                        "role", "TRAINER",
                        "militaryRank", "Trung úy",
                        "unit", "Tiểu đoàn 24"
                )
        ));
    }

    @GetMapping("/me")
    public ApiResponse<?> getMe() {
        return ApiResponse.success(Map.of(
                "userId", 1,
                "username", "trainer01",
                "fullName", "Nguyễn Văn Kiên",
                "role", "TRAINER",
                "militaryRank", "Trung úy",
                "unit", "Tiểu đoàn 24"
        ));
    }
}
