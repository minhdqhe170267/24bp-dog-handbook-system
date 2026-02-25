package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dogs")
public class DogProfileController {

    @GetMapping
    public ApiResponse<?> getAllDogs() {
        List<Map<String, Object>> dogs = List.of(
                Map.of("dogId", 1, "dogCode", "BP24-001", "dogName", "Rex",
                        "breedName", "Berger Đức", "gender", "MALE", "currentWeightKg", 34.5, "status", "ACTIVE"),
                Map.of("dogId", 2, "dogCode", "BP24-002", "dogName", "Max",
                        "breedName", "Malinois", "gender", "MALE", "currentWeightKg", 30.0, "status", "ACTIVE"),
                Map.of("dogId", 3, "dogCode", "BP24-003", "dogName", "Luna",
                        "breedName", "Berger Đức", "gender", "FEMALE", "currentWeightKg", 28.0, "status", "ACTIVE")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(dogs)
                .page(0).size(10).totalElements(3).totalPages(1)
                .build());
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getDogById(@PathVariable int id) {
        return ApiResponse.success(Map.ofEntries(
                Map.entry("dogId", 1),
                Map.entry("dogCode", "BP24-001"),
                Map.entry("dogName", "Rex"),
                Map.entry("breedId", 1),
                Map.entry("breedName", "Berger Đức"),
                Map.entry("birthDate", "2022-03-15"),
                Map.entry("gender", "MALE"),
                Map.entry("currentWeightKg", 34.5),
                Map.entry("heightCm", 62.0),
                Map.entry("color", "Đen vàng"),
                Map.entry("microchipId", "MC-2024-001"),
                Map.entry("status", "ACTIVE"),
                Map.entry("isSterilized", false),
                Map.entry("imageUrl", "https://example.com/dogs/rex.jpg"),
                Map.entry("notes", "Chó huấn luyện tốt, tính cách ổn định")
        ));
    }
}
