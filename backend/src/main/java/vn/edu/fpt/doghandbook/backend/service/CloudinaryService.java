package vn.edu.fpt.doghandbook.backend.service;

import org.springframework.web.multipart.MultipartFile;

public interface CloudinaryService {

    record UploadResult(String secureUrl, String publicId) {}

    UploadResult upload(MultipartFile file, String resourceType);

    void delete(String publicId, String resourceType);
}
