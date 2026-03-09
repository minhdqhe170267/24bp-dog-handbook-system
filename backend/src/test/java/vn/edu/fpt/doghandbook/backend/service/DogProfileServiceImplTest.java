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
import vn.edu.fpt.doghandbook.backend.dto.request.DogProfileRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogProfileResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.DogProfileServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DogProfileServiceImplTest {

    @Mock DogProfileRepository dogProfileRepository;
    @Mock DogBreedRepository dogBreedRepository;
    @InjectMocks DogProfileServiceImpl service;

    DogBreed breed;
    DogProfile dog;

    @BeforeEach
    void setUp() {
        breed = DogBreed.builder()
                .breedId(1)
                .breedName("Berger Đức")
                .build();

        dog = DogProfile.builder()
                .dogId(1)
                .dogCode("DK001")
                .dogName("Rex")
                .dogBreed(breed)
                .birthDate(LocalDate.of(2022, 3, 15))
                .gender(DogGender.MALE)
                .currentWeightKg(new BigDecimal("34.5"))
                .status(DogStatus.ACTIVE)
                .build();

        // set audit fields manually (bypassing @PrePersist in unit test)
        dog.setCreatedAt(LocalDateTime.now().minusDays(10));
        dog.setUpdatedAt(LocalDateTime.now());
        dog.setIsDeleted(false);
    }

    // ──────────────────── getAll ────────────────────

    @Test
    void getAll_noSearch_returnsPage() {
        Page<DogProfile> page = new PageImpl<>(List.of(dog), PageRequest.of(0, 10), 1);
        when(dogProfileRepository.findByIsDeletedFalse(any())).thenReturn(page);

        PageResponse<DogProfileResponse> result = service.getAll(0, 10, null);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(1);
        DogProfileResponse resp = (DogProfileResponse) result.getContent().get(0);
        assertThat(resp.getDogCode()).isEqualTo("DK001");
        assertThat(resp.getBreedName()).isEqualTo("Berger Đức");
        verify(dogProfileRepository).findByIsDeletedFalse(any());
    }

    @Test
    void getAll_withSearch_callsSearchQuery() {
        Page<DogProfile> page = new PageImpl<>(List.of(dog), PageRequest.of(0, 10), 1);
        when(dogProfileRepository.findByDogNameContainingIgnoreCaseAndIsDeletedFalse(anyString(), any()))
                .thenReturn(page);

        PageResponse<DogProfileResponse> result = service.getAll(0, 10, "Rex");

        assertThat(result.getContent()).hasSize(1);
        verify(dogProfileRepository).findByDogNameContainingIgnoreCaseAndIsDeletedFalse(eq("Rex"), any());
        verify(dogProfileRepository, never()).findByIsDeletedFalse(any());
    }

    @Test
    void getAll_blankSearch_treatsAsNoSearch() {
        Page<DogProfile> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(dogProfileRepository.findByIsDeletedFalse(any())).thenReturn(page);

        service.getAll(0, 10, "   ");

        verify(dogProfileRepository).findByIsDeletedFalse(any());
        verify(dogProfileRepository, never()).findByDogNameContainingIgnoreCaseAndIsDeletedFalse(any(), any());
    }

    // ──────────────────── getById ────────────────────

    @Test
    void getById_found_returnsResponse() {
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));

        DogProfileResponse result = service.getById(1);

        assertThat(result.getDogId()).isEqualTo(1);
        assertThat(result.getDogName()).isEqualTo("Rex");
        assertThat(result.getBreedId()).isEqualTo(1);
        assertThat(result.getAgeMonths()).isNotNull().isGreaterThan(0);
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    // ──────────────────── create ────────────────────

    @Test
    void create_success_generatesDogCode() {
        DogProfileRequest request = new DogProfileRequest();
        request.setBreedId(1);
        request.setDogName("Bruno");
        request.setGender("MALE");
        request.setDateOfBirth(LocalDate.of(2023, 1, 10));
        request.setCurrentWeightKg(new BigDecimal("28.0"));

        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));

        // first save returns dog with id=7
        DogProfile savedWithId = DogProfile.builder()
                .dogId(7).dogCode("TEMP").dogName("Bruno").dogBreed(breed)
                .gender(DogGender.MALE).status(DogStatus.ACTIVE)
                .birthDate(LocalDate.of(2023, 1, 10))
                .currentWeightKg(new BigDecimal("28.0"))
                .build();
        savedWithId.setCreatedAt(LocalDateTime.now());
        savedWithId.setUpdatedAt(LocalDateTime.now());
        savedWithId.setIsDeleted(false);

        // second save returns dog with dogCode set
        DogProfile savedWithCode = DogProfile.builder()
                .dogId(7).dogCode("DK007").dogName("Bruno").dogBreed(breed)
                .gender(DogGender.MALE).status(DogStatus.ACTIVE)
                .birthDate(LocalDate.of(2023, 1, 10))
                .currentWeightKg(new BigDecimal("28.0"))
                .build();
        savedWithCode.setCreatedAt(LocalDateTime.now());
        savedWithCode.setUpdatedAt(LocalDateTime.now());
        savedWithCode.setIsDeleted(false);

        when(dogProfileRepository.save(any(DogProfile.class)))
                .thenReturn(savedWithId)
                .thenReturn(savedWithCode);

        DogProfileResponse result = service.create(request);

        assertThat(result.getDogCode()).isEqualTo("DK007");
        assertThat(result.getDogName()).isEqualTo("Bruno");
        verify(dogProfileRepository, times(2)).save(any(DogProfile.class));
    }

    @Test
    void create_breedNotFound_throwsResourceNotFoundException() {
        DogProfileRequest request = new DogProfileRequest();
        request.setBreedId(99);

        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");

        verify(dogProfileRepository, never()).save(any());
    }

    // ──────────────────── update ────────────────────

    @Test
    void update_success_updatesFields() {
        DogProfileRequest request = new DogProfileRequest();
        request.setDogName("Rex Updated");
        request.setStatus("INACTIVE");

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(dogProfileRepository.save(any())).thenReturn(dog);

        service.update(1, request);

        assertThat(dog.getDogName()).isEqualTo("Rex Updated");
        assertThat(dog.getStatus()).isEqualTo(DogStatus.INACTIVE);
        verify(dogProfileRepository).save(dog);
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99, new DogProfileRequest()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_withNewBreed_changesBreed() {
        DogBreed newBreed = DogBreed.builder().breedId(2).breedName("Malinois").build();
        DogProfileRequest request = new DogProfileRequest();
        request.setBreedId(2);

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(2)).thenReturn(Optional.of(newBreed));
        when(dogProfileRepository.save(any())).thenReturn(dog);

        service.update(1, request);

        assertThat(dog.getDogBreed().getBreedId()).isEqualTo(2);
    }

    // ──────────────────── delete ────────────────────

    @Test
    void delete_success_softDeletes() {
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(dogProfileRepository.save(any())).thenReturn(dog);

        service.delete(1);

        assertThat(dog.getIsDeleted()).isTrue();
        assertThat(dog.getDeletedAt()).isNotNull();
        verify(dogProfileRepository).save(dog);
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ──────────────────── toResponse: ageMonths ────────────────────

    @Test
    void getById_noBirthDate_ageMonthsIsNull() {
        dog.setBirthDate(null);
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));

        DogProfileResponse result = service.getById(1);

        assertThat(result.getAgeMonths()).isNull();
    }
}
