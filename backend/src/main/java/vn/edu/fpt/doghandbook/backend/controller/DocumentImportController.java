package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportPreviewResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportTemplateResponse;
import vn.edu.fpt.doghandbook.backend.service.DocumentImportService;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/import")
@RequiredArgsConstructor
public class DocumentImportController {

    private final DocumentImportService documentImportService;

    @GetMapping("/templates")
    public ApiResponse<List<ImportTemplateResponse>> getTemplates() {
        return ApiResponse.success(documentImportService.getTemplates());
    }

    @GetMapping("/templates/{entityType}/file")
    public ResponseEntity<InputStreamResource> downloadTemplate(@PathVariable String entityType) {
        ByteArrayInputStream stream = documentImportService.downloadTemplate(entityType);
        String fileName = localizedTemplateFileName(entityType);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(fileName, StandardCharsets.UTF_8)
                .build());

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(stream));
    }

    private String localizedTemplateFileName(String entityType) {
        return switch (entityType == null ? "" : entityType.trim().toUpperCase()) {
            case "BREED" -> "Mẫu nhập giống chó.xlsx";
            case "DISEASE" -> "Mẫu nhập bệnh.xlsx";
            case "MEDICATION" -> "Mẫu nhập thuốc.xlsx";
            case "EXERCISE" -> "Mẫu nhập bài tập.xlsx";
            case "NUTRITION" -> "Mẫu nhập dinh dưỡng.xlsx";
            case "TRAINING_METHOD" -> "Mẫu nhập phương pháp huấn luyện.xlsx";
            case "TRAINING_ROADMAP" -> "Mẫu nhập lộ trình huấn luyện.xlsx";
            case "FIRST_AID_GUIDE" -> "Mẫu nhập sơ cứu.xlsx";
            case "DOG_PROFILE" -> "Mẫu nhập hồ sơ chó.xlsx";
            default -> "Mẫu nhập dữ liệu.xlsx";
        };
    }

    @PostMapping("/preview")
    public ApiResponse<ImportPreviewResponse> preview(
            @RequestParam String entityType,
            @RequestParam("file") MultipartFile file) {
        return ApiResponse.success(documentImportService.preview(entityType, file));
    }

    @PostMapping("/confirm")
    public ApiResponse<ImportPreviewResponse> confirm(
            @RequestParam String entityType,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer userId = userDetails.getUser().getUserId();
        return ApiResponse.success(documentImportService.confirm(entityType, file, userId));
    }
}
