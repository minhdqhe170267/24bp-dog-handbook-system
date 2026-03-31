package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import vn.edu.fpt.doghandbook.backend.dto.request.OperationReportRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.OperationReportResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.OperationReport;
import vn.edu.fpt.doghandbook.backend.entity.SyncConflictLog;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ReportType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.OperationReportRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncConflictLogRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.OperationReportService;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OperationReportServiceImpl implements OperationReportService {

    private final OperationReportRepository operationReportRepository;
    private final UserRepository userRepository;
    private final DogProfileRepository dogProfileRepository;
    private final SyncConflictLogRepository syncConflictLogRepository;
    private final ObjectMapper objectMapper;

    @Override
    public PageResponse<OperationReportResponse> getAll(int page, int size, String type) {
        Pageable pageable = PageRequest.of(page, size);
        Page<OperationReport> reportPage;

        if (type != null && !type.isBlank()) {
            ReportType reportType = parseReportType(type);
            reportPage = operationReportRepository.findByReportTypeAndIsDeletedFalseOrderByReportDateDesc(reportType, pageable);
        } else {
            reportPage = operationReportRepository.findByIsDeletedFalseOrderByReportDateDesc(pageable);
        }

        List<OperationReportResponse> content = reportPage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<OperationReportResponse>builder()
                .content(content)
                .page(reportPage.getNumber())
                .size(reportPage.getSize())
                .totalElements(reportPage.getTotalElements())
                .totalPages(reportPage.getTotalPages())
                .build();
    }

    @Override
    public PageResponse<OperationReportResponse> getByTrainer(Integer trainerId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<OperationReport> reportPage = operationReportRepository
                .findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(trainerId, pageable);

        List<OperationReportResponse> content = reportPage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<OperationReportResponse>builder()
                .content(content)
                .page(reportPage.getNumber())
                .size(reportPage.getSize())
                .totalElements(reportPage.getTotalElements())
                .totalPages(reportPage.getTotalPages())
                .build();
    }

    @Override
    public OperationReportResponse getById(Integer reportId) {
        OperationReport report = operationReportRepository.findByReportIdAndIsDeletedFalse(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Operation report not found with id: " + reportId));
        return toResponse(report);
    }

    @Override
    @Transactional
    public OperationReportResponse create(OperationReportRequest request, Integer trainerId) {
        if (request.getLocalId() != null) {
            var existing = operationReportRepository.findByLocalId(request.getLocalId());
            if (existing.isPresent()) {
                return toResponse(existing.get());
            }
        }

        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with id: " + trainerId));

        ReportType reportType = parseReportType(request.getReportType());

        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId())
                .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + request.getDogId()));

        OperationReport report = OperationReport.builder()
                .localId(request.getLocalId())
                .trainer(trainer)
                .dogProfile(dog)
                .reportType(reportType)
                .reportTitle(request.getReportTitle())
                .reportDate(request.getReportDate())
                .reportContent(request.getReportContent())
                .metadata(request.getMetadata())
                .isDeleted(false)
                .build();

        return toResponse(operationReportRepository.save(report));
    }

    @Override
    @Transactional
    public OperationReportResponse update(Integer reportId, OperationReportRequest request, Integer trainerId) {
        OperationReport report = operationReportRepository.findByReportIdAndIsDeletedFalse(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Operation report not found with id: " + reportId));

        if (!report.getTrainer().getUserId().equals(trainerId)) {
            throw new BadRequestException("Không có quyền chỉnh sửa báo cáo này");
        }

        // Conflict detection
        if (request.getLocalUpdatedAt() != null
                && report.getUpdatedAt() != null
                && report.getUpdatedAt().isAfter(request.getLocalUpdatedAt())) {
            log.warn("[SYNC:CONFLICT] operation_report id={} serverTime={} > localTime={}",
                    reportId, report.getUpdatedAt(), request.getLocalUpdatedAt());

            // Save conflict details before throwing
            try {
                SyncConflictLog conflictLog = SyncConflictLog.builder()
                        .entityType("operation_report")
                        .entityId(reportId)
                        .localId(request.getLocalId())
                        .localData(objectMapper.writeValueAsString(request))
                        .serverData(objectMapper.writeValueAsString(toResponse(report)))
                        .status(ConflictStatus.PENDING)
                        .trainerId(trainerId)
                        .trainerName(report.getTrainer().getFullName())
                        .conflictDetectedAt(LocalDateTime.now())
                        .build();
                syncConflictLogRepository.save(conflictLog);
                log.info("[SYNC:CONFLICT] Saved conflict log: operation_report id={}, localId={}",
                        reportId, request.getLocalId());
            } catch (Exception ex) {
                log.error("[SYNC:CONFLICT] Failed to save conflict log: operation_report id={}, error={}",
                        reportId, ex.getMessage());
            }

            throw new SyncConflictException("Record modified on server", toResponse(report));
        }

        if (request.getReportType() != null) {
            report.setReportType(parseReportType(request.getReportType()));
        }
        if (request.getReportTitle() != null) report.setReportTitle(request.getReportTitle());
        if (request.getReportDate() != null) report.setReportDate(request.getReportDate());
        if (request.getReportContent() != null) report.setReportContent(request.getReportContent());
        if (request.getMetadata() != null) report.setMetadata(request.getMetadata());

        if (request.getDogId() != null) {
            DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId())
                    .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + request.getDogId()));
            report.setDogProfile(dog);
        }

        return toResponse(operationReportRepository.save(report));
    }

    @Override
    @Transactional
    public void delete(Integer reportId, Integer trainerId) {
        OperationReport report = operationReportRepository.findByReportIdAndIsDeletedFalse(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Operation report not found with id: " + reportId));

        if (!report.getTrainer().getUserId().equals(trainerId)) {
            throw new BadRequestException("Không có quyền xóa báo cáo này");
        }

        report.setIsDeleted(true);
        report.setDeletedAt(LocalDateTime.now());
        operationReportRepository.save(report);
    }

    private ReportType parseReportType(String type) {
        try {
            return ReportType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Report type phải là TRAINING hoặc HEALTH");
        }
    }

    private OperationReportResponse toResponse(OperationReport entity) {
        return OperationReportResponse.builder()
                .reportId(entity.getReportId())
                .trainerId(entity.getTrainer().getUserId())
                .trainerName(entity.getTrainer().getFullName())
                .dogId(entity.getDogProfile().getDogId())
                .dogName(entity.getDogProfile().getDogName())
                .dogCode(entity.getDogProfile().getDogCode())
                .reportType(entity.getReportType().name())
                .reportTitle(entity.getReportTitle())
                .reportDate(entity.getReportDate())
                .reportContent(entity.getReportContent())
                .metadata(entity.getMetadata())
                .exportUrl(entity.getExportUrl())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
