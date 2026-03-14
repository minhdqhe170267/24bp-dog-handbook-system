package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.MediaUpdateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.MediaResponse;
import vn.edu.fpt.doghandbook.backend.service.MediaService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

import java.util.List;

@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<MediaResponse>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("entityType") String entityType,
            @RequestParam("entityId") Integer entityId,
            @RequestParam(value = "altText", required = false) String altText,
            @RequestParam(value = "displayOrder", required = false) Integer displayOrder,
            Authentication authentication
    ) {
        MediaResponse response = mediaService.upload(
                file,
                entityType,
                entityId,
                AuthenticationUtils.extractUserId(authentication),
                altText,
                displayOrder
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ApiResponse<MediaResponse> getById(@PathVariable("id") Integer id) {
        return ApiResponse.success(mediaService.getById(id));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ApiResponse<List<MediaResponse>> getByEntity(
            @PathVariable("entityType") String entityType,
            @PathVariable("entityId") Integer entityId
    ) {
        return ApiResponse.success(mediaService.getByEntity(entityType, entityId));
    }

    @PutMapping("/{id}")
    public ApiResponse<MediaResponse> updateMetadata(
            @PathVariable("id") Integer id,
            @Valid @RequestBody MediaUpdateRequest request
    ) {
        return ApiResponse.success(mediaService.updateMetadata(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") Integer id) {
        mediaService.delete(id);
        return ApiResponse.success(null, "Deleted successfully");
    }
}
