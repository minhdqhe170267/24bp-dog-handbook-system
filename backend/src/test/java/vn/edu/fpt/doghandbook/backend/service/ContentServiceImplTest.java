package vn.edu.fpt.doghandbook.backend.service;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.ContentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.UnifiedContentResponse;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.FirstAidGuide;
import vn.edu.fpt.doghandbook.backend.entity.Media;
import vn.edu.fpt.doghandbook.backend.entity.Medication;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingMethod;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentType;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.MediaRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.ContentServiceImpl;
import vn.edu.fpt.doghandbook.backend.util.MediaUrlResolver;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContentServiceImplTest {

    @Mock private ContentRepository contentRepository;
    @Mock private MediaRepository mediaRepository;
    @Mock private UserRepository userRepository;
    @Mock private MediaUrlResolver mediaUrlResolver;
    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private MedicationRepository medicationRepository;
    @Mock private FirstAidGuideRepository firstAidGuideRepository;
    @Mock private DiseaseRepository diseaseRepository;
    @Mock private TrainingExerciseRepository trainingExerciseRepository;
    @Mock private TrainingMethodRepository trainingMethodRepository;
    @Mock private NutritionStandardRepository nutritionStandardRepository;

    @InjectMocks
    private ContentServiceImpl service;

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
    void getAll_withoutFilters_returnsMappedContent() {
        Content content = sampleContent(1, "Feeding Guide", ContentStatus.DRAFT);
        content.setSummary("A summary");
        content.setTags("nutrition");
        Media media = Media.builder()
                .mediaId(50)
                .filename("guide.jpg")
                .entityType(ApprovableEntityType.CONTENT)
                .entityId(1)
                .fileUrl("uploads/guide.jpg")
                .altText("Guide image")
                .displayOrder(1)
                .build();

        when(contentRepository.findByIsDeletedFalse(any()))
                .thenReturn(new PageImpl<>(List.of(content), PageRequest.of(0, 10), 1));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, 1))
                .thenReturn(List.of(media));
        when(mediaUrlResolver.toPublicUrl("uploads/guide.jpg")).thenReturn("https://cdn.example/guide.jpg");

        PageResponse<ContentResponse> response = service.getAll(0, 10, null, null, null);

        assertThat(response.getTotalElements()).isEqualTo(1);
        ContentResponse item = (ContentResponse) response.getContent().get(0);
        assertThat(item.getTitle()).isEqualTo("Feeding Guide");
        assertThat(item.getAuthorName()).isEqualTo("Editor");
        assertThat(item.getMediaFiles()).hasSize(1);
        assertThat(item.getMediaFiles().get(0).getFileUrl()).isEqualTo("https://cdn.example/guide.jpg");
    }

    @Test
    void getAll_invalidStatus_throwsBadRequestException() {
        assertThatThrownBy(() -> service.getAll(0, 10, null, null, "UNKNOWN"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid content status");
    }

    @Test
    void getAll_invalidType_throwsBadRequestException() {
        assertThatThrownBy(() -> service.getAll(0, 10, null, "UNKNOWN", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid content type");
    }

    @Test
    void getAll_withSearchTypeAndStatus_usesCombinedRepository() {
        when(contentRepository.findByTitleContainingIgnoreCaseAndContentTypeAndStatusAndIsDeletedFalse(
                eq("guide"), eq(ContentType.GENERAL_ARTICLE), eq(ContentStatus.DRAFT), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PageResponse<ContentResponse> response = service.getAll(0, 10, " guide ", "general_article", "draft");

        assertThat(response.getContent()).isEmpty();
        verify(contentRepository).findByTitleContainingIgnoreCaseAndContentTypeAndStatusAndIsDeletedFalse(
                "guide", ContentType.GENERAL_ARTICLE, ContentStatus.DRAFT, PageRequest.of(0, 10,
                        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));
    }

    @Test
    void getAll_withSearchAndType_usesMatchingRepository() {
        when(contentRepository.findByTitleContainingIgnoreCaseAndContentTypeAndIsDeletedFalse(
                eq("guide"), eq(ContentType.GENERAL_ARTICLE), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PageResponse<ContentResponse> response = service.getAll(0, 10, "guide", "GENERAL_ARTICLE", null);

        assertThat(response.getContent()).isEmpty();
        verify(contentRepository).findByTitleContainingIgnoreCaseAndContentTypeAndIsDeletedFalse(
                any(), any(), any());
    }

    @Test
    void getAll_withSearchAndStatus_usesMatchingRepository() {
        when(contentRepository.findByTitleContainingIgnoreCaseAndStatusAndIsDeletedFalse(
                eq("guide"), eq(ContentStatus.PENDING), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PageResponse<ContentResponse> response = service.getAll(0, 10, "guide", null, "PENDING");

        assertThat(response.getContent()).isEmpty();
        verify(contentRepository).findByTitleContainingIgnoreCaseAndStatusAndIsDeletedFalse(any(), any(), any());
    }

    @Test
    void getAll_withTypeAndStatus_usesMatchingRepository() {
        when(contentRepository.findByContentTypeAndStatusAndIsDeletedFalse(
                eq(ContentType.GENERAL_ARTICLE), eq(ContentStatus.DRAFT), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PageResponse<ContentResponse> response = service.getAll(0, 10, null, "GENERAL_ARTICLE", "DRAFT");

        assertThat(response.getContent()).isEmpty();
        verify(contentRepository).findByContentTypeAndStatusAndIsDeletedFalse(any(), any(), any());
    }

    @Test
    void getAll_withSearchOnly_usesSearchRepository() {
        when(contentRepository.findByTitleContainingIgnoreCaseAndIsDeletedFalse(eq("guide"), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PageResponse<ContentResponse> response = service.getAll(0, 10, "guide", null, null);

        assertThat(response.getContent()).isEmpty();
        verify(contentRepository).findByTitleContainingIgnoreCaseAndIsDeletedFalse(any(), any());
    }

    @Test
    void getAll_withTypeOnly_usesTypeRepository() {
        when(contentRepository.findByContentTypeAndIsDeletedFalse(eq(ContentType.GENERAL_ARTICLE), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PageResponse<ContentResponse> response = service.getAll(0, 10, null, "GENERAL_ARTICLE", null);

        assertThat(response.getContent()).isEmpty();
        verify(contentRepository).findByContentTypeAndIsDeletedFalse(any(), any());
    }

    @Test
    void getAll_withStatusOnly_usesStatusRepository() {
        when(contentRepository.findByStatusAndIsDeletedFalse(eq(ContentStatus.DRAFT), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PageResponse<ContentResponse> response = service.getAll(0, 10, null, null, "DRAFT");

        assertThat(response.getContent()).isEmpty();
        verify(contentRepository).findByStatusAndIsDeletedFalse(any(), any());
    }

    @Test
    void getById_deletedContent_throwsResourceNotFoundException() {
        Content deleted = sampleContent(3, "Deleted", ContentStatus.DRAFT);
        deleted.setIsDeleted(true);

        when(contentRepository.findById(3)).thenReturn(Optional.of(deleted));

        assertThatThrownBy(() -> service.getById(3))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("3");
    }

    @Test
    void getById_invalidId_throwsBadRequestException() {
        assertThatThrownBy(() -> service.getById(0))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("id must be greater than 0");
    }

    @Test
    void getById_authorEntityNotFound_mapsNullAuthorFields() {
        User proxyUser = mock(User.class);
        when(proxyUser.getUserId()).thenThrow(new EntityNotFoundException("gone"));
        when(proxyUser.getFullName()).thenThrow(new EntityNotFoundException("gone"));

        Content content = sampleContent(9, "Guide", ContentStatus.DRAFT);
        content.setAuthor(proxyUser);
        when(contentRepository.findById(9)).thenReturn(Optional.of(content));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, 9))
                .thenReturn(List.of(Media.builder()
                        .mediaId(91)
                        .filename("guide.jpg")
                        .entityType(ApprovableEntityType.CONTENT)
                        .entityId(9)
                        .build()));
        when(mediaUrlResolver.toPublicUrl(null)).thenReturn(null);

        ContentResponse response = service.getById(9);

        assertThat(response.getAuthorId()).isNull();
        assertThat(response.getAuthorName()).isNull();
        assertThat(response.getMediaFiles()).hasSize(1);
    }

    @Test
    void create_withPendingStatus_savesPendingContent() {
        ContentRequest request = new ContentRequest();
        request.setTitle("Feeding Guide");
        request.setContentType("NUTRITION_GUIDE");
        request.setBody("Body");
        request.setStatus("PENDING");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(contentRepository.existsByTitleIgnoreCaseAndContentTypeAndIsDeletedFalse(
                "Feeding Guide", ContentType.NUTRITION_GUIDE)).thenReturn(false);
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> {
            Content content = invocation.getArgument(0);
            content.setContentId(1);
            content.setCreatedAt(LocalDateTime.now());
            content.setUpdatedAt(LocalDateTime.now());
            return content;
        });
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(any(), any()))
                .thenReturn(List.of());

        ContentResponse response = service.create(request, 1);

        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getPublishedAt()).isNull();
    }

    @Test
    void create_withBlankStatus_defaultsToDraftAndTrimsOptionalFields() {
        ContentRequest request = new ContentRequest();
        request.setTitle("  Feeding Guide  ");
        request.setContentType(" general_article ");
        request.setBody("  Body  ");
        request.setSummary("   ");
        request.setTags(" tag-1 ");
        request.setStatus("   ");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(contentRepository.existsByTitleIgnoreCaseAndContentTypeAndIsDeletedFalse(
                "Feeding Guide", ContentType.GENERAL_ARTICLE)).thenReturn(false);
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> {
            Content content = invocation.getArgument(0);
            content.setContentId(10);
            return content;
        });
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, 10))
                .thenReturn(List.of());

        ContentResponse response = service.create(request, 1);

        assertThat(response.getTitle()).isEqualTo("Feeding Guide");
        assertThat(response.getBody()).isEqualTo("Body");
        assertThat(response.getSummary()).isNull();
        assertThat(response.getTags()).isEqualTo("tag-1");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void create_withDuplicateTitle_throwsConflictException() {
        ContentRequest request = new ContentRequest();
        request.setTitle("Feeding Guide");
        request.setContentType("NUTRITION_GUIDE");
        request.setBody("Body");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(contentRepository.existsByTitleIgnoreCaseAndContentTypeAndIsDeletedFalse(
                "Feeding Guide", ContentType.NUTRITION_GUIDE)).thenReturn(true);

        assertThatThrownBy(() -> service.create(request, 1))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("same title");
    }

    @Test
    void create_withPublishedStatus_throwsBadRequestException() {
        ContentRequest request = new ContentRequest();
        request.setTitle("Guide");
        request.setContentType("GENERAL_ARTICLE");
        request.setBody("Body");
        request.setStatus("PUBLISHED");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));

        assertThatThrownBy(() -> service.create(request, 1))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot be set directly");
    }

    @Test
    void create_withRejectedStatus_throwsBadRequestException() {
        ContentRequest request = new ContentRequest();
        request.setTitle("Guide");
        request.setContentType("GENERAL_ARTICLE");
        request.setBody("Body");
        request.setStatus("REJECTED");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));

        assertThatThrownBy(() -> service.create(request, 1))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot be set directly");
    }

    @Test
    void update_rejectedContent_resetsStatusToDraftAndIncrementsVersion() {
        Content content = sampleContent(4, "Old title", ContentStatus.REJECTED);
        content.setVersion(3);

        ContentRequest request = new ContentRequest();
        request.setTitle("New title");
        request.setContentType("GENERAL_ARTICLE");
        request.setBody("Updated body");
        request.setSummary("Updated summary");

        when(contentRepository.findById(4)).thenReturn(Optional.of(content));
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(contentRepository.existsByTitleIgnoreCaseAndContentTypeAndContentIdNotAndIsDeletedFalse(
                "New title", ContentType.GENERAL_ARTICLE, 4)).thenReturn(false);
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, 4))
                .thenReturn(List.of());

        ContentResponse response = service.update(4, request, 1);

        assertThat(response.getTitle()).isEqualTo("New title");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
        assertThat(response.getVersion()).isEqualTo(4);
    }

    @Test
    void update_withExplicitPendingStatus_setsRequestedStatus() {
        Content content = sampleContent(11, "Guide", ContentStatus.DRAFT);
        content.setVersion(2);
        ContentRequest request = new ContentRequest();
        request.setTitle("Guide");
        request.setContentType("GENERAL_ARTICLE");
        request.setBody("Updated body");
        request.setStatus("PENDING");
        request.setTags(" ");

        when(contentRepository.findById(11)).thenReturn(Optional.of(content));
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(contentRepository.existsByTitleIgnoreCaseAndContentTypeAndContentIdNotAndIsDeletedFalse(
                "Guide", ContentType.GENERAL_ARTICLE, 11)).thenReturn(false);
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, 11))
                .thenReturn(List.of());

        ContentResponse response = service.update(11, request, 1);

        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getVersion()).isEqualTo(3);
        assertThat(response.getTags()).isNull();
    }

    @Test
    void update_publishedContent_throwsBadRequestException() {
        Content published = sampleContent(5, "Published", ContentStatus.PUBLISHED);
        ContentRequest request = new ContentRequest();
        request.setTitle("New");
        request.setContentType("GENERAL_ARTICLE");
        request.setBody("Body");

        when(contentRepository.findById(5)).thenReturn(Optional.of(published));
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));

        assertThatThrownBy(() -> service.update(5, request, 1))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("unpublished before update");
    }

    @Test
    void update_withDuplicateTitle_throwsConflictException() {
        Content content = sampleContent(12, "Guide", ContentStatus.DRAFT);
        ContentRequest request = new ContentRequest();
        request.setTitle("New Guide");
        request.setContentType("GENERAL_ARTICLE");
        request.setBody("Body");

        when(contentRepository.findById(12)).thenReturn(Optional.of(content));
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(contentRepository.existsByTitleIgnoreCaseAndContentTypeAndContentIdNotAndIsDeletedFalse(
                "New Guide", ContentType.GENERAL_ARTICLE, 12)).thenReturn(true);

        assertThatThrownBy(() -> service.update(12, request, 1))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("same title");
    }

    @Test
    void delete_publishedContent_throwsBadRequestException() {
        Content publishedContent = sampleContent(5, "Published", ContentStatus.PUBLISHED);

        when(contentRepository.findById(5)).thenReturn(Optional.of(publishedContent));

        assertThatThrownBy(() -> service.delete(5))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("unpublished before delete");

        verify(contentRepository).findById(5);
    }

    @Test
    void delete_draftContent_softDeletesContentAndMedia() {
        Content draft = sampleContent(6, "Draft", ContentStatus.DRAFT);
        Media media = Media.builder()
                .mediaId(60)
                .entityType(ApprovableEntityType.CONTENT)
                .entityId(6)
                .filename("draft.jpg")
                .build();

        when(contentRepository.findById(6)).thenReturn(Optional.of(draft));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, 6))
                .thenReturn(List.of(media));
        when(mediaRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(6);

        assertThat(draft.getIsDeleted()).isTrue();
        assertThat(draft.getDeletedAt()).isNotNull();
        assertThat(media.getIsDeleted()).isTrue();
        assertThat(media.getDeletedAt()).isNotNull();
        verify(mediaRepository).saveAll(any());
        verify(contentRepository).save(draft);
    }

    @Test
    void delete_withoutMedia_softDeletesContentOnly() {
        Content draft = sampleContent(13, "Draft", ContentStatus.DRAFT);

        when(contentRepository.findById(13)).thenReturn(Optional.of(draft));
        when(mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, 13))
                .thenReturn(List.of());
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(13);

        assertThat(draft.getIsDeleted()).isTrue();
        assertThat(draft.getDeletedAt()).isNotNull();
        verify(mediaRepository, never()).saveAll(any());
        verify(contentRepository).save(draft);
    }

    @Test
    void getAllUnified_filtersByEntityTypeAndStatus() {
        DogBreed breed = DogBreed.builder()
                .breedId(2)
                .breedName("Malinois")
                .description("Working breed")
                .status(ContentStatus.PUBLISHED)
                .createdBy(editor)
                .createdAt(LocalDateTime.of(2026, 4, 7, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 8, 30))
                .build();
        when(dogBreedRepository.findAll()).thenReturn(List.of(breed));

        PageResponse<UnifiedContentResponse> response = service.getAllUnified(0, 10, "Mali", "DOG_BREED", "PUBLISHED");

        assertThat(response.getTotalElements()).isEqualTo(1);
        UnifiedContentResponse item = (UnifiedContentResponse) response.getContent().get(0);
        assertThat(item.getEntityType()).isEqualTo("DOG_BREED");
        assertThat(item.getTitle()).isEqualTo("Malinois");
        assertThat(item.getStatus()).isEqualTo("PUBLISHED");
        assertThat(item.getAuthorName()).isEqualTo("Editor");
    }

    @Test
    void getAllUnified_invalidSize_throwsBadRequestException() {
        assertThatThrownBy(() -> service.getAllUnified(0, 0, null, null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("size");
    }

    @Test
    void getAllUnified_createdByEntityNotFound_mapsNullAuthorName() {
        User proxyUser = mock(User.class);
        when(proxyUser.getFullName()).thenThrow(new EntityNotFoundException("gone"));

        DogBreed breed = DogBreed.builder()
                .breedId(14)
                .breedName("Malinois")
                .description("Working breed")
                .status(ContentStatus.PUBLISHED)
                .createdBy(proxyUser)
                .createdAt(LocalDateTime.of(2026, 4, 7, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 8, 30))
                .build();
        when(dogBreedRepository.findAll()).thenReturn(List.of(breed));

        PageResponse<UnifiedContentResponse> response = service.getAllUnified(0, 10, null, "DOG_BREED", "PUBLISHED");

        UnifiedContentResponse item = (UnifiedContentResponse) response.getContent().get(0);
        assertThat(item.getAuthorName()).isNull();
    }

    @Test
    void getAllUnified_withoutEntityFilter_includesAllSupportedEntitiesWithStatuses() {
        Content content = sampleContent(20, "Guide", ContentStatus.PUBLISHED);
        Medication medication = Medication.builder()
                .medicationId(21)
                .medicationName("Med A")
                .description("Desc")
                .status(ContentStatus.DRAFT)
                .createdBy(editor)
                .createdAt(LocalDateTime.of(2026, 4, 7, 9, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 9, 30))
                .build();
        FirstAidGuide guide = FirstAidGuide.builder()
                .guideId(22)
                .guideTitle("Aid A")
                .description("Guide desc")
                .status(ContentStatus.PUBLISHED)
                .createdBy(editor)
                .createdAt(LocalDateTime.of(2026, 4, 7, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 10, 30))
                .build();
        Disease disease = Disease.builder()
                .diseaseId(23)
                .diseaseName("Disease A")
                .description("Disease desc")
                .status(ContentStatus.PENDING)
                .createdBy(editor)
                .createdAt(LocalDateTime.of(2026, 4, 7, 11, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 11, 30))
                .build();
        TrainingExercise exercise = TrainingExercise.builder()
                .exerciseId(24)
                .exerciseName("Exercise A")
                .description("Exercise desc")
                .status(ContentStatus.DRAFT)
                .createdBy(editor)
                .createdAt(LocalDateTime.of(2026, 4, 7, 12, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 12, 30))
                .build();
        TrainingMethod method = TrainingMethod.builder()
                .methodId(25)
                .methodName("Method A")
                .description("Method desc")
                .status(ContentStatus.PUBLISHED)
                .createdBy(editor)
                .createdAt(LocalDateTime.of(2026, 4, 7, 13, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 13, 30))
                .build();

        when(contentRepository.findByIsDeletedFalse(PageRequest.of(0, Integer.MAX_VALUE)))
                .thenReturn(new PageImpl<>(List.of(content)));
        when(dogBreedRepository.findAll()).thenReturn(List.of());
        when(medicationRepository.findAll()).thenReturn(List.of(medication));
        when(firstAidGuideRepository.findAll()).thenReturn(List.of(guide));
        when(diseaseRepository.findAll()).thenReturn(List.of(disease));
        when(trainingExerciseRepository.findAll()).thenReturn(List.of(exercise));
        when(trainingMethodRepository.findAll()).thenReturn(List.of(method));
        when(nutritionStandardRepository.findAll()).thenReturn(List.of());

        PageResponse<UnifiedContentResponse> response = service.getAllUnified(0, 10, null, null, null);

        assertThat(response.getTotalElements()).isEqualTo(6);
        assertThat(response.getContent())
                .extracting(item -> ((UnifiedContentResponse) item).getEntityType())
                .containsExactlyInAnyOrder("CONTENT", "MEDICATION", "FIRST_AID_GUIDE", "DISEASE", "TRAINING_EXERCISE", "TRAINING_METHOD");
    }

    @Test
    void getAllUnified_withoutEntityFilter_handlesNullStatuses() {
        Content content = sampleContent(30, "Guide", null);
        Medication medication = Medication.builder()
                .medicationId(31)
                .medicationName("Med A")
                .description("Desc")
                .status(null)
                .createdAt(LocalDateTime.of(2026, 4, 7, 9, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 9, 30))
                .build();
        FirstAidGuide guide = FirstAidGuide.builder()
                .guideId(32)
                .guideTitle("Aid A")
                .description("Guide desc")
                .status(null)
                .createdAt(LocalDateTime.of(2026, 4, 7, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 10, 30))
                .build();
        Disease disease = Disease.builder()
                .diseaseId(33)
                .diseaseName("Disease A")
                .description("Disease desc")
                .status(null)
                .createdAt(LocalDateTime.of(2026, 4, 7, 11, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 11, 30))
                .build();
        TrainingExercise exercise = TrainingExercise.builder()
                .exerciseId(34)
                .exerciseName("Exercise A")
                .description("Exercise desc")
                .status(null)
                .createdAt(LocalDateTime.of(2026, 4, 7, 12, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 12, 30))
                .build();
        TrainingMethod method = TrainingMethod.builder()
                .methodId(35)
                .methodName("Method A")
                .description("Method desc")
                .status(null)
                .createdAt(LocalDateTime.of(2026, 4, 7, 13, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 13, 30))
                .build();

        when(contentRepository.findByIsDeletedFalse(PageRequest.of(0, Integer.MAX_VALUE)))
                .thenReturn(new PageImpl<>(List.of(content)));
        when(dogBreedRepository.findAll()).thenReturn(List.of());
        when(medicationRepository.findAll()).thenReturn(List.of(medication));
        when(firstAidGuideRepository.findAll()).thenReturn(List.of(guide));
        when(diseaseRepository.findAll()).thenReturn(List.of(disease));
        when(trainingExerciseRepository.findAll()).thenReturn(List.of(exercise));
        when(trainingMethodRepository.findAll()).thenReturn(List.of(method));
        when(nutritionStandardRepository.findAll()).thenReturn(List.of());

        PageResponse<UnifiedContentResponse> response = service.getAllUnified(0, 10, null, null, null);

        assertThat(response.getTotalElements()).isEqualTo(6);
        assertThat(response.getContent())
                .allSatisfy(item -> assertThat(((UnifiedContentResponse) item).getStatus()).isNull());
    }

    @Test
    void getAllUnified_invalidPage_throwsBadRequestException() {
        assertThatThrownBy(() -> service.getAllUnified(-1, 10, null, null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("page");
    }

    private Content sampleContent(Integer id, String title, ContentStatus status) {
        return Content.builder()
                .contentId(id)
                .title(title)
                .contentType(ContentType.GENERAL_ARTICLE)
                .body("Body")
                .status(status)
                .author(editor)
                .version(1)
                .isDeleted(false)
                .createdAt(LocalDateTime.of(2026, 4, 7, 7, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 7, 7, 30))
                .build();
    }
}
