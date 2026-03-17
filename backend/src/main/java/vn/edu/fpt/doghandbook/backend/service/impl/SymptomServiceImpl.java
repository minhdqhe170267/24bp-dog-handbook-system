package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.SymptomRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomResponse;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;
import vn.edu.fpt.doghandbook.backend.entity.enums.SymptomCategory;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseSymptomMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.SymptomRepository;
import vn.edu.fpt.doghandbook.backend.service.SymptomService;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SymptomServiceImpl implements SymptomService {

    private final SymptomRepository symptomRepository;
    private final DiseaseSymptomMappingRepository diseaseSymptomMappingRepository;

    @Override
    public List<SymptomResponse> getAll() {
        return symptomRepository.findAll().stream()
                .map(this::toSymptomResponse)
                .toList();
    }

    @Override
    public List<SymptomResponse> getByCategory(String category) {
        SymptomCategory cat;
        try {
            cat = SymptomCategory.valueOf(category.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Danh mục triệu chứng không hợp lệ: " + category);
        }
        return symptomRepository.findByCategory(cat).stream()
                .map(this::toSymptomResponse)
                .toList();
    }

    @Override
    public SymptomResponse getById(Integer id) {
        Symptom entity = symptomRepository.findBySymptomId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy triệu chứng: " + id));
        return toSymptomResponse(entity);
    }

    @Override
    @Transactional
    public SymptomResponse create(SymptomRequest request) {
        if (symptomRepository.existsBySymptomCode(request.getSymptomCode().trim())) {
            throw new BadRequestException("Mã triệu chứng đã tồn tại: " + request.getSymptomCode());
        }

        Symptom entity = Symptom.builder()
                .symptomCode(request.getSymptomCode().trim())
                .symptomName(request.getSymptomName().trim())
                .category(parseCategory(request.getCategory()))
                .severityIndicator(request.getSeverityIndicator() != null ? request.getSeverityIndicator() : 1)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .build();

        return toSymptomResponse(symptomRepository.save(entity));
    }

    @Override
    @Transactional
    public SymptomResponse update(Integer id, SymptomRequest request) {
        Symptom entity = symptomRepository.findBySymptomId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy triệu chứng: " + id));

        String newCode = request.getSymptomCode().trim();
        if (!entity.getSymptomCode().equals(newCode) && symptomRepository.existsBySymptomCode(newCode)) {
            throw new BadRequestException("Mã triệu chứng đã tồn tại: " + newCode);
        }

        entity.setSymptomCode(newCode);
        entity.setSymptomName(request.getSymptomName().trim());
        entity.setCategory(parseCategory(request.getCategory()));
        entity.setSeverityIndicator(request.getSeverityIndicator() != null ? request.getSeverityIndicator() : 1);
        entity.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);

        return toSymptomResponse(symptomRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Symptom entity = symptomRepository.findBySymptomId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy triệu chứng: " + id));

        boolean hasMapping = !diseaseSymptomMappingRepository
                .findBySymptomSymptomIdIn(List.of(id)).isEmpty();
        if (hasMapping) {
            throw new BadRequestException(
                    "Không thể xóa triệu chứng đang được liên kết với bệnh");
        }

        symptomRepository.delete(entity);
    }

    private SymptomCategory parseCategory(String category) {
        try {
            return SymptomCategory.valueOf(category.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Danh mục triệu chứng không hợp lệ: " + category);
        }
    }

    private SymptomResponse toSymptomResponse(Symptom entity) {
        return SymptomResponse.builder()
                .symptomId(entity.getSymptomId())
                .symptomCode(entity.getSymptomCode())
                .symptomName(entity.getSymptomName())
                .category(entity.getCategory() != null ? entity.getCategory().name() : null)
                .severityIndicator(entity.getSeverityIndicator())
                .description(entity.getDescription())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
