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
import vn.edu.fpt.doghandbook.backend.dto.request.FieldNoteRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FieldNoteResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.FieldNote;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.FieldNoteRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncConflictLogRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.FieldNoteServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FieldNoteServiceImplTest {

    @Mock private FieldNoteRepository fieldNoteRepository;
    @Mock private UserRepository userRepository;
    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private SyncConflictLogRepository syncConflictLogRepository;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private FieldNoteServiceImpl service;

    private User trainer;
    private DogProfile dog;
    private FieldNote note;

    @BeforeEach
    void setUp() {
        trainer = User.builder().userId(1).username("trainer01").fullName("Trainer One").build();
        dog = DogProfile.builder().dogId(10).dogName("Rex").dogCode("DOG-001").build();
        note = FieldNote.builder()
                .noteId(100)
                .trainer(trainer)
                .dogProfile(dog)
                .title("Note title")
                .content("Note content")
                .recordingDate(LocalDateTime.of(2025, 1, 1, 10, 0))
                .location("Field A")
                .isDeleted(false)
                .build();
    }

    private FieldNoteRequest makeRequest() {
        FieldNoteRequest req = new FieldNoteRequest();
        req.setTitle("New Note");
        req.setContent("Content here");
        req.setDogId(10);
        req.setLocation("Field B");
        return req;
    }

    // ──────────────────── getAll ────────────────────

    @Test
    void getAll_noSearch_returnsPage() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByIsDeletedFalseOrderByRecordingDateDesc(any())).thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getAll(0, 10, null);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(((FieldNoteResponse) result.getContent().get(0)).getTitle()).isEqualTo("Note title");
    }

    @Test
    void getAll_withSearch_filtersResults() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByTitleContainingIgnoreCaseAndIsDeletedFalse(eq("title"), any())).thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getAll(0, 10, "title");

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getAll_blankSearch_treatedAsNoSearch() {
        Page<FieldNote> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(fieldNoteRepository.findByIsDeletedFalseOrderByRecordingDateDesc(any())).thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getAll(0, 10, "   ");

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getAll_emptyPage_returnsEmptyContent() {
        Page<FieldNote> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(fieldNoteRepository.findByIsDeletedFalseOrderByRecordingDateDesc(any())).thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getAll(0, 10, null);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalPages()).isZero();
    }

    @Test
    void getAll_mapsResponseFields() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByIsDeletedFalseOrderByRecordingDateDesc(any())).thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getAll(0, 10, null);
        FieldNoteResponse resp = (FieldNoteResponse) result.getContent().get(0);

        assertThat(resp.getTrainerId()).isEqualTo(1);
        assertThat(resp.getDogName()).isEqualTo("Rex");
        assertThat(resp.getLocation()).isEqualTo("Field A");
    }

    // ──────────────────── getByTrainer ────────────────────

    @Test
    void getByTrainer_returnsPage() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByTrainer(1, 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getByTrainer_emptyResult() {
        Page<FieldNote> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(fieldNoteRepository.findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(99), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByTrainer(99, 0, 10);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getByTrainer_correctPageMetadata() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(2, 5), 15);
        when(fieldNoteRepository.findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByTrainer(1, 2, 5);

        assertThat(result.getPage()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(5);
        assertThat(result.getTotalElements()).isEqualTo(15);
    }

    @Test
    void getByTrainer_mapsTrainerName() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByTrainer(1, 0, 10);
        FieldNoteResponse resp = (FieldNoteResponse) result.getContent().get(0);

        assertThat(resp.getTrainerName()).isEqualTo("Trainer One");
    }

    @Test
    void getByTrainer_mapsDogCode() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByTrainer(1, 0, 10);
        FieldNoteResponse resp = (FieldNoteResponse) result.getContent().get(0);

        assertThat(resp.getDogCode()).isEqualTo("DOG-001");
    }

    // ──────────────────── getByDog ────────────────────

    @Test
    void getByDog_returnsPage() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(10), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByDog(10, 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getByDog_emptyResult() {
        Page<FieldNote> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(fieldNoteRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(99), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByDog(99, 0, 10);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getByDog_correctPageSize() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 5), 1);
        when(fieldNoteRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(10), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByDog(10, 0, 5);

        assertThat(result.getSize()).isEqualTo(5);
    }

    @Test
    void getByDog_mapsNoteId() {
        Page<FieldNote> page = new PageImpl<>(List.of(note), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(10), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByDog(10, 0, 10);
        FieldNoteResponse resp = (FieldNoteResponse) result.getContent().get(0);

        assertThat(resp.getNoteId()).isEqualTo(100);
    }

    @Test
    void getByDog_nullDogProfile_mapsNulls() {
        FieldNote noteNoDog = FieldNote.builder()
                .noteId(101).trainer(trainer).dogProfile(null)
                .title("T").content("C").recordingDate(LocalDateTime.now()).isDeleted(false).build();
        Page<FieldNote> page = new PageImpl<>(List.of(noteNoDog), PageRequest.of(0, 10), 1);
        when(fieldNoteRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByRecordingDateDesc(eq(10), any()))
                .thenReturn(page);

        PageResponse<FieldNoteResponse> result = service.getByDog(10, 0, 10);
        FieldNoteResponse resp = (FieldNoteResponse) result.getContent().get(0);

        assertThat(resp.getDogId()).isNull();
        assertThat(resp.getDogName()).isNull();
    }

    // ──────────────────── getById ────────────────────

    @Test
    void getById_found_returnsResponse() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        FieldNoteResponse result = service.getById(100);

        assertThat(result.getNoteId()).isEqualTo(100);
        assertThat(result.getTitle()).isEqualTo("Note title");
    }

    @Test
    void getById_notFound_throwsResourceNotFound() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void getById_mapsTrainerId() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        FieldNoteResponse result = service.getById(100);

        assertThat(result.getTrainerId()).isEqualTo(1);
    }

    @Test
    void getById_mapsDogId() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        FieldNoteResponse result = service.getById(100);

        assertThat(result.getDogId()).isEqualTo(10);
    }

    @Test
    void getById_mapsRecordingDate() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        FieldNoteResponse result = service.getById(100);

        assertThat(result.getRecordingDate()).isEqualTo(LocalDateTime.of(2025, 1, 1, 10, 0));
    }

    // ──────────────────── create ────────────────────

    @Test
    void create_success_returnsResponse() {
        FieldNoteRequest req = makeRequest();
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(fieldNoteRepository.save(any(FieldNote.class))).thenReturn(note);

        FieldNoteResponse result = service.create(req, 1);

        assertThat(result.getTitle()).isEqualTo("Note title");
        verify(fieldNoteRepository).save(any(FieldNote.class));
    }

    @Test
    void create_trainerNotFound_throwsResourceNotFound() {
        FieldNoteRequest req = makeRequest();
        when(userRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(req, 999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void create_withLocalId_existingReturnsExisting() {
        FieldNoteRequest req = makeRequest();
        req.setLocalId("local-123");
        when(fieldNoteRepository.findByLocalId("local-123")).thenReturn(Optional.of(note));

        FieldNoteResponse result = service.create(req, 1);

        assertThat(result.getNoteId()).isEqualTo(100);
        verify(fieldNoteRepository, never()).save(any());
    }

    @Test
    void create_nullDogId_setsNullDog() {
        FieldNoteRequest req = makeRequest();
        req.setDogId(null);
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        FieldNote savedNote = FieldNote.builder()
                .noteId(101).trainer(trainer).dogProfile(null)
                .title("New Note").content("Content here")
                .recordingDate(LocalDateTime.now()).isDeleted(false).build();
        when(fieldNoteRepository.save(any(FieldNote.class))).thenReturn(savedNote);

        FieldNoteResponse result = service.create(req, 1);

        assertThat(result.getDogId()).isNull();
    }

    @Test
    void create_noLocalId_doesNotCheckExisting() {
        FieldNoteRequest req = makeRequest();
        req.setLocalId(null);
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(fieldNoteRepository.save(any(FieldNote.class))).thenReturn(note);

        service.create(req, 1);

        verify(fieldNoteRepository, never()).findByLocalId(any());
    }

    @Test
    void create_withRecordingDate_usesProvidedDate() {
        FieldNoteRequest req = makeRequest();
        req.setRecordingDate(LocalDateTime.of(2025, 6, 15, 9, 0));
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(fieldNoteRepository.save(any(FieldNote.class))).thenAnswer(inv -> {
            FieldNote saved = inv.getArgument(0);
            saved.setNoteId(101);
            saved.setTrainer(trainer);
            saved.setDogProfile(dog);
            return saved;
        });

        FieldNoteResponse result = service.create(req, 1);

        assertThat(result.getRecordingDate()).isEqualTo(LocalDateTime.of(2025, 6, 15, 9, 0));
    }

    // ──────────────────── update ────────────────────

    @Test
    void update_success_updatesFields() {
        FieldNoteRequest req = makeRequest();
        req.setTitle("Updated Title");
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));
        when(fieldNoteRepository.save(any(FieldNote.class))).thenAnswer(inv -> inv.getArgument(0));

        FieldNoteResponse result = service.update(100, req, 1);

        assertThat(result.getTitle()).isEqualTo("Updated Title");
    }

    @Test
    void update_notFound_throwsResourceNotFound() {
        FieldNoteRequest req = makeRequest();
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(999, req, 1))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void update_wrongTrainer_throwsBadRequest() {
        FieldNoteRequest req = makeRequest();
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> service.update(100, req, 999))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void update_syncConflict_throwsSyncConflictException() throws Exception {
        FieldNoteRequest req = makeRequest();
        req.setLocalUpdatedAt(LocalDateTime.of(2025, 1, 1, 8, 0));
        note.setUpdatedAt(LocalDateTime.of(2025, 1, 1, 12, 0));
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        assertThatThrownBy(() -> service.update(100, req, 1))
                .isInstanceOf(SyncConflictException.class)
                .hasMessageContaining("modified");
    }

    @Test
    void update_noConflict_whenLocalUpdatedAtNull() {
        FieldNoteRequest req = makeRequest();
        req.setLocalUpdatedAt(null);
        note.setUpdatedAt(LocalDateTime.of(2025, 1, 1, 12, 0));
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));
        when(fieldNoteRepository.save(any(FieldNote.class))).thenAnswer(inv -> inv.getArgument(0));

        FieldNoteResponse result = service.update(100, req, 1);

        assertThat(result).isNotNull();
    }

    @Test
    void update_changesDogProfile() {
        FieldNoteRequest req = makeRequest();
        req.setDogId(20);
        DogProfile newDog = DogProfile.builder().dogId(20).dogName("Buddy").dogCode("DOG-002").build();
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(20)).thenReturn(Optional.of(newDog));
        when(fieldNoteRepository.save(any(FieldNote.class))).thenAnswer(inv -> inv.getArgument(0));

        FieldNoteResponse result = service.update(100, req, 1);

        assertThat(result.getDogName()).isEqualTo("Buddy");
    }

    // ──────────────────── delete ────────────────────

    @Test
    void delete_success_softDeletes() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        service.delete(100, 1);

        assertThat(note.getIsDeleted()).isTrue();
        assertThat(note.getDeletedAt()).isNotNull();
        verify(fieldNoteRepository).save(note);
    }

    @Test
    void delete_notFound_throwsResourceNotFound() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(999, 1))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void delete_wrongTrainer_throwsBadRequest() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> service.delete(100, 999))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void delete_setsDeletedAt() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        service.delete(100, 1);

        assertThat(note.getDeletedAt()).isNotNull();
    }

    @Test
    void delete_savesEntity() {
        when(fieldNoteRepository.findByNoteIdAndIsDeletedFalse(100)).thenReturn(Optional.of(note));

        service.delete(100, 1);

        verify(fieldNoteRepository).save(note);
    }
}
