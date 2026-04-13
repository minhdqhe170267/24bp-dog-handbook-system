package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingSpecialtyRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingSpecialtyResponse;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.TrainingSpecialtyRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.TrainingSpecialtyServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrainingSpecialtyServiceImplTest {

    @Mock private TrainingSpecialtyRepository trainingSpecialtyRepository;

    @InjectMocks
    private TrainingSpecialtyServiceImpl service;

    // ===================== getAll =====================

    @Test
    void getAll_noSearch_returnsAllSpecialties() {
        TrainingSpecialty specialty = buildSpecialty(1, "GD", "Guard Dog");
        Page<TrainingSpecialty> page = new PageImpl<>(List.of(specialty));
        when(trainingSpecialtyRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingSpecialtyResponse> result = service.getAll(0, 10, null);

        assertThat(result.getContent()).hasSize(1);
        TrainingSpecialtyResponse response = (TrainingSpecialtyResponse) result.getContent().get(0);
        assertThat(response.getSpecialtyCode()).isEqualTo("GD");
        assertThat(response.getSpecialtyName()).isEqualTo("Guard Dog");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getAll_withSearch_filtersbyName() {
        TrainingSpecialty specialty = buildSpecialty(1, "DD", "Drug Detection");
        Page<TrainingSpecialty> page = new PageImpl<>(List.of(specialty));
        when(trainingSpecialtyRepository.findBySpecialtyNameContainingIgnoreCaseAndIsDeletedFalse(
                eq("Drug"), any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingSpecialtyResponse> result = service.getAll(0, 10, "Drug");

        assertThat(result.getContent()).hasSize(1);
        TrainingSpecialtyResponse response = (TrainingSpecialtyResponse) result.getContent().get(0);
        assertThat(response.getSpecialtyName()).isEqualTo("Drug Detection");
    }

    @Test
    void getAll_blankSearch_treatsAsNoSearch() {
        Page<TrainingSpecialty> page = new PageImpl<>(List.of());
        when(trainingSpecialtyRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingSpecialtyResponse> result = service.getAll(0, 10, "   ");

        assertThat(result.getContent()).isEmpty();
        verify(trainingSpecialtyRepository).findByIsDeletedFalse(any(Pageable.class));
    }

    @Test
    void getAll_emptyResult_returnsEmptyContent() {
        Page<TrainingSpecialty> page = new PageImpl<>(List.of());
        when(trainingSpecialtyRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingSpecialtyResponse> result = service.getAll(0, 10, null);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
        assertThat(result.getTotalPages()).isEqualTo(page.getTotalPages());
    }

    @Test
    void getAll_multipleResults_returnsAll() {
        TrainingSpecialty s1 = buildSpecialty(1, "GD", "Guard Dog");
        TrainingSpecialty s2 = buildSpecialty(2, "DD", "Drug Detection");
        Page<TrainingSpecialty> page = new PageImpl<>(List.of(s1, s2));
        when(trainingSpecialtyRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingSpecialtyResponse> result = service.getAll(0, 10, null);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    // ===================== getById =====================

    @Test
    void getById_existingSpecialty_returnsResponse() {
        TrainingSpecialty specialty = buildSpecialty(1, "GD", "Guard Dog");
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));

        TrainingSpecialtyResponse result = service.getById(1);

        assertThat(result.getSpecialtyId()).isEqualTo(1);
        assertThat(result.getSpecialtyCode()).isEqualTo("GD");
        assertThat(result.getSpecialtyName()).isEqualTo("Guard Dog");
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void getById_returnsCorrectDescription() {
        TrainingSpecialty specialty = buildSpecialty(1, "EX", "Explosive Detection");
        specialty.setDescription("Specializes in explosive detection");
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));

        TrainingSpecialtyResponse result = service.getById(1);

        assertThat(result.getDescription()).isEqualTo("Specializes in explosive detection");
    }

    @Test
    void getById_returnsVersionInfo() {
        TrainingSpecialty specialty = buildSpecialty(1, "TR", "Tracking");
        specialty.setVersion(3);
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));

        TrainingSpecialtyResponse result = service.getById(1);

        assertThat(result.getVersion()).isEqualTo(3);
    }

    @Test
    void getById_returnsActiveStatus() {
        TrainingSpecialty specialty = buildSpecialty(1, "SR", "Search and Rescue");
        specialty.setIsActive(true);
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));

        TrainingSpecialtyResponse result = service.getById(1);

        assertThat(result.getIsActive()).isTrue();
    }

    // ===================== create =====================

    @Test
    void create_validRequest_returnsCreatedResponse() {
        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("GD");
        request.setSpecialtyName("Guard Dog");
        request.setDescription("Guard dog training");

        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("GD"))
                .thenReturn(Optional.empty());
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            saved.setSpecialtyId(1);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingSpecialtyResponse result = service.create(request);

        assertThat(result.getSpecialtyId()).isEqualTo(1);
        assertThat(result.getSpecialtyCode()).isEqualTo("GD");
        assertThat(result.getSpecialtyName()).isEqualTo("Guard Dog");
    }

    @Test
    void create_duplicateCode_throwsConflictException() {
        TrainingSpecialty existing = buildSpecialty(1, "GD", "Guard Dog");
        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("GD");
        request.setSpecialtyName("New Guard Dog");

        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("GD"))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("chuyên ngành đã tồn tại");
    }

    @Test
    void create_setsVersionToOne() {
        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("DD");
        request.setSpecialtyName("Drug Detection");

        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("DD"))
                .thenReturn(Optional.empty());
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            saved.setSpecialtyId(2);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingSpecialtyResponse result = service.create(request);

        assertThat(result.getVersion()).isEqualTo(1);
    }

    @Test
    void create_nullIsActive_defaultsToTrue() {
        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("SR");
        request.setSpecialtyName("Search and Rescue");
        request.setIsActive(null);

        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("SR"))
                .thenReturn(Optional.empty());
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            saved.setSpecialtyId(3);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingSpecialtyResponse result = service.create(request);

        assertThat(result.getIsActive()).isTrue();
    }

    @Test
    void create_trimmedValues_savedCorrectly() {
        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("  EX  ");
        request.setSpecialtyName("  Explosive Detection  ");
        request.setDescription("  Desc  ");

        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("EX"))
                .thenReturn(Optional.empty());
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            saved.setSpecialtyId(4);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingSpecialtyResponse result = service.create(request);

        assertThat(result.getSpecialtyCode()).isEqualTo("EX");
        assertThat(result.getSpecialtyName()).isEqualTo("Explosive Detection");
    }

    // ===================== update =====================

    @Test
    void update_validRequest_updatesAndReturnsResponse() {
        TrainingSpecialty existing = buildSpecialty(1, "GD", "Guard Dog");
        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("GD");
        request.setSpecialtyName("Updated Guard Dog");
        request.setDescription("Updated description");

        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("GD"))
                .thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingSpecialtyResponse result = service.update(1, request);

        assertThat(result.getSpecialtyName()).isEqualTo("Updated Guard Dog");
        assertThat(result.getDescription()).isEqualTo("Updated description");
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("XX");
        request.setSpecialtyName("Nonexistent");

        assertThatThrownBy(() -> service.update(999, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void update_duplicateCodeFromDifferentId_throwsConflictException() {
        TrainingSpecialty existing = buildSpecialty(1, "GD", "Guard Dog");
        TrainingSpecialty other = buildSpecialty(2, "DD", "Drug Detection");

        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("DD");
        request.setSpecialtyName("Guard Dog Renamed");

        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("DD"))
                .thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.update(1, request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("chuyên ngành đã tồn tại");
    }

    @Test
    void update_sameCodeSameId_doesNotThrowConflict() {
        TrainingSpecialty existing = buildSpecialty(1, "GD", "Guard Dog");

        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("GD");
        request.setSpecialtyName("Guard Dog Updated");

        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("GD"))
                .thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingSpecialtyResponse result = service.update(1, request);

        assertThat(result.getSpecialtyName()).isEqualTo("Guard Dog Updated");
    }

    @Test
    void update_withIsActive_updatesActiveStatus() {
        TrainingSpecialty existing = buildSpecialty(1, "GD", "Guard Dog");
        existing.setIsActive(true);

        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("GD");
        request.setSpecialtyName("Guard Dog");
        request.setIsActive(false);

        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse("GD"))
                .thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingSpecialtyResponse result = service.update(1, request);

        assertThat(result.getIsActive()).isFalse();
    }

    // ===================== delete =====================

    @Test
    void delete_existingSpecialty_softDeletes() {
        TrainingSpecialty existing = buildSpecialty(1, "GD", "Guard Dog");
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(1);

        verify(trainingSpecialtyRepository).save(any(TrainingSpecialty.class));
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void delete_setsDeletedAtTimestamp() {
        TrainingSpecialty existing = buildSpecialty(1, "GD", "Guard Dog");
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            assertThat(saved.getIsDeleted()).isTrue();
            assertThat(saved.getDeletedAt()).isNotNull();
            return saved;
        });

        service.delete(1);

        verify(trainingSpecialtyRepository).save(any(TrainingSpecialty.class));
    }

    @Test
    void delete_setsIsDeletedTrue() {
        TrainingSpecialty existing = buildSpecialty(1, "DD", "Drug Detection");
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> {
            TrainingSpecialty saved = invocation.getArgument(0);
            assertThat(saved.getIsDeleted()).isTrue();
            return saved;
        });

        service.delete(1);

        verify(trainingSpecialtyRepository).save(any(TrainingSpecialty.class));
    }

    @Test
    void delete_callsSaveOnRepository() {
        TrainingSpecialty existing = buildSpecialty(1, "TR", "Tracking");
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(existing));
        when(trainingSpecialtyRepository.save(any(TrainingSpecialty.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(1);

        verify(trainingSpecialtyRepository).findBySpecialtyIdAndIsDeletedFalse(1);
        verify(trainingSpecialtyRepository).save(any(TrainingSpecialty.class));
    }

    // ===================== Helper methods =====================

    private TrainingSpecialty buildSpecialty(Integer id, String code, String name) {
        TrainingSpecialty specialty = TrainingSpecialty.builder()
                .specialtyId(id)
                .specialtyCode(code)
                .specialtyName(name)
                .description("Description of " + name)
                .version(1)
                .isActive(true)
                .isDeleted(false)
                .build();
        specialty.setCreatedAt(LocalDateTime.now());
        specialty.setUpdatedAt(LocalDateTime.now());
        return specialty;
    }
}
