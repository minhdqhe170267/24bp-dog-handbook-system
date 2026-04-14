package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tools.jackson.databind.ObjectMapper;
import vn.edu.fpt.doghandbook.backend.dto.request.OperationReportRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.OperationReportResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.OperationReport;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ReportType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.OperationReportRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncConflictLogRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.OperationReportServiceImpl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperationReportServiceImplTest {

    @Mock private OperationReportRepository operationReportRepository;
    @Mock private UserRepository userRepository;
    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private SyncConflictLogRepository syncConflictLogRepository;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private OperationReportServiceImpl service;

    private User trainer;
    private DogProfile dog;
    private OperationReport report;

    @BeforeEach
    void setUp() {
        trainer = User.builder().userId(1).username("trainer01").fullName("Trainer One")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
        dog = DogProfile.builder().dogId(10).dogName("Rex").dogCode("DOG-001").build();

        report = OperationReport.builder()
                .reportId(100)
                .trainer(trainer)
                .dogProfile(dog)
                .reportType(ReportType.TRAINING)
                .reportTitle("Training Report")
                .reportDate(LocalDate.of(2025, 1, 15))
                .reportContent("Report content here")
                .isDeleted(false)
                .build();
    }

    private OperationReportRequest makeRequest() {
        OperationReportRequest req = new OperationReportRequest();
        req.setDogId(10);
        req.setReportType("TRAINING");
        req.setReportTitle("New Report");
        req.setReportDate(LocalDate.of(2025, 2, 1));
        req.setReportContent("Content");
        return req;
    }

    // ──────────────────── getAll ────────────────────

    @Test
    void getAll_noType_returnsPage() {
        Page<OperationReport> page = new PageImpl<>(List.of(report), PageRequest.of(0, 10), 1);
        when(operationReportRepository.findByIsDeletedFalseOrderByReportDateDesc(any(Pageable.class)))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getAll(0, 10, null);

        assertThat(result.getTotalElements()).isEqualTo(1);
        OperationReportResponse resp = (OperationReportResponse) result.getContent().get(0);
        assertThat(resp.getReportTitle()).isEqualTo("Training Report");
    }

    @Test
    void getAll_withType_filtersResults() {
        Page<OperationReport> page = new PageImpl<>(List.of(report), PageRequest.of(0, 10), 1);
        when(operationReportRepository.findByReportTypeAndIsDeletedFalseOrderByReportDateDesc(
                eq(ReportType.TRAINING), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getAll(0, 10, "TRAINING");

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getAll_blankType_treatedAsNoFilter() {
        Page<OperationReport> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(operationReportRepository.findByIsDeletedFalseOrderByReportDateDesc(any(Pageable.class)))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getAll(0, 10, "   ");

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getAll_invalidType_throwsBadRequest() {
        assertThatThrownBy(() -> service.getAll(0, 10, "INVALID"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getAll_mapsResponseFields() {
        Page<OperationReport> page = new PageImpl<>(List.of(report), PageRequest.of(0, 10), 1);
        when(operationReportRepository.findByIsDeletedFalseOrderByReportDateDesc(any(Pageable.class)))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getAll(0, 10, null);
        OperationReportResponse resp = (OperationReportResponse) result.getContent().get(0);

        assertThat(resp.getReportId()).isEqualTo(100);
        assertThat(resp.getTrainerId()).isEqualTo(1);
        assertThat(resp.getTrainerName()).isEqualTo("Trainer One");
        assertThat(resp.getDogId()).isEqualTo(10);
        assertThat(resp.getDogName()).isEqualTo("Rex");
        assertThat(resp.getReportType()).isEqualTo("TRAINING");
    }

    // ──────────────────── getByTrainer ────────────────────

    @Test
    void getByTrainer_returnsPage() {
        Page<OperationReport> page = new PageImpl<>(List.of(report), PageRequest.of(0, 10), 1);
        when(operationReportRepository.findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getByTrainer(1, 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getByTrainer_emptyResult() {
        Page<OperationReport> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(operationReportRepository.findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(eq(99), any()))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getByTrainer(99, 0, 10);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getByTrainer_correctPageMetadata() {
        Page<OperationReport> page = new PageImpl<>(List.of(report), PageRequest.of(2, 5), 15);
        when(operationReportRepository.findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getByTrainer(1, 2, 5);

        assertThat(result.getPage()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(5);
        assertThat(result.getTotalElements()).isEqualTo(15);
    }

    @Test
    void getByTrainer_mapsTrainerName() {
        Page<OperationReport> page = new PageImpl<>(List.of(report), PageRequest.of(0, 10), 1);
        when(operationReportRepository.findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getByTrainer(1, 0, 10);
        OperationReportResponse resp = (OperationReportResponse) result.getContent().get(0);

        assertThat(resp.getTrainerName()).isEqualTo("Trainer One");
    }

    @Test
    void getByTrainer_mapsDogCode() {
        Page<OperationReport> page = new PageImpl<>(List.of(report), PageRequest.of(0, 10), 1);
        when(operationReportRepository.findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<OperationReportResponse> result = service.getByTrainer(1, 0, 10);
        OperationReportResponse resp = (OperationReportResponse) result.getContent().get(0);

        assertThat(resp.getDogCode()).isEqualTo("DOG-001");
    }

    // ──────────────────── getById ────────────────────

    @Test
    void getById_found_returnsResponse() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        OperationReportResponse result = service.getById(100);

        assertThat(result.getReportId()).isEqualTo(100);
        assertThat(result.getReportTitle()).isEqualTo("Training Report");
    }

    @Test
    void getById_notFound_throwsResourceNotFound() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(999))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getById_mapsAllFields() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        OperationReportResponse result = service.getById(100);

        assertThat(result.getReportDate()).isEqualTo(LocalDate.of(2025, 1, 15));
        assertThat(result.getReportContent()).isEqualTo("Report content here");
    }

    @Test
    void getById_mapsDogInfo() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        OperationReportResponse result = service.getById(100);

        assertThat(result.getDogId()).isEqualTo(10);
        assertThat(result.getDogName()).isEqualTo("Rex");
        assertThat(result.getDogCode()).isEqualTo("DOG-001");
    }

    @Test
    void getById_mapsReportType() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        OperationReportResponse result = service.getById(100);

        assertThat(result.getReportType()).isEqualTo("TRAINING");
    }

    // ──────────────────── create ────────────────────

    @Test
    void create_success_returnsResponse() {
        OperationReportRequest req = makeRequest();
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(operationReportRepository.save(any(OperationReport.class))).thenReturn(report);

        OperationReportResponse result = service.create(req, 1);

        assertThat(result.getReportTitle()).isEqualTo("Training Report");
        verify(operationReportRepository).save(any(OperationReport.class));
    }

    @Test
    void create_trainerNotFound_throwsResourceNotFound() {
        OperationReportRequest req = makeRequest();
        when(userRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(req, 999))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_dogNotFound_throwsResourceNotFound() {
        OperationReportRequest req = makeRequest();
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(req, 1))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_withLocalIdExisting_returnsExisting() {
        OperationReportRequest req = makeRequest();
        req.setLocalId("local-123");
        when(operationReportRepository.findByLocalId("local-123")).thenReturn(Optional.of(report));

        OperationReportResponse result = service.create(req, 1);

        assertThat(result.getReportId()).isEqualTo(100);
        verify(operationReportRepository, never()).save(any());
    }

    @Test
    void create_invalidReportType_throwsBadRequest() {
        OperationReportRequest req = makeRequest();
        req.setReportType("INVALID");
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));

        assertThatThrownBy(() -> service.create(req, 1))
                .isInstanceOf(BadRequestException.class);
    }

    // ──────────────────── update ────────────────────

    @Test
    void update_success_updatesFields() {
        OperationReportRequest req = makeRequest();
        req.setReportTitle("Updated Title");
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(operationReportRepository.save(any(OperationReport.class))).thenAnswer(inv -> inv.getArgument(0));

        OperationReportResponse result = service.update(100, req, 1);

        assertThat(result.getReportTitle()).isEqualTo("Updated Title");
    }

    @Test
    void update_notFound_throwsResourceNotFound() {
        OperationReportRequest req = makeRequest();
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(999, req, 1))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_wrongTrainer_throwsBadRequest() {
        OperationReportRequest req = makeRequest();
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> service.update(100, req, 999))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void update_syncConflict_throwsSyncConflictException() throws Exception {
        OperationReportRequest req = makeRequest();
        req.setLocalUpdatedAt(LocalDateTime.of(2025, 1, 1, 8, 0));
        report.setUpdatedAt(LocalDateTime.of(2025, 1, 1, 12, 0));
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        assertThatThrownBy(() -> service.update(100, req, 1))
                .isInstanceOf(SyncConflictException.class);
    }

    @Test
    void update_noConflict_whenLocalUpdatedAtNull() {
        OperationReportRequest req = makeRequest();
        req.setLocalUpdatedAt(null);
        report.setUpdatedAt(LocalDateTime.of(2025, 1, 1, 12, 0));
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(operationReportRepository.save(any(OperationReport.class))).thenAnswer(inv -> inv.getArgument(0));

        OperationReportResponse result = service.update(100, req, 1);

        assertThat(result).isNotNull();
    }

    @Test
    void update_changesDogProfile() {
        OperationReportRequest req = makeRequest();
        req.setDogId(20);
        DogProfile newDog = DogProfile.builder().dogId(20).dogName("Buddy").dogCode("DOG-002").build();
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(20)).thenReturn(Optional.of(newDog));
        when(operationReportRepository.save(any(OperationReport.class))).thenAnswer(inv -> inv.getArgument(0));

        OperationReportResponse result = service.update(100, req, 1);

        assertThat(result.getDogName()).isEqualTo("Buddy");
    }

    // ──────────────────── delete ────────────────────

    @Test
    void delete_success_softDeletes() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        service.delete(100, 1);

        assertThat(report.getIsDeleted()).isTrue();
        assertThat(report.getDeletedAt()).isNotNull();
        verify(operationReportRepository).save(report);
    }

    @Test
    void delete_notFound_throwsResourceNotFound() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(999, 1))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_wrongTrainer_throwsBadRequest() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> service.delete(100, 999))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void delete_setsDeletedAt() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        service.delete(100, 1);

        assertThat(report.getDeletedAt()).isNotNull();
    }

    @Test
    void delete_savesEntity() {
        when(operationReportRepository.findByReportIdAndIsDeletedFalse(100)).thenReturn(Optional.of(report));

        service.delete(100, 1);

        verify(operationReportRepository).save(report);
    }
}
