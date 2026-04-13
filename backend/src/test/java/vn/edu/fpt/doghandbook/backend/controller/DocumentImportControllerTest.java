package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportPreviewResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportTemplateResponse;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.DocumentImportService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.parseMediaType;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(DocumentImportController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class DocumentImportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DocumentImportService documentImportService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getTemplates_contentEditorRole_returns200() throws Exception {
        when(documentImportService.getTemplates()).thenReturn(List.of(sampleTemplate()));

        mockMvc.perform(get("/import/templates")
                        .with(authenticatedUser(5, CONTENT_EDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].entityType").value("BREED"))
                .andExpect(jsonPath("$.data[0].templateName").value("Breed"));
    }

    @Test
    void getTemplates_trainerRole_returns403() throws Exception {
        mockMvc.perform(get("/import/templates")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    void downloadTemplate_multipleEntityTypes_returns200() throws Exception {
        when(documentImportService.downloadTemplate(any())).thenReturn(new ByteArrayInputStream("xlsx".getBytes()));

        for (String entityType : List.of(
                "BREED", "DISEASE", "MEDICATION", "EXERCISE", "NUTRITION",
                "TRAINING_METHOD", "TRAINING_ROADMAP", "FIRST_AID_GUIDE", "DOG_PROFILE", "OTHER"
        )) {
            mockMvc.perform(get("/import/templates/{entityType}/file", entityType)
                            .with(authenticatedUser(5, CONTENT_EDITOR)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                    .andExpect(content().contentType(parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    )));
        }
    }

    @Test
    void preview_contentEditorRole_returns200() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "import.csv", "text/csv", "data".getBytes());
        when(documentImportService.preview(eq("BREED"), any())).thenReturn(samplePreview());

        mockMvc.perform(multipart("/import/preview")
                        .file(file)
                        .param("entityType", "BREED")
                        .with(authenticatedUser(5, CONTENT_EDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fileName").value("import.csv"))
                .andExpect(jsonPath("$.data.validRows").value(1))
                .andExpect(jsonPath("$.data.canConfirm").value(true));
    }

    @Test
    void confirm_contentEditorRole_returns200() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "import.csv", "text/csv", "data".getBytes());
        when(documentImportService.confirm(eq("BREED"), any(), eq(5))).thenReturn(samplePreview());

        mockMvc.perform(multipart("/import/confirm")
                        .file(file)
                        .param("entityType", "BREED")
                        .with(authenticatedUser(5, CONTENT_EDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fileName").value("import.csv"))
                .andExpect(jsonPath("$.data.validRows").value(1));

        verify(documentImportService).confirm(eq("BREED"), any(), eq(5));
    }

    @Test
    void confirm_trainerRole_returns403() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "import.csv", "text/csv", "data".getBytes());

        mockMvc.perform(multipart("/import/confirm")
                        .file(file)
                        .param("entityType", "BREED")
                        .with(authenticatedUser(5, TRAINER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    private ImportTemplateResponse sampleTemplate() {
        return ImportTemplateResponse.builder()
                .templateName("Breed")
                .entityType("BREED")
                .description("Import breeds")
                .requiredColumns(List.of("breedName"))
                .optionalColumns(List.of("origin"))
                .supportedFileTypes(List.of("CSV"))
                .downloadUrl("/import/templates/BREED/file")
                .instructions(List.of("Use template"))
                .build();
    }

    private ImportPreviewResponse samplePreview() {
        return ImportPreviewResponse.builder()
                .fileName("import.csv")
                .fileType("CSV")
                .totalRows(1)
                .validRows(1)
                .errorRows(0)
                .previewData(List.of())
                .columns(List.of("breedName"))
                .errors(List.of())
                .warnings(List.of("warning"))
                .canConfirm(true)
                .build();
    }
}
