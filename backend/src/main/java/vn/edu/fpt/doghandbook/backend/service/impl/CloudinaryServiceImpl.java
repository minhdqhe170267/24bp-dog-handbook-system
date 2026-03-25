package vn.edu.fpt.doghandbook.backend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.CloudinaryService;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CloudinaryServiceImpl implements CloudinaryService {

    private final Cloudinary cloudinary;

    @Value("${cloudinary.folder:dog-handbook/media}")
    private String cloudinaryFolder;

    @Override
    public UploadResult upload(MultipartFile file, String resourceType) {
        try {
            String publicId = cloudinaryFolder + "/" + UUID.randomUUID();

            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "public_id", publicId,
                    "resource_type", resourceType,
                    "overwrite", true
            ));

            return new UploadResult(
                    (String) result.get("secure_url"),
                    (String) result.get("public_id")
            );
        } catch (IOException ex) {
            throw new BadRequestException("Could not upload file to Cloudinary: " + ex.getMessage());
        }
    }

    @Override
    public void delete(String publicId, String resourceType) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType));
        } catch (IOException ignored) {
        }
    }
}
