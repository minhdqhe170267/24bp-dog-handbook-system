package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/field-notes")
public class FieldNoteController {

    @GetMapping
    public ApiResponse<?> getAllFieldNotes() {
        List<Map<String, Object>> notes = List.of(
                Map.of("noteId", 1, "title", "Buổi tuần tra sáng",
                        "dogName", "Rex", "dogCode", "BP24-001",
                        "location", "Đồn BP Lào Cai", "noteDate", "2026-02-25",
                        "trainerId", 1, "trainerName", "Nguyễn Văn Kiên"),
                Map.of("noteId", 2, "title", "Ghi chú huấn luyện",
                        "dogName", "Max", "dogCode", "BP24-002",
                        "location", "Thao trường", "noteDate", "2026-02-24",
                        "trainerId", 1, "trainerName", "Nguyễn Văn Kiên")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(notes)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }
}
