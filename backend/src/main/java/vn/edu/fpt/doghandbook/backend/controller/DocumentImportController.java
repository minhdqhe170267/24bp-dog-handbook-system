package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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
