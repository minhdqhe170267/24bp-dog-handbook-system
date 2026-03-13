package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomResponse;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;
import vn.edu.fpt.doghandbook.backend.entity.enums.SymptomCategory;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.SymptomRepository;
import vn.edu.fpt.doghandbook.backend.service.SymptomService;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SymptomServiceImpl implements SymptomService {

    private final SymptomRepository symptomRepository;

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
