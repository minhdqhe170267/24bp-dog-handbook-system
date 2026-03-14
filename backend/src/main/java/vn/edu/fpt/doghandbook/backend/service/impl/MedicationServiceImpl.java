package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.MedicationRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.MedicationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.Medication;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.MedicationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MedicationServiceImpl implements MedicationService {

    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;

    @Override
    public PageResponse<MedicationResponse> getAll(int page, int size, String search, String status) {
        Pageable pageable = buildPageable(page, size);
        Page<Medication> medicationPage;

        boolean hasSearch = search != null && !search.isBlank();
        boolean hasStatus = status != null && !status.isBlank();

        if (hasSearch && hasStatus) {
            medicationPage = medicationRepository.findByMedicationNameContainingIgnoreCaseAndStatusAndIsDeletedFalse(
                    search.trim(),
                    parseStatus(status),
                    pageable
            );
        } else if (hasSearch) {
            medicationPage = medicationRepository.findByMedicationNameContainingIgnoreCaseAndIsDeletedFalse(
                    search.trim(),
                    pageable
            );
        } else if (hasStatus) {
            medicationPage = medicationRepository.findByStatusAndIsDeletedFalse(parseStatus(status), pageable);
        } else {
            medicationPage = medicationRepository.findByIsDeletedFalse(pageable);
        }

        List<MedicationResponse> responses = medicationPage.getContent()
                .stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<MedicationResponse>builder()
                .content(responses)
                .page(medicationPage.getNumber())
                .size(medicationPage.getSize())
                .totalElements(medicationPage.getTotalElements())
                .totalPages(medicationPage.getTotalPages())
                .build();
    }

    @Override
    public MedicationResponse getById(Integer id) {
        return toResponse(getActiveMedicationById(id));
    }

    @Override
    @Transactional
    public MedicationResponse create(MedicationRequest request, Integer createdByUserId) {
        User actor = getUserById(createdByUserId);
        String medicationName = normalizeRequired(request.getMedicationName(), "medicationName");
        ensureUniqueMedicationName(medicationName, null);

        Medication medication = Medication.builder()
                .medicationName(medicationName)
                .description(trimToNull(request.getDescription()))
                .dosageInstructions(trimToNull(request.getDosageInstructions()))
                .administrationMethod(trimToNull(request.getAdministrationMethod()))
                .sideEffects(trimToNull(request.getSideEffects()))
                .contraindications(trimToNull(request.getContraindications()))
                .storageRequirements(trimToNull(request.getStorageRequirements()))
                .imageUrl(trimToNull(request.getImageUrl()))
                .status(resolveWritableStatus(request.getStatus(), actor, ContentStatus.DRAFT))
                .createdBy(actor)
                .isDeleted(false)
                .deletedAt(null)
                .build();

        return toResponse(medicationRepository.save(medication));
    }

    @Override
    @Transactional
    public MedicationResponse update(Integer id, MedicationRequest request, Integer actorUserId) {
        Medication medication = getActiveMedicationById(id);
        User actor = getUserById(actorUserId);
        String medicationName = normalizeRequired(request.getMedicationName(), "medicationName");
        ensureUniqueMedicationName(medicationName, id);

        medication.setMedicationName(medicationName);
        medication.setDescription(trimToNull(request.getDescription()));
        medication.setDosageInstructions(trimToNull(request.getDosageInstructions()));
        medication.setAdministrationMethod(trimToNull(request.getAdministrationMethod()));
        medication.setSideEffects(trimToNull(request.getSideEffects()));
        medication.setContraindications(trimToNull(request.getContraindications()));
        medication.setStorageRequirements(trimToNull(request.getStorageRequirements()));
        medication.setImageUrl(trimToNull(request.getImageUrl()));
        medication.setStatus(resolveWritableStatus(request.getStatus(), actor, medication.getStatus()));

        return toResponse(medicationRepository.save(medication));
    }

    @Override
    @Transactional
    public MedicationResponse publish(Integer id) {
        Medication medication = getActiveMedicationById(id);
        medication.setStatus(ContentStatus.PUBLISHED);
        return toResponse(medicationRepository.save(medication));
    }

    @Override
    @Transactional
    public MedicationResponse unpublish(Integer id) {
        Medication medication = getActiveMedicationById(id);
        medication.setStatus(ContentStatus.DRAFT);
        return toResponse(medicationRepository.save(medication));
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Medication medication = getActiveMedicationById(id);
        medication.setIsDeleted(true);
        medication.setDeletedAt(LocalDateTime.now());
        medicationRepository.save(medication);
    }

    private Medication getActiveMedicationById(Integer id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("id must be greater than 0");
        }

        return medicationRepository.findByMedicationIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", id));
    }

    private User getUserById(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("userId must be greater than 0");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    private Pageable buildPageable(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page must be greater than or equal to 0");
        }
        if (size <= 0) {
            throw new BadRequestException("size must be greater than 0");
        }
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private void ensureUniqueMedicationName(String medicationName, Integer medicationId) {
        boolean exists = medicationId == null
                ? medicationRepository.existsByMedicationNameIgnoreCaseAndIsDeletedFalse(medicationName)
                : medicationRepository.existsByMedicationNameIgnoreCaseAndMedicationIdNotAndIsDeletedFalse(
                        medicationName,
                        medicationId
                );

        if (exists) {
            throw new ConflictException("Medication with the same name already exists");
        }
    }

    private ContentStatus resolveWritableStatus(String value, User actor, ContentStatus defaultStatus) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return defaultStatus;
        }

        ContentStatus requestedStatus = parseStatus(normalized);
        if (requestedStatus != ContentStatus.DRAFT && requestedStatus != ContentStatus.PUBLISHED) {
            throw new BadRequestException("Only DRAFT or PUBLISHED are supported for medications");
        }
        if (requestedStatus == ContentStatus.PUBLISHED && (actor == null || actor.getRole() != UserRole.ADMIN)) {
            throw new BadRequestException("Only ADMIN can publish medication directly");
        }
        return requestedStatus;
    }

    private ContentStatus parseStatus(String value) {
        String normalized = normalizeRequired(value, "status");
        try {
            return ContentStatus.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid medication status: " + value);
        }
    }

    private MedicationResponse toResponse(Medication entity) {
        return MedicationResponse.builder()
                .medicationId(entity.getMedicationId())
                .medicationName(entity.getMedicationName())
                .description(entity.getDescription())
                .dosageInstructions(entity.getDosageInstructions())
                .administrationMethod(entity.getAdministrationMethod())
                .sideEffects(entity.getSideEffects())
                .contraindications(entity.getContraindications())
                .storageRequirements(entity.getStorageRequirements())
                .imageUrl(entity.getImageUrl())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .createdByName(resolveUserFullName(entity.getCreatedBy()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new BadRequestException(fieldName + " is required");
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String resolveUserFullName(User user) {
        if (user == null) {
            return null;
        }
        try {
            return user.getFullName();
        } catch (EntityNotFoundException ex) {
            return null;
        }
    }
}
