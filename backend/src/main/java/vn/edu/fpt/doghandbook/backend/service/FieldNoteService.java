package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.FieldNoteRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FieldNoteResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface FieldNoteService {

    PageResponse<FieldNoteResponse> getAll(int page, int size, String search);

    PageResponse<FieldNoteResponse> getByTrainer(Integer trainerId, int page, int size);

    PageResponse<FieldNoteResponse> getByDog(Integer dogId, int page, int size);

    FieldNoteResponse getById(Integer noteId);

    FieldNoteResponse create(FieldNoteRequest request, Integer trainerId);

    FieldNoteResponse update(Integer noteId, FieldNoteRequest request, Integer trainerId);

    void delete(Integer noteId, Integer trainerId);
}
