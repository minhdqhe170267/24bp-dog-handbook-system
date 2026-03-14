package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.OperationReportRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.OperationReportResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.OperationReport;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ReportType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.OperationReportRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.OperationReportService;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OperationReportServiceImpl implements OperationReportService {

    private final OperationReportRepository operationReportRepository;
    private final UserRepository userRepository;
    private final DogProfileRepository dogProfileRepository;

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
        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with id: " + trainerId));

        ReportType reportType = parseReportType(request.getReportType());

        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId())
                .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + request.getDogId()));

        OperationReport report = OperationReport.builder()
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
