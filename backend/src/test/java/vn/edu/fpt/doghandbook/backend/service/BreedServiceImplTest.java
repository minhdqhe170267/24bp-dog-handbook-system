package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.BreedRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedCompareResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DevelopmentStageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DevelopmentStage;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SizeClassification;
import vn.edu.fpt.doghandbook.backend.entity.enums.TrainabilityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DevelopmentStageRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.BreedServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BreedServiceImplTest {

    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private DevelopmentStageRepository developmentStageRepository;
    @Mock private UserRepository userRepository;
    @Mock private CloudinaryService cloudinaryService;

    @InjectMocks
    private BreedServiceImpl breedService;

    private User editor;

    @BeforeEach
    void setUp() {
        editor = User.builder()
                .userId(1)
                .username("editor")
                .fullName("Editor")
                .passwordHash("hash")
                .role(UserRole.CONTENT_EDITOR)
                .build();
    }

    @Test
    void getAll_withoutSearch_returnsMappedPage() {
        DogBreed breed = sampleBreed(1, "Malinois", ContentStatus.DRAFT);

        when(dogBreedRepository.findByIsDeletedFalse(any()))
                .thenReturn(new PageImpl<>(List.of(breed), PageRequest.of(0, 10), 1));

        PageResponse<BreedResponse> response = breedService.getAll(0, 10, null);

        assertThat(response.getTotalElements()).isEqualTo(1);
        BreedResponse item = (BreedResponse) response.getContent().get(0);
        assertThat(item.getBreedName()).isEqualTo("Malinois");
        assertThat(item.getCreatedByName()).isEqualTo("Editor");
        assertThat(item.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void getAll_withSearch_usesSearchRepository() {
        DogBreed breed = sampleBreed(2, "German Shepherd", ContentStatus.PUBLISHED);

        when(dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse("Shepherd", PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(breed), PageRequest.of(0, 10), 1));

        PageResponse<BreedResponse> response = breedService.getAll(0, 10, "Shepherd");

        assertThat(response.getContent()).hasSize(1);
        BreedResponse item = (BreedResponse) response.getContent().get(0);
        assertThat(item.getBreedName()).isEqualTo("German Shepherd");
        assertThat(item.getStatus()).isEqualTo("PUBLISHED");
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(9)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> breedService.getById(9))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("9");
    }

    @Test
    void create_duplicateName_throwsBadRequestException() {
        BreedRequest request = buildRequest("Malinois");
        when(dogBreedRepository.existsByBreedNameAndIsDeletedFalse("Malinois")).thenReturn(true);

        assertThatThrownBy(() -> breedService.create(request, 1, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã tồn tại");
    }

    @Test
    void create_validRequest_uploadsImageAndReturnsDraftResponse() {
        BreedRequest request = buildRequest("Belgian Shepherd");
        MockMultipartFile image = new MockMultipartFile("image", "breed.jpg", "image/jpeg", "img".getBytes());

        when(dogBreedRepository.existsByBreedNameAndIsDeletedFalse("Belgian Shepherd")).thenReturn(false);
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(cloudinaryService.upload(image, "image"))
                .thenReturn(new CloudinaryService.UploadResult("https://cdn.example/breed.jpg", "breed/public-id"));
        when(dogBreedRepository.save(any(DogBreed.class))).thenAnswer(invocation -> {
            DogBreed saved = invocation.getArgument(0);
            saved.setBreedId(10);
            return saved;
        });

        BreedResponse response = breedService.create(request, 1, image);

        assertThat(response.getBreedId()).isEqualTo(10);
        assertThat(response.getBreedName()).isEqualTo("Belgian Shepherd");
        assertThat(response.getImageUrl()).isEqualTo("https://cdn.example/breed.jpg");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
        assertThat(response.getCreatedByName()).isEqualTo("Editor");
    }

    @Test
    void create_invalidSizeClassification_throwsBadRequestException() {
        BreedRequest request = buildRequest("Breed A");
        request.setSizeClassification("HUGE");

        when(dogBreedRepository.existsByBreedNameAndIsDeletedFalse("Breed A")).thenReturn(false);
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));

        assertThatThrownBy(() -> breedService.create(request, 1, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Kích thước không hợp lệ");
    }

    @Test
    void update_publishedBreed_throwsBadRequestException() {
        DogBreed breed = sampleBreed(3, "Published", ContentStatus.PUBLISHED);
        BreedRequest request = buildRequest("Updated");

        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(3)).thenReturn(Optional.of(breed));

        assertThatThrownBy(() -> breedService.update(3, request, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("xuất bản");
    }

    @Test
    void update_duplicateName_throwsBadRequestException() {
        DogBreed breed = sampleBreed(4, "Old name", ContentStatus.DRAFT);
        BreedRequest request = buildRequest("Duplicate");

        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(4)).thenReturn(Optional.of(breed));
        when(dogBreedRepository.existsByBreedNameAndIsDeletedFalse("Duplicate")).thenReturn(true);

        assertThatThrownBy(() -> breedService.update(4, request, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã tồn tại");
    }

    @Test
    void update_rejectedBreed_resetsStatusToDraft() {
        DogBreed breed = sampleBreed(5, "Old name", ContentStatus.REJECTED);
        BreedRequest request = buildRequest("New name");

        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(5)).thenReturn(Optional.of(breed));
        when(dogBreedRepository.existsByBreedNameAndIsDeletedFalse("New name")).thenReturn(false);
        when(dogBreedRepository.save(any(DogBreed.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BreedResponse response = breedService.update(5, request, null);

        assertThat(response.getBreedName()).isEqualTo("New name");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void delete_publishedBreed_throwsBadRequestException() {
        DogBreed breed = sampleBreed(6, "Published", ContentStatus.PUBLISHED);
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(6)).thenReturn(Optional.of(breed));

        assertThatThrownBy(() -> breedService.delete(6))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("xuất bản");
    }

    @Test
    void delete_draftBreed_softDeletesBreed() {
        DogBreed breed = sampleBreed(7, "Draft", ContentStatus.DRAFT);
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(7)).thenReturn(Optional.of(breed));
        when(dogBreedRepository.save(any(DogBreed.class))).thenAnswer(invocation -> invocation.getArgument(0));

        breedService.delete(7);

        assertThat(breed.getIsDeleted()).isTrue();
        assertThat(breed.getDeletedAt()).isNotNull();
        verify(dogBreedRepository).save(breed);
    }

    @Test
    void compare_withLessThanTwoBreeds_throwsBadRequestException() {
        when(dogBreedRepository.findByBreedIdInAndIsDeletedFalse(List.of(1, 2))).thenReturn(List.of(sampleBreed(1, "One", ContentStatus.DRAFT)));

        assertThatThrownBy(() -> breedService.compare(List.of(1, 2)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ít nhất 2");
    }

    @Test
    void compare_returnsSummaryAcrossBreeds() {
        DogBreed heavy = sampleBreed(8, "Heavy", ContentStatus.PUBLISHED);
        heavy.setWeightMaleMaxKg(new BigDecimal("45.00"));
        heavy.setWeightFemaleMinKg(new BigDecimal("24.00"));
        heavy.setTrainabilityLevel(TrainabilityLevel.MEDIUM);
        heavy.setLifespanYears("10-12");

        DogBreed agile = sampleBreed(9, "Agile", ContentStatus.PUBLISHED);
        agile.setWeightMaleMaxKg(new BigDecimal("32.00"));
        agile.setWeightFemaleMinKg(new BigDecimal("18.00"));
        agile.setTrainabilityLevel(TrainabilityLevel.VERY_HIGH);
        agile.setLifespanYears("12-15");

        when(dogBreedRepository.findByBreedIdInAndIsDeletedFalse(List.of(8, 9))).thenReturn(List.of(heavy, agile));

        BreedCompareResponse response = breedService.compare(List.of(8, 9));

        assertThat(response.getBreeds()).hasSize(2);
        assertThat(response.getSummary().getHeaviestBreed()).isEqualTo("Heavy");
        assertThat(response.getSummary().getLightestBreed()).isEqualTo("Agile");
        assertThat(response.getSummary().getMostTrainable()).isEqualTo("Agile");
        assertThat(response.getSummary().getLongestLifespan()).isEqualTo("Agile");
    }

    @Test
    void getDevelopmentStages_withoutBreedId_returnsAllStages() {
        DogBreed breed = DogBreed.builder()
                .breedId(5)
                .breedName("Belgian Shepherd")
                .build();

        DevelopmentStage stage1 = DevelopmentStage.builder()
                .stageId(1)
                .dogBreed(breed)
                .stageName("Puppy")
                .stageOrder(1)
                .ageMinMonths(0)
                .ageMaxMonths(6)
                .build();

        DevelopmentStage stage2 = DevelopmentStage.builder()
                .stageId(2)
                .dogBreed(breed)
                .stageName("Juvenile")
                .stageOrder(2)
                .ageMinMonths(7)
                .ageMaxMonths(18)
                .build();

        when(developmentStageRepository.findByIsDeletedFalseOrderByDogBreedBreedIdAscStageOrderAsc())
                .thenReturn(List.of(stage1, stage2));

        List<DevelopmentStageResponse> response = breedService.getDevelopmentStages(null);

        assertThat(response).hasSize(2);
        assertThat(response)
                .extracting(DevelopmentStageResponse::getStageName)
                .containsExactly("Puppy", "Juvenile");
        assertThat(response)
                .extracting(DevelopmentStageResponse::getBreedId)
                .containsOnly(5);
        verifyNoInteractions(dogBreedRepository);
    }

    @Test
    void getDevelopmentStages_withBreedId_returnsBreedStages() {
        DogBreed breed = sampleBreed(11, "Retriever", ContentStatus.DRAFT);
        DevelopmentStage stage = DevelopmentStage.builder()
                .stageId(3)
                .dogBreed(breed)
                .stageName("Adult")
                .stageOrder(3)
                .ageMinMonths(19)
                .ageMaxMonths(48)
                .build();

        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(11)).thenReturn(Optional.of(breed));
        when(developmentStageRepository.findByDogBreedBreedIdAndIsDeletedFalseOrderByStageOrder(11))
                .thenReturn(List.of(stage));

        List<DevelopmentStageResponse> response = breedService.getDevelopmentStages(11);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getBreedName()).isEqualTo("Retriever");
        assertThat(response.get(0).getStageName()).isEqualTo("Adult");
    }

    @Test
    void getDevelopmentStages_missingBreed_throwsResourceNotFoundException() {
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(12)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> breedService.getDevelopmentStages(12))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("12");
    }

    private BreedRequest buildRequest(String breedName) {
        BreedRequest request = new BreedRequest();
        request.setBreedName(breedName);
        request.setOrigin("Belgium");
        request.setDescription("Working dog");
        request.setSizeClassification("LARGE");
        request.setWeightMaleMinKg(new BigDecimal("28.00"));
        request.setWeightMaleMaxKg(new BigDecimal("35.00"));
        request.setWeightFemaleMinKg(new BigDecimal("22.00"));
        request.setWeightFemaleMaxKg(new BigDecimal("30.00"));
        request.setAvgHeightCm(new BigDecimal("60.00"));
        request.setLifespanYears("12-14");
        request.setTrainabilityLevel("HIGH");
        request.setOperationalCapabilities("Guarding");
        request.setMetadata("{\"coat\":\"short\"}");
        return request;
    }

    private DogBreed sampleBreed(Integer id, String name, ContentStatus status) {
        return DogBreed.builder()
                .breedId(id)
                .breedName(name)
                .origin("Belgium")
                .description("Working dog")
                .sizeClassification(SizeClassification.LARGE)
                .weightMaleMinKg(new BigDecimal("28.00"))
                .weightMaleMaxKg(new BigDecimal("35.00"))
                .weightFemaleMinKg(new BigDecimal("22.00"))
                .weightFemaleMaxKg(new BigDecimal("30.00"))
                .avgHeightCm(new BigDecimal("60.00"))
                .lifespanYears("12-14")
                .trainabilityLevel(TrainabilityLevel.HIGH)
                .operationalCapabilities("Guarding")
                .metadata("{\"coat\":\"short\"}")
                .imageUrl("breed.jpg")
                .status(status)
                .createdBy(editor)
                .createdAt(LocalDateTime.of(2026, 4, 7, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 8, 30))
                .isDeleted(false)
                .build();
    }
}
