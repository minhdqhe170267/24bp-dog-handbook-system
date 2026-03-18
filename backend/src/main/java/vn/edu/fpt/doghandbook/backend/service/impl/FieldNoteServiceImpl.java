package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.FieldNoteService;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FieldNoteServiceImpl implements FieldNoteService {

    private final FieldNoteRepository fieldNoteRepository;
    private final UserRepository userRepository;
    private final DogProfileRepository dogProfileRepository;

    @Override
    public PageResponse<FieldNoteResponse> getAll(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);
        Page<FieldNote> notePage;

        if (search != null && !search.isBlank()) {
            notePage = fieldNoteRepository.findByTitleContainingIgnoreCaseAndIsDeletedFalse(search, pageable);
        } else {
            notePage = fieldNoteRepository.findByIsDeletedFalseOrderByRecordingDateDesc(pageable);
        }

        List<FieldNoteResponse> content = notePage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<FieldNoteResponse>builder()
                .content(content)
                .page(notePage.getNumber())
                .size(notePage.getSize())
                .totalElements(notePage.getTotalElements())
                .totalPages(notePage.getTotalPages())
                .build();
    }

    @Override
    public PageResponse<FieldNoteResponse> getByTrainer(Integer trainerId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<FieldNote> notePage = fieldNoteRepository
                .findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(trainerId, pageable);

        List<FieldNoteResponse> content = notePage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<FieldNoteResponse>builder()
                .content(content)
                .page(notePage.getNumber())
                .size(notePage.getSize())
                .totalElements(notePage.getTotalElements())
                .totalPages(notePage.getTotalPages())
                .build();
    }

    @Override
    public PageResponse<FieldNoteResponse> getByDog(Integer dogId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<FieldNote> notePage = fieldNoteRepository
                .findByDogProfileDogIdAndIsDeletedFalseOrderByRecordingDateDesc(dogId, pageable);

        List<FieldNoteResponse> content = notePage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<FieldNoteResponse>builder()
                .content(content)
                .page(notePage.getNumber())
                .size(notePage.getSize())
                .totalElements(notePage.getTotalElements())
                .totalPages(notePage.getTotalPages())
                .build();
    }

    @Override
    public FieldNoteResponse getById(Integer noteId) {
        FieldNote note = fieldNoteRepository.findByNoteIdAndIsDeletedFalse(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Field note not found with id: " + noteId));
        return toResponse(note);
    }

    @Override
    @Transactional
    public FieldNoteResponse create(FieldNoteRequest request, Integer trainerId) {
        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with id: " + trainerId));

        DogProfile dog = request.getDogId() != null
                ? dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId()).orElse(null)
                : null;

        FieldNote note = FieldNote.builder()
                .trainer(trainer)
                .dogProfile(dog)
                .title(request.getTitle())
                .content(request.getContent())
                .photoUrls(request.getPhotoUrls())
                .recordingDate(request.getRecordingDate() != null ? request.getRecordingDate() : LocalDateTime.now())
                .location(request.getLocation())
                .linkedContentId(request.getLinkedContentId())
                .isDeleted(false)
                .build();

        return toResponse(fieldNoteRepository.save(note));
    }

    @Override
    @Transactional
    public FieldNoteResponse update(Integer noteId, FieldNoteRequest request, Integer trainerId) {
        FieldNote note = fieldNoteRepository.findByNoteIdAndIsDeletedFalse(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Field note not found with id: " + noteId));

        if (!note.getTrainer().getUserId().equals(trainerId)) {
            throw new BadRequestException("Không có quyền chỉnh sửa ghi chú này");
        }

        // Conflict detection: server record modified after mobile's last known version
        if (request.getLocalUpdatedAt() != null
                && note.getUpdatedAt() != null
                && note.getUpdatedAt().isAfter(request.getLocalUpdatedAt())) {
            log.warn("[SYNC:CONFLICT] field_note id={} serverTime={} > localTime={}",
                    noteId, note.getUpdatedAt(), request.getLocalUpdatedAt());
            throw new SyncConflictException("Record modified on server", toResponse(note));
        }

        if (request.getTitle() != null) note.setTitle(request.getTitle());
        if (request.getContent() != null) note.setContent(request.getContent());
        if (request.getPhotoUrls() != null) note.setPhotoUrls(request.getPhotoUrls());
        if (request.getLocation() != null) note.setLocation(request.getLocation());
        if (request.getLinkedContentId() != null) note.setLinkedContentId(request.getLinkedContentId());

        if (request.getDogId() != null) {
            DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId()).orElse(null);
            note.setDogProfile(dog);
        }

        return toResponse(fieldNoteRepository.save(note));
    }

    @Override
    @Transactional
    public void delete(Integer noteId, Integer trainerId) {
        FieldNote note = fieldNoteRepository.findByNoteIdAndIsDeletedFalse(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Field note not found with id: " + noteId));

        if (!note.getTrainer().getUserId().equals(trainerId)) {
            throw new BadRequestException("Không có quyền xóa ghi chú này");
        }

        note.setIsDeleted(true);
        note.setDeletedAt(LocalDateTime.now());
        fieldNoteRepository.save(note);
    }

    private FieldNoteResponse toResponse(FieldNote entity) {
        return FieldNoteResponse.builder()
                .noteId(entity.getNoteId())
                .trainerId(entity.getTrainer().getUserId())
                .trainerName(entity.getTrainer().getFullName())
                .dogId(entity.getDogProfile() != null ? entity.getDogProfile().getDogId() : null)
                .dogName(entity.getDogProfile() != null ? entity.getDogProfile().getDogName() : null)
                .dogCode(entity.getDogProfile() != null ? entity.getDogProfile().getDogCode() : null)
                .title(entity.getTitle())
                .content(entity.getContent())
                .photoUrls(entity.getPhotoUrls())
                .recordingDate(entity.getRecordingDate())
                .location(entity.getLocation())
                .linkedContentId(entity.getLinkedContentId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
