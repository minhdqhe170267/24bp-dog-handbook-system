package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingSpecialtyRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingSpecialtyResponse;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.TrainingSpecialtyRepository;
import vn.edu.fpt.doghandbook.backend.service.TrainingSpecialtyService;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TrainingSpecialtyServiceImpl implements TrainingSpecialtyService {

    private final TrainingSpecialtyRepository trainingSpecialtyRepository;

    @Override
    public PageResponse<TrainingSpecialtyResponse> getAll(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "specialtyName"));
        Page<TrainingSpecialty> specialtyPage;
        if (search == null || search.isBlank()) {
            specialtyPage = trainingSpecialtyRepository.findByIsDeletedFalse(pageable);
        } else {
            specialtyPage = trainingSpecialtyRepository.findBySpecialtyNameContainingIgnoreCaseAndIsDeletedFalse(
                    search.trim(),
                    pageable
            );
        }
        return PageResponse.<TrainingSpecialtyResponse>builder()
                .content(specialtyPage.getContent().stream().map(this::toResponse).toList())
                .page(specialtyPage.getNumber())
                .size(specialtyPage.getSize())
                .totalElements(specialtyPage.getTotalElements())
                .totalPages(specialtyPage.getTotalPages())
                .build();
    }

    @Override
    public TrainingSpecialtyResponse getById(Integer id) {
        return toResponse(getActiveSpecialty(id));
    }

    @Override
    public TrainingSpecialtyResponse create(TrainingSpecialtyRequest request) {
        ensureSpecialtyCodeUnique(request.getSpecialtyCode(), null);
        TrainingSpecialty specialty = TrainingSpecialty.builder()
                .specialtyCode(normalize(request.getSpecialtyCode()))
                .specialtyName(normalize(request.getSpecialtyName()))
                .description(trimToNull(request.getDescription()))
                .isActive(request.getIsActive() == null || request.getIsActive())
                .version(1)
                .isDeleted(false)
                .build();
        return toResponse(trainingSpecialtyRepository.save(specialty));
    }

    @Override
    public TrainingSpecialtyResponse update(Integer id, TrainingSpecialtyRequest request) {
        TrainingSpecialty specialty = getActiveSpecialty(id);
        ensureSpecialtyCodeUnique(request.getSpecialtyCode(), specialty.getSpecialtyId());
        specialty.setSpecialtyCode(normalize(request.getSpecialtyCode()));
        specialty.setSpecialtyName(normalize(request.getSpecialtyName()));
        specialty.setDescription(trimToNull(request.getDescription()));
        if (request.getIsActive() != null) {
            specialty.setIsActive(request.getIsActive());
        }
        return toResponse(trainingSpecialtyRepository.save(specialty));
    }

    @Override
    public void delete(Integer id) {
        TrainingSpecialty specialty = getActiveSpecialty(id);
        specialty.setIsDeleted(true);
        specialty.setDeletedAt(LocalDateTime.now());
        trainingSpecialtyRepository.save(specialty);
    }

    private TrainingSpecialty getActiveSpecialty(Integer id) {
        return trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyên ngành với id: " + id));
    }

    private void ensureSpecialtyCodeUnique(String specialtyCode, Integer currentId) {
        trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse(normalize(specialtyCode))
                .filter(existing -> !existing.getSpecialtyId().equals(currentId))
                .ifPresent(existing -> {
                    throw new ConflictException("Mã chuyên ngành đã tồn tại: " + specialtyCode);
                });
    }

    private TrainingSpecialtyResponse toResponse(TrainingSpecialty specialty) {
        return TrainingSpecialtyResponse.builder()
                .specialtyId(specialty.getSpecialtyId())
                .specialtyCode(specialty.getSpecialtyCode())
                .specialtyName(specialty.getSpecialtyName())
                .description(specialty.getDescription())
                .version(specialty.getVersion())
                .isActive(specialty.getIsActive())
                .createdAt(specialty.getCreatedAt())
                .updatedAt(specialty.getUpdatedAt())
                .build();
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
