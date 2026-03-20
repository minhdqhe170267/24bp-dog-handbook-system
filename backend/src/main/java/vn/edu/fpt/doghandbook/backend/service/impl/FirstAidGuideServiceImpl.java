package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.FirstAidGuideRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FirstAidGuideResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.FirstAidGuide;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.FirstAidGuideService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FirstAidGuideServiceImpl implements FirstAidGuideService {

    private final FirstAidGuideRepository firstAidGuideRepository;
    private final UserRepository userRepository;

    @Override
    public PageResponse<FirstAidGuideResponse> getAll(int page, int size, String search, String status) {
        Pageable pageable = buildPageable(page, size);
        Page<FirstAidGuide> guidePage;

        boolean hasSearch = search != null && !search.isBlank();
        boolean hasStatus = status != null && !status.isBlank();

        if (hasSearch && hasStatus) {
            guidePage = firstAidGuideRepository.findByGuideTitleContainingIgnoreCaseAndStatusAndIsDeletedFalse(
                    search.trim(),
                    parseStatus(status),
                    pageable
            );
        } else if (hasSearch) {
            guidePage = firstAidGuideRepository.findByGuideTitleContainingIgnoreCaseAndIsDeletedFalse(
                    search.trim(),
                    pageable
            );
        } else if (hasStatus) {
            guidePage = firstAidGuideRepository.findByStatusAndIsDeletedFalse(parseStatus(status), pageable);
        } else {
            guidePage = firstAidGuideRepository.findByIsDeletedFalse(pageable);
        }

        List<FirstAidGuideResponse> responses = guidePage.getContent()
                .stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<FirstAidGuideResponse>builder()
                .content(responses)
                .page(guidePage.getNumber())
                .size(guidePage.getSize())
                .totalElements(guidePage.getTotalElements())
                .totalPages(guidePage.getTotalPages())
                .build();
    }

    @Override
    public FirstAidGuideResponse getById(Integer id) {
        return toResponse(getActiveGuideById(id));
    }

    @Override
    @Transactional
    public FirstAidGuideResponse create(FirstAidGuideRequest request, Integer createdByUserId) {
        User actor = getUserById(createdByUserId);
        String guideTitle = normalizeRequired(request.getGuideTitle(), "guideTitle");
        ensureUniqueGuideTitle(guideTitle, null);

        FirstAidGuide guide = FirstAidGuide.builder()
                .guideTitle(guideTitle)
                .emergencyType(normalizeRequired(request.getEmergencyType(), "emergencyType"))
                .description(trimToNull(request.getDescription()))
                .immediateSteps(normalizeRequired(request.getImmediateSteps(), "immediateSteps"))
                .requiredMaterials(trimToNull(request.getRequiredMaterials()))
                .doNotActions(trimToNull(request.getDoNotActions()))
                .whenToSeekVet(trimToNull(request.getWhenToSeekVet()))
                .imageUrl(trimToNull(request.getImageUrl()))
                .status(ContentStatus.DRAFT)
                .createdBy(actor)
                .isDeleted(false)
                .deletedAt(null)
                .build();

        return toResponse(firstAidGuideRepository.save(guide));
    }

    @Override
    @Transactional
    public FirstAidGuideResponse update(Integer id, FirstAidGuideRequest request, Integer actorUserId) {
        FirstAidGuide guide = getActiveGuideById(id);
        getUserById(actorUserId);

        if (guide.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi sửa");
        }

        String guideTitle = normalizeRequired(request.getGuideTitle(), "guideTitle");
        ensureUniqueGuideTitle(guideTitle, id);

        guide.setGuideTitle(guideTitle);
        guide.setEmergencyType(normalizeRequired(request.getEmergencyType(), "emergencyType"));
        guide.setDescription(trimToNull(request.getDescription()));
        guide.setImmediateSteps(normalizeRequired(request.getImmediateSteps(), "immediateSteps"));
        guide.setRequiredMaterials(trimToNull(request.getRequiredMaterials()));
        guide.setDoNotActions(trimToNull(request.getDoNotActions()));
        guide.setWhenToSeekVet(trimToNull(request.getWhenToSeekVet()));
        guide.setImageUrl(trimToNull(request.getImageUrl()));

        if (guide.getStatus() == ContentStatus.REJECTED) {
            guide.setStatus(ContentStatus.DRAFT);
        }

        return toResponse(firstAidGuideRepository.save(guide));
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        FirstAidGuide guide = getActiveGuideById(id);
        if (guide.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi xóa");
        }
        guide.setIsDeleted(true);
        guide.setDeletedAt(LocalDateTime.now());
        firstAidGuideRepository.save(guide);
    }

    private FirstAidGuide getActiveGuideById(Integer id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("id must be greater than 0");
        }

        return firstAidGuideRepository.findByGuideIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("FirstAidGuide", "id", id));
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

    private void ensureUniqueGuideTitle(String guideTitle, Integer guideId) {
        boolean exists = guideId == null
                ? firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndIsDeletedFalse(guideTitle)
                : firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndGuideIdNotAndIsDeletedFalse(
                        guideTitle,
                        guideId
                );

        if (exists) {
            throw new ConflictException("First aid guide with the same title already exists");
        }
    }

    private ContentStatus parseStatus(String value) {
        String normalized = normalizeRequired(value, "status");
        try {
            return ContentStatus.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid first-aid status: " + value);
        }
    }

    private FirstAidGuideResponse toResponse(FirstAidGuide entity) {
        return FirstAidGuideResponse.builder()
                .guideId(entity.getGuideId())
                .guideTitle(entity.getGuideTitle())
                .emergencyType(entity.getEmergencyType())
                .description(entity.getDescription())
                .immediateSteps(entity.getImmediateSteps())
                .requiredMaterials(entity.getRequiredMaterials())
                .doNotActions(entity.getDoNotActions())
                .whenToSeekVet(entity.getWhenToSeekVet())
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
