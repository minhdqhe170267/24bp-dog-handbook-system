package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.SymptomCheckerRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.service.SymptomCheckerService;

@RestController
@RequestMapping("/symptom-checker")
@RequiredArgsConstructor
public class SymptomCheckerController {

    private final SymptomCheckerService symptomCheckerService;

    @PostMapping("/check")
    public ApiResponse<?> check(@Valid @RequestBody SymptomCheckerRequest request) {
        return ApiResponse.success(symptomCheckerService.check(request), "Kiểm tra triệu chứng thành công");
    }
}
