package vn.edu.fpt.doghandbook.backend.service;

import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportPreviewResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportTemplateResponse;

import java.io.ByteArrayInputStream;
import java.util.List;

public interface DocumentImportService {

    List<ImportTemplateResponse> getTemplates();

    ByteArrayInputStream downloadTemplate(String entityType);

    ImportPreviewResponse preview(String entityType, MultipartFile file);

    ImportPreviewResponse confirm(String entityType, MultipartFile file, Integer userId);
}
