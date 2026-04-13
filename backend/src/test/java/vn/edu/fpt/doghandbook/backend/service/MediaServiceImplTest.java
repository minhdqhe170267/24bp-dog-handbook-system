package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.MediaUpdateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.MediaResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.Media;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;
import vn.edu.fpt.doghandbook.backend.entity.enums.MediaType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DevelopmentStageRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.MediaRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.MediaServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaServiceImplTest {

    @Mock private MediaRepository mediaRepository;
    @Mock private ContentRepository contentRepository;
    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private NutritionStandardRepository nutritionStandardRepository;
    @Mock private TrainingExerciseRepository trainingExerciseRepository;
    @Mock private TrainingRoadmapRepository trainingRoadmapRepository;
    @Mock private TrainingMethodRepository trainingMethodRepository;
    @Mock private DevelopmentStageRepository developmentStageRepository;
    @Mock private DiseaseRepository diseaseRepository;
    @Mock private MedicationRepository medicationRepository;
    @Mock private FirstAidGuideRepository firstAidGuideRepository;
    @Mock private UserRepository userRepository;
    @Mock private CloudinaryService cloudinaryService;

    @InjectMocks
    private MediaServiceImpl mediaService;

    @Test
    void upload_supportsDogProfileEntityType() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "dog.jpg",
                "image/jpeg",
                "sample-image".getBytes()
        );

        DogProfile dogProfile = DogProfile.builder()
                .dogId(2)
                .dogCode("DK002")
                .dogName("Max")
                .isDeleted(false)
                .build();

        User uploader = uploader();

        AtomicReference<Media> savedMediaRef = new AtomicReference<>();

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(2)).thenReturn(Optional.of(dogProfile));
        when(userRepository.findById(1)).thenReturn(Optional.of(uploader));
        when(cloudinaryService.upload(any(), eq("image")))
                .thenReturn(new CloudinaryService.UploadResult(
                        "https://res.cloudinary.com/test/image/upload/v1/dog-handbook/media/uuid.jpg",
                        "dog-handbook/media/uuid"
                ));
        when(mediaRepository.save(any(Media.class))).thenAnswer(invocation -> {
            Media media = invocation.getArgument(0);
            media.setMediaId(99);
            savedMediaRef.set(media);
            return media;
        });
        when(mediaRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(
                ApprovableEntityType.DOG_PROFILE, 2))
                .thenAnswer(invocation -> {
                    Media savedMedia = savedMediaRef.get();
                    return savedMedia == null ? List.of() : List.of(savedMedia);
                });
        when(mediaRepository.findByMediaIdAndIsDeletedFalse(99))
                .thenAnswer(invocation -> Optional.ofNullable(savedMediaRef.get()));

        MediaResponse response = mediaService.upload(file, "DOG_PROFILE", 2, 1, "Dog profile", null);

        assertThat(response.getMediaId()).isEqualTo(99);
        assertThat(response.getEntityType()).isEqualTo(ApprovableEntityType.DOG_PROFILE.name());
        assertThat(response.getEntityId()).isEqualTo(2);
        assertThat(response.getMediaType()).isEqualTo(MediaType.IMAGE.name());
        assertThat(response.getUploadedByName()).isEqualTo("Editor");
        assertThat(response.getFileUrl()).startsWith("https://res.cloudinary.com/");
        assertThat(response.getAltText()).isEqualTo("Dog profile");
    }

    @Test
    void upload_emptyFile_throwsBadRequestException() {
        MockMultipartFile file = new MockMultipartFile("file", new byte[0]);

        assertThatThrownBy(() -> mediaService.upload(file, "DOG_PROFILE", 2, 1, null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File is required");
    }

    @Test
    void upload_invalidDisplayOrder_throwsBadRequestException() {
        MockMultipartFile file = new MockMultipartFile("file", "dog.jpg", "image/jpeg", "img".getBytes());

        assertThatThrownBy(() -> mediaService.upload(file, "DOG_PROFILE", 2, 1, null, 0))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("displayOrder");
    }

    @Test
    void upload_invalidEntityType_throwsBadRequestException() {
        MockMultipartFile file = new MockMultipartFile("file", "dog.jpg", "image/jpeg", "img".getBytes());

        assertThatThrownBy(() -> mediaService.upload(file, "UNKNOWN", 2, 1, null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("entityType");
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(mediaRepository.findByMediaIdAndIsDeletedFalse(9)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> mediaService.getById(9))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("9");
    }

    @Test
    void getByEntity_invalidEntityId_throwsBadRequestException() {
        assertThatThrownBy(() -> mediaService.getByEntity("DOG_PROFILE", 0))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("entityId");
    }

    @Test
    void getByEntity_returnsMappedMedia() {
        Media media = sampleMedia(12, 2, 1);
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.DOG_PROFILE, 2))
                .thenReturn(List.of(media));

        List<MediaResponse> response = mediaService.getByEntity("DOG_PROFILE", 2);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getMediaId()).isEqualTo(12);
        assertThat(response.get(0).getUploadedByName()).isEqualTo("Editor");
        assertThat(response.get(0).getDisplayOrder()).isEqualTo(1);
    }

    @Test
    void updateMetadata_updatesAltTextAndDisplayOrder() {
        Media media = sampleMedia(20, 2, 2);
        Media sibling = sampleMedia(21, 2, 1);

        MediaUpdateRequest request = new MediaUpdateRequest();
        request.setAltText("  Updated alt text  ");
        request.setDisplayOrder(1);

        when(mediaRepository.findByMediaIdAndIsDeletedFalse(20)).thenReturn(Optional.of(media));
        when(mediaRepository.save(any(Media.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.DOG_PROFILE, 2))
                .thenReturn(List.of(sibling, media));
        when(mediaRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MediaResponse response = mediaService.updateMetadata(20, request);

        assertThat(response.getAltText()).isEqualTo("Updated alt text");
        assertThat(media.getDisplayOrder()).isEqualTo(1);
        assertThat(sibling.getDisplayOrder()).isEqualTo(2);
        verify(mediaRepository).saveAll(any());
    }

    @Test
    void delete_softDeletesReordersRemainingMediaAndDeletesCloudinaryAsset() {
        Media media = sampleMedia(30, 2, 2);
        Media sibling = sampleMedia(31, 2, 1);
        media.setCloudinaryPublicId("cloudinary/id");
        media.setMediaType(MediaType.IMAGE);

        when(mediaRepository.findByMediaIdAndIsDeletedFalse(30)).thenReturn(Optional.of(media));
        when(mediaRepository.save(any(Media.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.DOG_PROFILE, 2))
                .thenReturn(List.of(sibling));
        when(mediaRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        mediaService.delete(30);

        assertThat(media.getIsDeleted()).isTrue();
        assertThat(media.getDeletedAt()).isNotNull();
        assertThat(sibling.getDisplayOrder()).isEqualTo(1);
        verify(cloudinaryService).delete("cloudinary/id", "image");
    }

    @Test
    void delete_withoutCloudinaryPublicId_skipsAssetDeletion() {
        Media media = sampleMedia(40, 2, 1);
        media.setCloudinaryPublicId(null);

        when(mediaRepository.findByMediaIdAndIsDeletedFalse(40)).thenReturn(Optional.of(media));
        when(mediaRepository.save(any(Media.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.DOG_PROFILE, 2))
                .thenReturn(List.of());

        mediaService.delete(40);

        verify(cloudinaryService, never()).delete(any(), any());
    }

    private User uploader() {
        return User.builder()
                .userId(1)
                .username("editor")
                .fullName("Editor")
                .passwordHash("hash")
                .role(UserRole.CONTENT_EDITOR)
                .build();
    }

    private Media sampleMedia(Integer mediaId, Integer entityId, Integer displayOrder) {
        return Media.builder()
                .mediaId(mediaId)
                .entityType(ApprovableEntityType.DOG_PROFILE)
                .entityId(entityId)
                .filename("dog.jpg")
                .mediaType(MediaType.IMAGE)
                .fileUrl("https://cdn.example/dog.jpg")
                .mimeType("image/jpeg")
                .fileSizeBytes(100L)
                .altText("Original")
                .displayOrder(displayOrder)
                .uploadedBy(uploader())
                .createdAt(LocalDateTime.of(2026, 4, 7, 9, 0))
                .isDeleted(false)
                .build();
    }
}
