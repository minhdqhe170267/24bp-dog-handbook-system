package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import tools.jackson.databind.ObjectMapper;
import vn.edu.fpt.doghandbook.backend.dto.request.ContentSuggestionRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentSuggestionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.ContentSuggestion;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.repository.ContentSuggestionRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncConflictLogRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.ContentSuggestionServiceImpl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContentSuggestionServiceImplTest {

    @Mock private ContentSuggestionRepository contentSuggestionRepository;
    @Mock private UserRepository userRepository;
    @Mock private TrainingExerciseRepository trainingExerciseRepository;
    @Mock private NotificationService notificationService;
    @Mock private SyncConflictLogRepository syncConflictLogRepository;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private ContentSuggestionServiceImpl service;

    private User trainer;
    private User reviewerUser;
    private ContentSuggestion suggestion;
    private TrainingExercise exercise;

    @BeforeEach
    void setUp() {
        trainer = User.builder().userId(1).username("trainer01").fullName("Trainer One")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
        reviewerUser = User.builder().userId(2).username("editor01").fullName("Editor One")
                .role(UserRole.CONTENT_EDITOR).isActive(true).isDeleted(false).build();
        exercise = TrainingExercise.builder().exerciseId(10).exerciseName("Sit Command")
                .isDeleted(false).build();

        suggestion = ContentSuggestion.builder()
                .suggestionId(100)
                .trainer(trainer)
                .suggestionType(SuggestionType.NEW_CONTENT)
                .relatedExercise(exercise)
                .title("New exercise suggestion")
                .description("Please add a new exercise")
                .status(SuggestionStatus.SUBMITTED)
                .submittedAt(LocalDateTime.of(2025, 1, 1, 10, 0))
                .build();
    }

    // ──────────────────── getAll ────────────────────

    @Test
    void getAll_noStatus_returnsPage() {
        Page<ContentSuggestion> page = new PageImpl<>(List.of(suggestion));
        when(contentSuggestionRepository.findByOrderBySubmittedAtDesc(any(Pageable.class)))
                .thenReturn(page);

        PageResponse<ContentSuggestionResponse> result = service.getAll(0, 10, null);

        assertThat(result.getTotalElements()).isEqualTo(1);
        ContentSuggestionResponse resp = (ContentSuggestionResponse) result.getContent().get(0);
        assertThat(resp.getTitle()).isEqualTo("New exercise suggestion");
    }

    @Test
    void getAll_withStatus_filtersResults() {
        Page<ContentSuggestion> page = new PageImpl<>(List.of(suggestion));
        when(contentSuggestionRepository.findByStatusOrderBySubmittedAtDesc(
                eq(SuggestionStatus.SUBMITTED), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<ContentSuggestionResponse> result = service.getAll(0, 10, "SUBMITTED");

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getAll_blankStatus_treatedAsNoFilter() {
        when(contentSuggestionRepository.findByOrderBySubmittedAtDesc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<ContentSuggestionResponse> result = service.getAll(0, 10, "   ");

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getAll_invalidStatus_throwsBadRequest() {
        assertThatThrownBy(() -> service.getAll(0, 10, "INVALID_STATUS"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getAll_negativePage_throwsBadRequest() {
        assertThatThrownBy(() -> service.getAll(-1, 10, null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getAll_zeroSize_throwsBadRequest() {
        assertThatThrownBy(() -> service.getAll(0, 0, null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getAll_mapsResponseFields() {
        Page<ContentSuggestion> page = new PageImpl<>(List.of(suggestion));
        when(contentSuggestionRepository.findByOrderBySubmittedAtDesc(any(Pageable.class)))
                .thenReturn(page);

        PageResponse<ContentSuggestionResponse> result = service.getAll(0, 10, null);
        ContentSuggestionResponse resp = (ContentSuggestionResponse) result.getContent().get(0);

        assertThat(resp.getSuggestionId()).isEqualTo(100);
        assertThat(resp.getTrainerId()).isEqualTo(1);
        assertThat(resp.getTrainerName()).isEqualTo("Trainer One");
        assertThat(resp.getSuggestionType()).isEqualTo("NEW_CONTENT");
        assertThat(resp.getRelatedExerciseId()).isEqualTo(10);
        assertThat(resp.getRelatedExerciseName()).isEqualTo("Sit Command");
        assertThat(resp.getStatus()).isEqualTo("SUBMITTED");
    }

    // ──────────────────── getById ────────────────────

    @Test
    void getById_found_returnsResponse() {
        when(contentSuggestionRepository.findById(100)).thenReturn(Optional.of(suggestion));

        ContentSuggestionResponse result = service.getById(100);

        assertThat(result.getSuggestionId()).isEqualTo(100);
        assertThat(result.getTitle()).isEqualTo("New exercise suggestion");
    }

    @Test
    void getById_notFound_throwsResourceNotFound() {
        when(contentSuggestionRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(999))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getById_nullId_throwsBadRequest() {
        assertThatThrownBy(() -> service.getById(null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getById_zeroId_throwsBadRequest() {
        assertThatThrownBy(() -> service.getById(0))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getById_mapsAllFields() {
        when(contentSuggestionRepository.findById(100)).thenReturn(Optional.of(suggestion));

        ContentSuggestionResponse result = service.getById(100);

        assertThat(result.getDescription()).isEqualTo("Please add a new exercise");
        assertThat(result.getSubmittedAt()).isEqualTo(LocalDateTime.of(2025, 1, 1, 10, 0));
    }

    // ──────────────────── submit ────────────────────

    @Test
    void submit_success_createsSuggestion() {
        ContentSuggestionRequest req = new ContentSuggestionRequest();
        req.setSuggestionType("NEW_CONTENT");
        req.setTitle("New title");
        req.setDescription("New description");

        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(contentSuggestionRepository.save(any(ContentSuggestion.class))).thenAnswer(inv -> {
            ContentSuggestion s = inv.getArgument(0);
            s.setSuggestionId(200);
            return s;
        });

        ContentSuggestionResponse result = service.submit(req, 1);

        assertThat(result.getTitle()).isEqualTo("New title");
        assertThat(result.getStatus()).isEqualTo("SUBMITTED");
        verify(contentSuggestionRepository).save(any(ContentSuggestion.class));
    }

    @Test
    void submit_withLocalIdExisting_returnsExisting() {
        ContentSuggestionRequest req = new ContentSuggestionRequest();
        req.setLocalId("local-123");
        req.setSuggestionType("NEW_CONTENT");
        req.setTitle("Title");
        req.setDescription("Desc");

        when(contentSuggestionRepository.findByLocalId("local-123")).thenReturn(Optional.of(suggestion));

        ContentSuggestionResponse result = service.submit(req, 1);

        assertThat(result.getSuggestionId()).isEqualTo(100);
        verify(contentSuggestionRepository, never()).save(any());
    }

    @Test
    void submit_trainerNotFound_throwsResourceNotFound() {
        ContentSuggestionRequest req = new ContentSuggestionRequest();
        req.setSuggestionType("NEW_CONTENT");
        req.setTitle("Title");
        req.setDescription("Desc");

        when(userRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(req, 999))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void submit_blankTitle_throwsBadRequest() {
        ContentSuggestionRequest req = new ContentSuggestionRequest();
        req.setSuggestionType("NEW_CONTENT");
        req.setTitle("   ");
        req.setDescription("Desc");

        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));

        assertThatThrownBy(() -> service.submit(req, 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void submit_invalidSuggestionType_throwsBadRequest() {
        ContentSuggestionRequest req = new ContentSuggestionRequest();
        req.setSuggestionType("INVALID_TYPE");
        req.setTitle("Title");
        req.setDescription("Desc");

        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));

        assertThatThrownBy(() -> service.submit(req, 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void submit_withRelatedExercise_setsExercise() {
        ContentSuggestionRequest req = new ContentSuggestionRequest();
        req.setSuggestionType("UPDATE_EXISTING");
        req.setRelatedExerciseId(10);
        req.setTitle("Update exercise");
        req.setDescription("Update desc");

        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(trainingExerciseRepository.findById(10)).thenReturn(Optional.of(exercise));
        when(contentSuggestionRepository.save(any(ContentSuggestion.class))).thenAnswer(inv -> {
            ContentSuggestion s = inv.getArgument(0);
            s.setSuggestionId(201);
            return s;
        });

        ContentSuggestionResponse result = service.submit(req, 1);

        assertThat(result.getRelatedExerciseId()).isEqualTo(10);
    }

    @Test
    void submit_notifiesContentEditors() {
        ContentSuggestionRequest req = new ContentSuggestionRequest();
        req.setSuggestionType("NEW_CONTENT");
        req.setTitle("Title");
        req.setDescription("Desc");

        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(contentSuggestionRepository.save(any(ContentSuggestion.class))).thenAnswer(inv -> {
            ContentSuggestion s = inv.getArgument(0);
            s.setSuggestionId(202);
            return s;
        });

        service.submit(req, 1);

        verify(notificationService).notifyRole(eq(UserRole.CONTENT_EDITOR), eq(trainer), any(), anyString(), anyString(), anyString(), anyInt());
    }

    // ──────────────────── respond ────────────────────

    @Test
    void respond_accepted_updatesStatus() {
        when(contentSuggestionRepository.findById(100)).thenReturn(Optional.of(suggestion));
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewerUser));
        when(contentSuggestionRepository.save(any(ContentSuggestion.class))).thenAnswer(inv -> inv.getArgument(0));

        ContentSuggestionResponse result = service.respond(100, "Good suggestion", "ACCEPTED", 2, null);

        assertThat(result.getStatus()).isEqualTo("ACCEPTED");
        assertThat(result.getAdminResponse()).isEqualTo("Good suggestion");
    }

    @Test
    void respond_rejected_updatesStatus() {
        when(contentSuggestionRepository.findById(100)).thenReturn(Optional.of(suggestion));
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewerUser));
        when(contentSuggestionRepository.save(any(ContentSuggestion.class))).thenAnswer(inv -> inv.getArgument(0));

        ContentSuggestionResponse result = service.respond(100, "Not applicable", "REJECTED", 2, null);

        assertThat(result.getStatus()).isEqualTo("REJECTED");
    }

    @Test
    void respond_invalidStatus_throwsBadRequest() {
        when(contentSuggestionRepository.findById(100)).thenReturn(Optional.of(suggestion));

        assertThatThrownBy(() -> service.respond(100, "Response", "SUBMITTED", 2, null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void respond_notFound_throwsResourceNotFound() {
        when(contentSuggestionRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.respond(999, "Response", "ACCEPTED", 2, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void respond_syncConflict_throwsSyncConflictException() throws Exception {
        suggestion.setUpdatedAt(LocalDateTime.of(2025, 1, 1, 12, 0));
        when(contentSuggestionRepository.findById(100)).thenReturn(Optional.of(suggestion));
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewerUser));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        assertThatThrownBy(() -> service.respond(100, "Response", "ACCEPTED", 2,
                LocalDateTime.of(2025, 1, 1, 8, 0)))
                .isInstanceOf(SyncConflictException.class);
    }

    @Test
    void respond_noConflictWhenLocalUpdatedAtNull() {
        suggestion.setUpdatedAt(LocalDateTime.of(2025, 1, 1, 12, 0));
        when(contentSuggestionRepository.findById(100)).thenReturn(Optional.of(suggestion));
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewerUser));
        when(contentSuggestionRepository.save(any(ContentSuggestion.class))).thenAnswer(inv -> inv.getArgument(0));

        ContentSuggestionResponse result = service.respond(100, "OK", "ACCEPTED", 2, null);

        assertThat(result).isNotNull();
    }

    @Test
    void respond_notifiesTrainer() {
        when(contentSuggestionRepository.findById(100)).thenReturn(Optional.of(suggestion));
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewerUser));
        when(contentSuggestionRepository.save(any(ContentSuggestion.class))).thenAnswer(inv -> inv.getArgument(0));

        service.respond(100, "Response text", "ACCEPTED", 2, null);

        verify(notificationService).notifyUser(eq(trainer), eq(reviewerUser), any(), anyString(), anyString(), anyString(), anyInt());
    }

    // ──────────────────── getMySubmissions ────────────────────

    @Test
    void getMySubmissions_returnsList() {
        when(contentSuggestionRepository.findByTrainerUserIdOrderBySubmittedAtDesc(1))
                .thenReturn(List.of(suggestion));

        List<ContentSuggestionResponse> result = service.getMySubmissions(1);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("New exercise suggestion");
    }

    @Test
    void getMySubmissions_emptyList() {
        when(contentSuggestionRepository.findByTrainerUserIdOrderBySubmittedAtDesc(1))
                .thenReturn(Collections.emptyList());

        List<ContentSuggestionResponse> result = service.getMySubmissions(1);

        assertThat(result).isEmpty();
    }

    @Test
    void getMySubmissions_nullTrainerId_throwsBadRequest() {
        assertThatThrownBy(() -> service.getMySubmissions(null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getMySubmissions_zeroTrainerId_throwsBadRequest() {
        assertThatThrownBy(() -> service.getMySubmissions(0))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getMySubmissions_mapsResponseFields() {
        when(contentSuggestionRepository.findByTrainerUserIdOrderBySubmittedAtDesc(1))
                .thenReturn(List.of(suggestion));

        List<ContentSuggestionResponse> result = service.getMySubmissions(1);

        assertThat(result.get(0).getTrainerId()).isEqualTo(1);
        assertThat(result.get(0).getSuggestionType()).isEqualTo("NEW_CONTENT");
    }
}
