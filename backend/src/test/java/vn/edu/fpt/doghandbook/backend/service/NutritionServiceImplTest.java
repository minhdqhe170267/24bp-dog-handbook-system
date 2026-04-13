package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.NutritionServiceImpl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NutritionServiceImplTest {

    @Mock private NutritionStandardRepository nutritionStandardRepository;
    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private NutritionServiceImpl nutritionService;

    private DogBreed breed;
    private User user;
    private NutritionStandard entity;

    @BeforeEach
    void setUp() {
        breed = DogBreed.builder()
                .breedId(1)
                .breedName("German Shepherd")
                .build();

        user = User.builder()
                .userId(10)
                .username("admin")
                .passwordHash("hash")
                .fullName("Admin User")
                .role(UserRole.ADMIN)
                .isActive(true)
                .isLocked(false)
                .failedLoginCount(0)
                .build();

        entity = NutritionStandard.builder()
                .standardId(100)
                .rationCode("RC001")
                .rationName("Puppy Standard")
                .dogBreed(breed)
                .createdBy(user)
                .targetAgeMinMonths(0)
                .targetAgeMaxMonths(12)
                .isDeleted(false)
                .build();
        entity.setActivityLevel("MEDIUM");
        entity.setHealthCondition("NORMAL");
        entity.setStatusEnum(ContentStatus.DRAFT);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
    }

    // ========================================================================
    // getAll
    // ========================================================================
    @Nested
    class GetAll {

        @Test
        void happyPath_noSearch_returnsPage() {
            Page<NutritionStandard> page = new PageImpl<>(List.of(entity));
            when(nutritionStandardRepository.findByIsDeletedFalse(any(Pageable.class)))
                    .thenReturn(page);

            PageResponse<NutritionStandardResponse> result = nutritionService.getAll(0, 10, null);

            assertThat(result.getContent()).hasSize(1);
            NutritionStandardResponse dto = (NutritionStandardResponse) result.getContent().get(0);
            assertThat(dto.getRationCode()).isEqualTo("RC001");
            assertThat(dto.getBreedName()).isEqualTo("German Shepherd");
            assertThat(result.getTotalElements()).isEqualTo(1);
        }

        @Test
        void withSearchKeyword_delegatesToSearchQuery() {
            Page<NutritionStandard> page = new PageImpl<>(List.of(entity));
            when(nutritionStandardRepository
                    .findByRationNameContainingIgnoreCaseAndIsDeletedFalse(eq("Puppy"), any(Pageable.class)))
                    .thenReturn(page);

            PageResponse<NutritionStandardResponse> result = nutritionService.getAll(0, 10, "Puppy");

            assertThat(result.getContent()).hasSize(1);
            verify(nutritionStandardRepository, never()).findByIsDeletedFalse(any());
        }

        @Test
        void emptySearch_usesNoSearchQuery() {
            Page<NutritionStandard> page = new PageImpl<>(Collections.emptyList());
            when(nutritionStandardRepository.findByIsDeletedFalse(any(Pageable.class)))
                    .thenReturn(page);

            PageResponse<NutritionStandardResponse> result = nutritionService.getAll(0, 5, "   ");

            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isZero();
        }

        @Test
        void negativePage_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.getAll(-1, 10, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("page");
        }

        @Test
        void zeroSize_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.getAll(0, 0, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("size");
        }

        @Test
        void entityWithNullBreed_returnsAllLabel() {
            NutritionStandard noBreedEntity = NutritionStandard.builder()
                    .standardId(101)
                    .rationCode("RC002")
                    .rationName("Universal")
                    .dogBreed(null)
                    .createdBy(user)
                    .isDeleted(false)
                    .build();
            noBreedEntity.setStatusEnum(ContentStatus.DRAFT);
            noBreedEntity.setCreatedAt(LocalDateTime.now());
            noBreedEntity.setUpdatedAt(LocalDateTime.now());

            Page<NutritionStandard> page = new PageImpl<>(List.of(noBreedEntity));
            when(nutritionStandardRepository.findByIsDeletedFalse(any(Pageable.class)))
                    .thenReturn(page);

            PageResponse<NutritionStandardResponse> result = nutritionService.getAll(0, 10, null);

            NutritionStandardResponse dto = (NutritionStandardResponse) result.getContent().get(0);
            assertThat(dto.getBreedId()).isNull();
            assertThat(dto.getBreedName()).isEqualTo("Tất cả giống");
        }
    }

    // ========================================================================
    // getById
    // ========================================================================
    @Nested
    class GetById {

        @Test
        void happyPath_returnsResponse() {
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));

            NutritionStandardResponse result = nutritionService.getById(100);

            assertThat(result.getStandardId()).isEqualTo(100);
            assertThat(result.getRationCode()).isEqualTo("RC001");
            assertThat(result.getCreatedByName()).isEqualTo("Admin User");
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            when(nutritionStandardRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> nutritionService.getById(999))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }

        @Test
        void deletedEntity_throwsResourceNotFoundException() {
            entity.setIsDeleted(true);
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> nutritionService.getById(100))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        void nullId_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.getById(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("id");
        }

        @Test
        void zeroId_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.getById(0))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("id");
        }

        @Test
        void negativeId_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.getById(-5))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ========================================================================
    // getByBreedId
    // ========================================================================
    @Nested
    class GetByBreedId {

        @Test
        void happyPath_returnsList() {
            when(nutritionStandardRepository.findByBreedBreedIdAndIsDeletedFalse(1))
                    .thenReturn(List.of(entity));

            List<NutritionStandardResponse> result = nutritionService.getByBreedId(1);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getRationCode()).isEqualTo("RC001");
        }

        @Test
        void noResults_returnsEmptyList() {
            when(nutritionStandardRepository.findByBreedBreedIdAndIsDeletedFalse(999))
                    .thenReturn(Collections.emptyList());

            List<NutritionStandardResponse> result = nutritionService.getByBreedId(999);

            assertThat(result).isEmpty();
        }

        @Test
        void nullBreedId_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.getByBreedId(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("breedId");
        }

        @Test
        void zeroBreedId_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.getByBreedId(0))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void negativeBreedId_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.getByBreedId(-1))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ========================================================================
    // create
    // ========================================================================
    @Nested
    class Create {

        private NutritionStandardRequest request;

        @BeforeEach
        void setUpRequest() {
            request = new NutritionStandardRequest();
            request.setRationCode("RC_NEW");
            request.setRationName("New Ration");
            request.setBreedId(1);
            request.setActivityLevel("MEDIUM");
            request.setHealthCondition("NORMAL");
            request.setTargetAgeMinMonths(0);
            request.setTargetAgeMaxMonths(12);
        }

        @Test
        void happyPath_createsAndReturnsResponse() {
            when(nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse("RC_NEW")).thenReturn(false);
            when(userRepository.findById(10)).thenReturn(Optional.of(user));
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.save(any(NutritionStandard.class))).thenAnswer(inv -> {
                NutritionStandard saved = inv.getArgument(0);
                saved.setStandardId(200);
                saved.setCreatedAt(LocalDateTime.now());
                saved.setUpdatedAt(LocalDateTime.now());
                return saved;
            });

            NutritionStandardResponse result = nutritionService.create(request, 10);

            assertThat(result.getStandardId()).isEqualTo(200);
            assertThat(result.getRationCode()).isEqualTo("RC_NEW");
            assertThat(result.getBreedName()).isEqualTo("German Shepherd");
            verify(nutritionStandardRepository).save(any(NutritionStandard.class));
        }

        @Test
        void duplicateCode_throwsConflictException() {
            when(nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse("RC_NEW")).thenReturn(true);

            assertThatThrownBy(() -> nutritionService.create(request, 10))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("RC_NEW");
        }

        @Test
        void userNotFound_throwsResourceNotFoundException() {
            when(nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse("RC_NEW")).thenReturn(false);
            when(userRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> nutritionService.create(request, 999))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("User");
        }

        @Test
        void breedNotFound_throwsResourceNotFoundException() {
            request.setBreedId(999);
            when(nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse("RC_NEW")).thenReturn(false);
            when(userRepository.findById(10)).thenReturn(Optional.of(user));
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> nutritionService.create(request, 10))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("breed");
        }

        @Test
        void nullBreedId_createsWithoutBreed() {
            request.setBreedId(null);
            when(nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse("RC_NEW")).thenReturn(false);
            when(userRepository.findById(10)).thenReturn(Optional.of(user));
            when(nutritionStandardRepository.save(any(NutritionStandard.class))).thenAnswer(inv -> {
                NutritionStandard saved = inv.getArgument(0);
                saved.setStandardId(201);
                saved.setCreatedAt(LocalDateTime.now());
                saved.setUpdatedAt(LocalDateTime.now());
                return saved;
            });

            NutritionStandardResponse result = nutritionService.create(request, 10);

            assertThat(result.getBreedId()).isNull();
            assertThat(result.getBreedName()).isEqualTo("Tất cả giống");
        }

        @Test
        void blankRationCode_throwsIllegalArgument() {
            request.setRationCode("   ");

            assertThatThrownBy(() -> nutritionService.create(request, 10))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("rationCode");
        }

        @Test
        void nullUserId_throwsIllegalArgument() {
            when(nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse("RC_NEW")).thenReturn(false);

            assertThatThrownBy(() -> nutritionService.create(request, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("createdByUserId");
        }
    }

    // ========================================================================
    // update
    // ========================================================================
    @Nested
    class Update {

        private NutritionStandardRequest request;

        @BeforeEach
        void setUpRequest() {
            request = new NutritionStandardRequest();
            request.setRationCode("RC001");
            request.setRationName("Updated Name");
            request.setBreedId(1);
            request.setActivityLevel("HIGH");
            request.setHealthCondition("NORMAL");
        }

        @Test
        void happyPath_updatesAndReturns() {
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.save(any(NutritionStandard.class))).thenAnswer(inv -> {
                NutritionStandard saved = inv.getArgument(0);
                saved.setUpdatedAt(LocalDateTime.now());
                return saved;
            });

            NutritionStandardResponse result = nutritionService.update(100, request);

            assertThat(result.getRationName()).isEqualTo("Updated Name");
            assertThat(result.getActivityLevel()).isEqualTo("HIGH");
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            when(nutritionStandardRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> nutritionService.update(999, request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        void publishedStatus_throwsBadRequest() {
            entity.setStatusEnum(ContentStatus.PUBLISHED);
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> nutritionService.update(100, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("xuất bản");
        }

        @Test
        void duplicateCodeOnDifferentEntity_throwsConflictException() {
            request.setRationCode("RC_OTHER");
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));
            when(nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse("RC_OTHER")).thenReturn(true);

            assertThatThrownBy(() -> nutritionService.update(100, request))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("RC_OTHER");
        }

        @Test
        void sameCodeUnchanged_noConflict() {
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.save(any(NutritionStandard.class))).thenReturn(entity);

            NutritionStandardResponse result = nutritionService.update(100, request);

            assertThat(result).isNotNull();
            verify(nutritionStandardRepository, never()).existsByRationCodeAndIsDeletedFalse(anyString());
        }

        @Test
        void rejectedStatus_resetsBackToDraft() {
            entity.setStatusEnum(ContentStatus.REJECTED);
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.save(any(NutritionStandard.class))).thenAnswer(inv -> inv.getArgument(0));

            nutritionService.update(100, request);

            assertThat(entity.getStatusEnum()).isEqualTo(ContentStatus.DRAFT);
        }
    }

    // ========================================================================
    // delete
    // ========================================================================
    @Nested
    class Delete {

        @Test
        void happyPath_softDeletes() {
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));
            when(nutritionStandardRepository.save(any(NutritionStandard.class))).thenReturn(entity);

            nutritionService.delete(100);

            assertThat(entity.getIsDeleted()).isTrue();
            assertThat(entity.getDeletedAt()).isNotNull();
            verify(nutritionStandardRepository).save(entity);
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            when(nutritionStandardRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> nutritionService.delete(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        void publishedStatus_throwsBadRequest() {
            entity.setStatusEnum(ContentStatus.PUBLISHED);
            when(nutritionStandardRepository.findById(100)).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> nutritionService.delete(100))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("xuất bản");
        }

        @Test
        void nullId_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.delete(null))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void zeroId_throwsIllegalArgument() {
            assertThatThrownBy(() -> nutritionService.delete(0))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
