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
import tools.jackson.databind.ObjectMapper;
import vn.edu.fpt.doghandbook.backend.dto.request.HealthRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthRecordResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.HealthRecord;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.FecesStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncConflictLogRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.HealthRecordServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HealthRecordServiceImplTest {

    @Mock private HealthRecordRepository healthRecordRepository;
    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private SyncConflictLogRepository syncConflictLogRepository;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private HealthRecordServiceImpl service;

    private DogProfile dog;
    private User examiner;
    private HealthRecord record;

    @BeforeEach
    void setUp() {
        DogBreed breed = DogBreed.builder().breedId(1).breedName("GSD").build();
        dog = DogProfile.builder()
                .dogId(1).dogCode("DK001").dogName("Rex").dogBreed(breed)
                .gender(DogGender.MALE).status(DogStatus.ACTIVE)
                .currentWeightKg(new BigDecimal("30"))
                .build();
        dog.setCreatedAt(LocalDateTime.now());
        dog.setUpdatedAt(LocalDateTime.now());
        dog.setIsDeleted(false);

        examiner = User.builder()
                .userId(10).username("vet01").passwordHash("h").fullName("Dr. Vet")
                .role(UserRole.TRAINER).isActive(true).isLocked(false).failedLoginCount(0)
                .build();

        record = HealthRecord.builder()
                .recordId(1).dogProfile(dog).examiner(examiner)
                .examinationDate(LocalDateTime.now())
                .weightKg(new BigDecimal("30.5"))
                .temperatureC(new BigDecimal("38.5"))
                .fecesStatus(FecesStatus.NORMAL)
                .notes("OK")
                .build();
        record.setCreatedAt(LocalDateTime.now());
        record.setUpdatedAt(LocalDateTime.now().minusHours(1));
        record.setIsDeleted(false);
    }

    // ──────────────────── getAll ────────────────────

    @Test
    void getAll_returnsPage() {
        Page<HealthRecord> page = new PageImpl<>(List.of(record), PageRequest.of(0, 10), 1);
        when(healthRecordRepository.findByIsDeletedFalseOrderByExaminationDateDesc(any())).thenReturn(page);

        PageResponse<HealthRecordResponse> result = service.getAll(0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getAll_emptyPage_returnsEmpty() {
        Page<HealthRecord> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(healthRecordRepository.findByIsDeletedFalseOrderByExaminationDateDesc(any())).thenReturn(page);

        PageResponse<HealthRecordResponse> result = service.getAll(0, 10);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void getAll_mapsResponseCorrectly() {
        Page<HealthRecord> page = new PageImpl<>(List.of(record), PageRequest.of(0, 10), 1);
        when(healthRecordRepository.findByIsDeletedFalseOrderByExaminationDateDesc(any())).thenReturn(page);

        PageResponse<HealthRecordResponse> result = service.getAll(0, 10);
        HealthRecordResponse resp = (HealthRecordResponse) result.getContent().get(0);

        assertThat(resp.getDogName()).isEqualTo("Rex");
        assertThat(resp.getExaminerName()).isEqualTo("Dr. Vet");
        assertThat(resp.getWeightKg()).isEqualByComparingTo("30.5");
    }

    @Test
    void getAll_pageMetadataCorrect() {
        Page<HealthRecord> page = new PageImpl<>(List.of(record), PageRequest.of(2, 5), 15);
        when(healthRecordRepository.findByIsDeletedFalseOrderByExaminationDateDesc(any())).thenReturn(page);

        PageResponse<HealthRecordResponse> result = service.getAll(2, 5);

        assertThat(result.getPage()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(5);
        assertThat(result.getTotalPages()).isEqualTo(3);
    }

    @Test
    void getAll_callsRepository() {
        Page<HealthRecord> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(healthRecordRepository.findByIsDeletedFalseOrderByExaminationDateDesc(any())).thenReturn(page);

        service.getAll(0, 10);

        verify(healthRecordRepository).findByIsDeletedFalseOrderByExaminationDateDesc(any());
    }

    // ──────────────────── getByDog ────────────────────

    @Test
    void getByDog_returnsFilteredPage() {
        Page<HealthRecord> page = new PageImpl<>(List.of(record), PageRequest.of(0, 10), 1);
        when(healthRecordRepository.findByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<HealthRecordResponse> result = service.getByDog(1, 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getByDog_emptyResult() {
        Page<HealthRecord> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(healthRecordRepository.findByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(eq(99), any()))
                .thenReturn(page);

        PageResponse<HealthRecordResponse> result = service.getByDog(99, 0, 10);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getByDog_callsCorrectRepoMethod() {
        Page<HealthRecord> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(healthRecordRepository.findByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(eq(5), any()))
                .thenReturn(page);

        service.getByDog(5, 0, 10);

        verify(healthRecordRepository).findByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(eq(5), any());
    }

    @Test
    void getByDog_mapsResponseCorrectly() {
        Page<HealthRecord> page = new PageImpl<>(List.of(record), PageRequest.of(0, 10), 1);
        when(healthRecordRepository.findByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<HealthRecordResponse> result = service.getByDog(1, 0, 10);

        assertThat(((HealthRecordResponse) result.getContent().get(0)).getDogCode()).isEqualTo("DK001");
    }

    @Test
    void getByDog_pageInfoCorrect() {
        Page<HealthRecord> page = new PageImpl<>(List.of(record), PageRequest.of(1, 5), 8);
        when(healthRecordRepository.findByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<HealthRecordResponse> result = service.getByDog(1, 1, 5);

        assertThat(result.getPage()).isEqualTo(1);
        assertThat(result.getTotalPages()).isEqualTo(2);
    }

    // ──────────────────── getById ────────────────────

    @Test
    void getById_found_returnsResponse() {
        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(1)).thenReturn(Optional.of(record));

        HealthRecordResponse result = service.getById(1);

        assertThat(result.getRecordId()).isEqualTo(1);
        assertThat(result.getDogName()).isEqualTo("Rex");
    }

    @Test
    void getById_notFound_throwsResourceNotFound() {
        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getById_mapsAllFields() {
        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(1)).thenReturn(Optional.of(record));

        HealthRecordResponse result = service.getById(1);

        assertThat(result.getTemperatureC()).isEqualByComparingTo("38.5");
        assertThat(result.getFecesStatus()).isEqualTo("NORMAL");
        assertThat(result.getNotes()).isEqualTo("OK");
    }

    @Test
    void getById_nullDogProfile_handlesGracefully() {
        record.setDogProfile(null);
        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(1)).thenReturn(Optional.of(record));

        HealthRecordResponse result = service.getById(1);

        assertThat(result.getDogId()).isNull();
        assertThat(result.getDogName()).isNull();
    }

    @Test
    void getById_nullExaminer_handlesGracefully() {
        record.setExaminer(null);
        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(1)).thenReturn(Optional.of(record));

        HealthRecordResponse result = service.getById(1);

        assertThat(result.getExaminerId()).isNull();
        assertThat(result.getExaminerName()).isNull();
    }

    // ──────────────────── create ────────────────────

    @Test
    void create_success_savesRecord() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setDogId(1);
        request.setWeightKg(new BigDecimal("31"));

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findById(10)).thenReturn(Optional.of(examiner));
        when(healthRecordRepository.save(any(HealthRecord.class))).thenReturn(record);
        when(dogProfileRepository.save(any())).thenReturn(dog);

        HealthRecordResponse result = service.create(request, 10);

        assertThat(result).isNotNull();
        verify(healthRecordRepository).save(any(HealthRecord.class));
    }

    @Test
    void create_withWeight_updatesDogWeight() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setDogId(1);
        request.setWeightKg(new BigDecimal("32"));

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findById(10)).thenReturn(Optional.of(examiner));
        when(healthRecordRepository.save(any(HealthRecord.class))).thenReturn(record);
        when(dogProfileRepository.save(any())).thenReturn(dog);

        service.create(request, 10);

        assertThat(dog.getCurrentWeightKg()).isEqualByComparingTo("32");
        verify(dogProfileRepository).save(dog);
    }

    @Test
    void create_withoutWeight_doesNotUpdateDog() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setDogId(1);
        request.setWeightKg(null);

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findById(10)).thenReturn(Optional.of(examiner));
        when(healthRecordRepository.save(any(HealthRecord.class))).thenReturn(record);

        service.create(request, 10);

        verify(dogProfileRepository, never()).save(any());
    }

    @Test
    void create_dogNotFound_throwsResourceNotFound() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setDogId(99);

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request, 10))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_examinerNotFound_throwsResourceNotFound() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setDogId(1);

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request, 99))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_duplicateLocalId_returnsExisting() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setLocalId("local-123");
        request.setDogId(1);

        when(healthRecordRepository.findByLocalId("local-123")).thenReturn(Optional.of(record));

        HealthRecordResponse result = service.create(request, 10);

        assertThat(result.getRecordId()).isEqualTo(1);
        verify(healthRecordRepository, never()).save(any());
    }

    @Test
    void create_nullLocalId_proceedsNormally() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setLocalId(null);
        request.setDogId(1);

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findById(10)).thenReturn(Optional.of(examiner));
        when(healthRecordRepository.save(any(HealthRecord.class))).thenReturn(record);

        HealthRecordResponse result = service.create(request, 10);

        assertThat(result).isNotNull();
    }

    // ──────────────────── update ────────────────────

    @Test
    void update_success_updatesFields() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setDogId(1);
        request.setWeightKg(new BigDecimal("33"));
        request.setNotes("Updated");

        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(1)).thenReturn(Optional.of(record));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(healthRecordRepository.save(any(HealthRecord.class))).thenReturn(record);
        when(dogProfileRepository.save(any())).thenReturn(dog);

        service.update(1, request, 10);

        verify(healthRecordRepository).save(any());
    }

    @Test
    void update_notFound_throwsResourceNotFound() {
        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99, new HealthRecordRequest(), 10))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_differentExaminer_throwsBadRequest() {
        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(1)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.update(1, new HealthRecordRequest(), 999))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void update_syncConflict_throwsSyncConflictException() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setDogId(1);
        request.setLocalUpdatedAt(LocalDateTime.now().minusDays(1));
        record.setUpdatedAt(LocalDateTime.now());

        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(1)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.update(1, request, 10))
                .isInstanceOf(SyncConflictException.class);
    }

    @Test
    void update_noSyncConflict_whenLocalUpdatedAtNull() {
        HealthRecordRequest request = new HealthRecordRequest();
        request.setDogId(1);
        request.setLocalUpdatedAt(null);

        when(healthRecordRepository.findByRecordIdAndIsDeletedFalse(1)).thenReturn(Optional.of(record));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(healthRecordRepository.save(any(HealthRecord.class))).thenReturn(record);

        service.update(1, request, 10);

        verify(healthRecordRepository).save(any());
    }
}
