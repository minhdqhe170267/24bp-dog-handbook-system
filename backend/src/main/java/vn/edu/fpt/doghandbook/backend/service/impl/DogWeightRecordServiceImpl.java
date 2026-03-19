package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.DogWeightRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogWeightRecordResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.WeightAssessment;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.WeightStatus;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.repository.WeightAssessmentRepository;
import vn.edu.fpt.doghandbook.backend.service.DogWeightRecordService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DogWeightRecordServiceImpl implements DogWeightRecordService {

    private final DogProfileRepository dogProfileRepository;
    private final UserRepository userRepository;
    private final WeightAssessmentRepository weightAssessmentRepository;

    @Override
    @Transactional
    public DogWeightRecordResponse create(DogWeightRecordRequest request, Integer assessorId) {
        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId())
                .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + request.getDogId()));

        User assessor = userRepository.findById(assessorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + assessorId));

        if (request.getLocalId() != null) {
            var existing = weightAssessmentRepository.findByLocalId(request.getLocalId());
            if (existing.isPresent()) {
                return toResponse(existing.get());
            }
        }

        BigDecimal standardMinKg = request.getStandardMinKg();
        BigDecimal standardMaxKg = request.getStandardMaxKg();
        if (standardMinKg == null || standardMaxKg == null) {
            WeightRange range = resolveWeightRange(dog);
            if (standardMinKg == null) {
                standardMinKg = range.minKg();
            }
            if (standardMaxKg == null) {
                standardMaxKg = range.maxKg();
            }
        }

        if (standardMinKg == null || standardMaxKg == null) {
            throw new BadRequestException("Không xác định được chuẩn cân nặng cho chó này");
        }
        if (standardMinKg.compareTo(standardMaxKg) > 0) {
            throw new BadRequestException("standardMinKg không được lớn hơn standardMaxKg");
        }

        BigDecimal deviationPercent = request.getDeviationPercent();
        if (deviationPercent == null) {
            deviationPercent = computeDeviation(request.getRecordedWeightKg(), standardMinKg, standardMaxKg);
        }

        WeightStatus status = request.getStatus() != null
                ? WeightStatus.valueOf(request.getStatus())
                : deriveWeightStatus(deviationPercent);

        WeightAssessment entity = WeightAssessment.builder()
                .localId(request.getLocalId())
                .dogProfile(dog)
                .assessor(assessor)
                .recordedWeightKg(request.getRecordedWeightKg())
                .standardMinKg(standardMinKg)
                .standardMaxKg(standardMaxKg)
                .status(status)
                .deviationPercent(deviationPercent)
                .recommendation(request.getRecommendation())
                .followUpWeeks(request.getFollowUpWeeks())
                .assessedAt(request.getAssessedAt() != null ? request.getAssessedAt() : LocalDateTime.now())
                .build();

        entity = weightAssessmentRepository.save(entity);

        dog.setCurrentWeightKg(request.getRecordedWeightKg());
        dogProfileRepository.save(dog);

        return toResponse(entity);
    }

    private WeightRange resolveWeightRange(DogProfile dog) {
        DogBreed breed = dog.getDogBreed();
        if (breed == null) {
            throw new BadRequestException("Chó chưa có giống để xác định chuẩn cân nặng");
        }

        BigDecimal minKg;
        BigDecimal maxKg;
        if (dog.getGender() == DogGender.FEMALE) {
            minKg = breed.getWeightFemaleMinKg();
            maxKg = breed.getWeightFemaleMaxKg();
        } else {
            minKg = breed.getWeightMaleMinKg();
            maxKg = breed.getWeightMaleMaxKg();
        }
        return new WeightRange(minKg, maxKg);
    }

    private BigDecimal computeDeviation(BigDecimal recordedWeightKg, BigDecimal standardMinKg, BigDecimal standardMaxKg) {
        BigDecimal midpoint = standardMinKg.add(standardMaxKg)
                .divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
        if (midpoint.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return recordedWeightKg.subtract(midpoint)
                .multiply(BigDecimal.valueOf(100))
                .divide(midpoint, 2, RoundingMode.HALF_UP);
    }

    private WeightStatus deriveWeightStatus(BigDecimal deviationPercent) {
        if (deviationPercent.compareTo(BigDecimal.valueOf(-20)) < 0) {
            return WeightStatus.SEVERELY_UNDERWEIGHT;
        }
        if (deviationPercent.compareTo(BigDecimal.valueOf(-10)) < 0) {
            return WeightStatus.UNDERWEIGHT;
        }
        if (deviationPercent.compareTo(BigDecimal.valueOf(20)) > 0) {
            return WeightStatus.OBESE;
        }
        if (deviationPercent.compareTo(BigDecimal.valueOf(10)) > 0) {
            return WeightStatus.OVERWEIGHT;
        }
        return WeightStatus.NORMAL;
    }

    private DogWeightRecordResponse toResponse(WeightAssessment entity) {
        return DogWeightRecordResponse.builder()
                .assessmentId(entity.getAssessmentId())
                .localId(entity.getLocalId())
                .dogId(entity.getDogProfile() != null ? entity.getDogProfile().getDogId() : null)
                .dogName(entity.getDogProfile() != null ? entity.getDogProfile().getDogName() : null)
                .dogCode(entity.getDogProfile() != null ? entity.getDogProfile().getDogCode() : null)
                .assessorId(entity.getAssessor() != null ? entity.getAssessor().getUserId() : null)
                .assessorName(entity.getAssessor() != null ? entity.getAssessor().getFullName() : null)
                .recordedWeightKg(entity.getRecordedWeightKg())
                .standardMinKg(entity.getStandardMinKg())
                .standardMaxKg(entity.getStandardMaxKg())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .deviationPercent(entity.getDeviationPercent())
                .recommendation(entity.getRecommendation())
                .followUpWeeks(entity.getFollowUpWeeks())
                .assessedAt(entity.getAssessedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private record WeightRange(BigDecimal minKg, BigDecimal maxKg) {
    }
}
