package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.DogWeightRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DogWeightRecordResponse;
import vn.edu.fpt.doghandbook.backend.service.DogWeightRecordService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

@RestController
@RequestMapping("/dog-weight-records")
@RequiredArgsConstructor
public class DogWeightRecordController {

    private final DogWeightRecordService dogWeightRecordService;

    @PostMapping
    public ResponseEntity<ApiResponse<DogWeightRecordResponse>> create(
            @Valid @RequestBody DogWeightRecordRequest request,
            Authentication authentication) {
        Integer assessorId = AuthenticationUtils.extractUserId(authentication);
        DogWeightRecordResponse response = dogWeightRecordService.create(request, assessorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Tạo bản ghi cân nặng thành công"));
    }
}
