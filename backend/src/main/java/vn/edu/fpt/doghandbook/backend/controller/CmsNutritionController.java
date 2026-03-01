package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.util.List;

@RestController
@RequestMapping("/api/cms/nutrition")
@RequiredArgsConstructor
public class CmsNutritionController {

    private final NutritionService nutritionService;

    @GetMapping("/standards")
    public ResponseEntity<PageResponse<NutritionStandardResponse>> getAll(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search) {
        return ResponseEntity.ok(nutritionService.getAll(page, size, search));
    }

    @GetMapping("/standards/{id}")
    public ResponseEntity<NutritionStandardResponse> getById(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(nutritionService.getById(id));
    }

    @GetMapping("/standards/breed/{breedId}")
    public ResponseEntity<List<NutritionStandardResponse>> getByBreedId(@PathVariable("breedId") Integer breedId) {
        return ResponseEntity.ok(nutritionService.getByBreedId(breedId));
    }

    @PostMapping("/standards")
    public ResponseEntity<NutritionStandardResponse> create(
            @Valid @RequestBody NutritionStandardRequest request,
            @RequestParam("createdByUserId") Integer createdByUserId) {
        return ResponseEntity.ok(nutritionService.create(request, createdByUserId));
    }

    @PutMapping("/standards/{id}")
    public ResponseEntity<NutritionStandardResponse> update(
            @PathVariable("id") Integer id,
            @Valid @RequestBody NutritionStandardRequest request) {
        return ResponseEntity.ok(nutritionService.update(id, request));
    }

    @DeleteMapping("/standards/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Integer id) {
        nutritionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
