package vn.edu.fpt.doghandbook.backend.service;

import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.MediaUpdateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.MediaResponse;

import java.util.List;

public interface MediaService {

    MediaResponse upload(
            MultipartFile file,
            String entityType,
            Integer entityId,
            Integer uploadedBy,
            String altText,
            Integer displayOrder
    );

    MediaResponse getById(Integer id);

    List<MediaResponse> getByEntity(String entityType, Integer entityId);

    MediaResponse updateMetadata(Integer id, MediaUpdateRequest request);

    void delete(Integer id);
}
