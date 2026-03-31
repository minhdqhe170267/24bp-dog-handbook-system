package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import vn.edu.fpt.doghandbook.backend.dto.request.HealthRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthRecordResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.HealthRecord;
import vn.edu.fpt.doghandbook.backend.entity.SyncConflictLog;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AppetiteLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.FecesStatus;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncConflictLogRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.HealthRecordService;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthRecordServiceImpl implements HealthRecordService {

    private final HealthRecordRepository healthRecordRepository;
    private final DogProfileRepository dogProfileRepository;
    private final UserRepository userRepository;
    private final SyncConflictLogRepository syncConflictLogRepository;
    private final ObjectMapper objectMapper;

    @Override
    public PageResponse<HealthRecordResponse> getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HealthRecord> recordPage = healthRecordRepository.findByIsDeletedFalseOrderByExaminationDateDesc(pageable);

        List<HealthRecordResponse> content = recordPage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<HealthRecordResponse>builder()
                .content(content)
                .page(recordPage.getNumber())
                .size(recordPage.getSize())
                .totalElements(recordPage.getTotalElements())
                .totalPages(recordPage.getTotalPages())
                .build();
    }

    @Override
    public PageResponse<HealthRecordResponse> getByDog(Integer dogId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HealthRecord> recordPage = healthRecordRepository
                .findByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(dogId, pageable);

        List<HealthRecordResponse> content = recordPage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<HealthRecordResponse>builder()
                .content(content)
                .page(recordPage.getNumber())
                .size(recordPage.getSize())
                .totalElements(recordPage.getTotalElements())
                .totalPages(recordPage.getTotalPages())
                .build();
    }

    @Override
    public HealthRecordResponse getById(Integer recordId) {
        HealthRecord record = healthRecordRepository.findByRecordIdAndIsDeletedFalse(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Health record not found with id: " + recordId));
        return toResponse(record);
    }

    @Override
    @Transactional
    public HealthRecordResponse create(HealthRecordRequest request, Integer examinerId) {
        if (request.getLocalId() != null) {
            var existing = healthRecordRepository.findByLocalId(request.getLocalId());
            if (existing.isPresent()) {
                return toResponse(existing.get());
            }
        }

        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId())
                .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + request.getDogId()));

        User examiner = userRepository.findById(examinerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + examinerId));

        HealthRecord record = HealthRecord.builder()
                .localId(request.getLocalId())
                .dogProfile(dog)
                .examiner(examiner)
                .examinationDate(LocalDateTime.now())
                .weightKg(request.getWeightKg())
                .temperatureC(request.getTemperatureC())
                .fecesStatus(request.getFecesStatus() != null ? FecesStatus.valueOf(request.getFecesStatus()) : FecesStatus.NOT_CHECKED)
                .appetiteLevel(request.getAppetiteLevel() != null ? AppetiteLevel.valueOf(request.getAppetiteLevel()) : null)
                .activityLevel(request.getActivityLevel() != null ? DogActivityLevel.valueOf(request.getActivityLevel()) : null)
                .observedSymptoms(request.getObservedSymptoms())
                .diagnosis(request.getDiagnosis())
                .treatmentGiven(request.getTreatmentGiven())
                .nextCheckupDate(request.getNextCheckupDate())
                .notes(request.getNotes())
                .isDeleted(false)
                .build();

        record = healthRecordRepository.save(record);

        if (request.getWeightKg() != null) {
            dog.setCurrentWeightKg(request.getWeightKg());
            dogProfileRepository.save(dog);
        }

        return toResponse(record);
    }

    @Override
    @Transactional
    public HealthRecordResponse update(Integer recordId, HealthRecordRequest request, Integer examinerId) {
        HealthRecord record = healthRecordRepository.findByRecordIdAndIsDeletedFalse(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Health record not found with id: " + recordId));

        if (!record.getExaminer().getUserId().equals(examinerId)) {
            throw new BadRequestException("Không có quyền chỉnh sửa hồ sơ sức khỏe này");
        }

        if (request.getLocalUpdatedAt() != null
                && record.getUpdatedAt() != null
                && record.getUpdatedAt().isAfter(request.getLocalUpdatedAt())) {
            log.warn("[SYNC:CONFLICT] health_record id={} serverTime={} > localTime={}",
                    recordId, record.getUpdatedAt(), request.getLocalUpdatedAt());

            // Save conflict details before throwing
            try {
                SyncConflictLog conflictLog = SyncConflictLog.builder()
                        .entityType("health_record")
                        .entityId(recordId)
                        .localId(request.getLocalId())
                        .localData(objectMapper.writeValueAsString(request))
                        .serverData(objectMapper.writeValueAsString(toResponse(record)))
                        .status(ConflictStatus.PENDING)
                        .trainerId(examinerId)
                        .trainerName(record.getExaminer().getFullName())
                        .conflictDetectedAt(LocalDateTime.now())
                        .build();
                syncConflictLogRepository.save(conflictLog);
                log.info("[SYNC:CONFLICT] Saved conflict log: health_record id={}, localId={}",
                        recordId, request.getLocalId());
            } catch (Exception ex) {
                log.error("[SYNC:CONFLICT] Failed to save conflict log: health_record id={}, error={}",
                        recordId, ex.getMessage());
            }

            throw new SyncConflictException("Record modified on server", toResponse(record));
        }

        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId())
                .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + request.getDogId()));
        record.setDogProfile(dog);

        if (request.getWeightKg() != null) record.setWeightKg(request.getWeightKg());
        if (request.getTemperatureC() != null) record.setTemperatureC(request.getTemperatureC());
        if (request.getFecesStatus() != null) record.setFecesStatus(FecesStatus.valueOf(request.getFecesStatus()));
        if (request.getAppetiteLevel() != null) record.setAppetiteLevel(AppetiteLevel.valueOf(request.getAppetiteLevel()));
        if (request.getActivityLevel() != null) record.setActivityLevel(DogActivityLevel.valueOf(request.getActivityLevel()));
        if (request.getObservedSymptoms() != null) record.setObservedSymptoms(request.getObservedSymptoms());
        if (request.getDiagnosis() != null) record.setDiagnosis(request.getDiagnosis());
        if (request.getTreatmentGiven() != null) record.setTreatmentGiven(request.getTreatmentGiven());
        if (request.getNextCheckupDate() != null) record.setNextCheckupDate(request.getNextCheckupDate());
        if (request.getNotes() != null) record.setNotes(request.getNotes());

        record = healthRecordRepository.save(record);

        if (request.getWeightKg() != null) {
            dog.setCurrentWeightKg(request.getWeightKg());
            dogProfileRepository.save(dog);
        }

        return toResponse(record);
    }

    private HealthRecordResponse toResponse(HealthRecord entity) {
        return HealthRecordResponse.builder()
                .recordId(entity.getRecordId())
                .dogId(entity.getDogProfile() != null ? entity.getDogProfile().getDogId() : null)
                .dogName(entity.getDogProfile() != null ? entity.getDogProfile().getDogName() : null)
                .dogCode(entity.getDogProfile() != null ? entity.getDogProfile().getDogCode() : null)
                .examinerId(entity.getExaminer() != null ? entity.getExaminer().getUserId() : null)
                .examinerName(entity.getExaminer() != null ? entity.getExaminer().getFullName() : null)
                .examinationDate(entity.getExaminationDate())
                .weightKg(entity.getWeightKg())
                .temperatureC(entity.getTemperatureC())
                .fecesStatus(entity.getFecesStatus() != null ? entity.getFecesStatus().name() : null)
                .appetiteLevel(entity.getAppetiteLevel() != null ? entity.getAppetiteLevel().name() : null)
                .activityLevel(entity.getActivityLevel() != null ? entity.getActivityLevel().name() : null)
                .observedSymptoms(entity.getObservedSymptoms())
                .diagnosis(entity.getDiagnosis())
                .treatmentGiven(entity.getTreatmentGiven())
                .nextCheckupDate(entity.getNextCheckupDate())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
