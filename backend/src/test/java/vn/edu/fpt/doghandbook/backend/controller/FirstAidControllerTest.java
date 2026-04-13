package vn.edu.fpt.doghandbook.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.request.FirstAidGuideRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FirstAidGuideResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.FirstAidGuideService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(FirstAidController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class FirstAidControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private FirstAidGuideService firstAidGuideService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_adminRole_usesRequestedStatusAndReturns200() throws Exception {
        when(firstAidGuideService.getAll(0, 10, "burn", "DRAFT")).thenReturn(samplePage("DRAFT"));

        mockMvc.perform(get("/first-aid-guides")
                        .with(authenticatedUser(1, ADMIN))
                        .param("search", "burn")
                        .param("status", "DRAFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status").value("DRAFT"));

        verify(firstAidGuideService).getAll(0, 10, "burn", "DRAFT");
    }

    @Test
    void getAll_trainerRole_forcesPublishedStatus() throws Exception {
        when(firstAidGuideService.getAll(0, 10, null, "PUBLISHED")).thenReturn(samplePage("PUBLISHED"));

        mockMvc.perform(get("/first-aid-guides")
                        .with(authenticatedUser(7, TRAINER))
                        .param("status", "DRAFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status").value("PUBLISHED"));

        verify(firstAidGuideService).getAll(0, 10, null, "PUBLISHED");
    }

    @Test
    void getAll_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/first-aid-guides"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void getById_publishedGuide_returns200() throws Exception {
        when(firstAidGuideService.getById(1)).thenReturn(sampleResponse("PUBLISHED"));

        mockMvc.perform(get("/first-aid-guides/1")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.guideId").value(1))
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));
    }

    @Test
    void getById_trainerAndUnpublishedGuide_returns404() throws Exception {
        when(firstAidGuideService.getById(2)).thenReturn(sampleResponse("DRAFT"));

        mockMvc.perform(get("/first-aid-guides/2")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void createJson_contentEditorRole_returns201() throws Exception {
        when(firstAidGuideService.create(any(FirstAidGuideRequest.class), eq(2), isNull()))
                .thenReturn(sampleResponse("DRAFT"));

        mockMvc.perform(post("/first-aid-guides")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.guideTitle").value("Burn Care"));

        verify(firstAidGuideService).create(any(FirstAidGuideRequest.class), eq(2), isNull());
    }

    @Test
    void createJson_invalidPayload_returns400() throws Exception {
        FirstAidGuideRequest request = new FirstAidGuideRequest();
        request.setEmergencyType("Burn");

        mockMvc.perform(post("/first-aid-guides")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void createMultipart_contentEditorRole_returns201() throws Exception {
        when(firstAidGuideService.create(any(FirstAidGuideRequest.class), eq(2), any()))
                .thenReturn(sampleResponse("PUBLISHED"));

        mockMvc.perform(multipart("/first-aid-guides")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .file(dataPart(validRequest()))
                        .file(imagePart()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.imageUrl").value("https://cdn.example/guide.png"));
    }

    @Test
    void createMultipart_trainerRole_returns403() throws Exception {
        mockMvc.perform(multipart("/first-aid-guides")
                        .with(authenticatedUser(7, TRAINER))
                        .file(dataPart(validRequest()))
                        .file(imagePart()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(firstAidGuideService, never()).create(any(), any(), any());
    }

    @Test
    void updateJson_contentEditorRole_returns200() throws Exception {
        FirstAidGuideResponse updated = sampleResponse("PUBLISHED");
        updated.setGuideTitle("Burn Care Updated");
        when(firstAidGuideService.update(eq(1), any(FirstAidGuideRequest.class), eq(2), isNull()))
                .thenReturn(updated);

        mockMvc.perform(put("/first-aid-guides/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.guideTitle").value("Burn Care Updated"));
    }

    @Test
    void updateJson_notFound_returns404() throws Exception {
        when(firstAidGuideService.update(eq(99), any(FirstAidGuideRequest.class), eq(2), isNull()))
                .thenThrow(new ResourceNotFoundException("FirstAidGuide", "id", 99));

        mockMvc.perform(put("/first-aid-guides/99")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void updateMultipart_contentEditorRole_returns200() throws Exception {
        when(firstAidGuideService.update(eq(1), any(FirstAidGuideRequest.class), eq(2), any()))
                .thenReturn(sampleResponse("PUBLISHED"));

        mockMvc.perform(multipart("/first-aid-guides/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        })
                        .file(dataPart(validRequest()))
                        .file(imagePart()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.guideTitle").value("Burn Care"));
    }

    @Test
    void delete_adminRole_returns200() throws Exception {
        doNothing().when(firstAidGuideService).delete(1);

        mockMvc.perform(delete("/first-aid-guides/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(firstAidGuideService).delete(1);
    }

    @Test
    void delete_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(delete("/first-aid-guides/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(firstAidGuideService, never()).delete(any());
    }

    @Test
    void delete_notFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("FirstAidGuide", "id", 99)).when(firstAidGuideService).delete(99);

        mockMvc.perform(delete("/first-aid-guides/99")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    private FirstAidGuideRequest validRequest() {
        return FirstAidGuideRequest.builder()
                .guideTitle("Burn Care")
                .emergencyType("Burn")
                .description("Immediate burn response")
                .immediateSteps("Cool with clean water")
                .requiredMaterials("Water, gauze")
                .doNotActions("Do not apply ice")
                .whenToSeekVet("If blistering occurs")
                .status("PUBLISHED")
                .build();
    }

    private FirstAidGuideResponse sampleResponse(String status) {
        return FirstAidGuideResponse.builder()
                .guideId(1)
                .guideTitle("Burn Care")
                .emergencyType("Burn")
                .description("Immediate burn response")
                .immediateSteps("Cool with clean water")
                .requiredMaterials("Water, gauze")
                .doNotActions("Do not apply ice")
                .whenToSeekVet("If blistering occurs")
                .imageUrl("https://cdn.example/guide.png")
                .status(status)
                .createdByName("Editor")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<FirstAidGuideResponse> samplePage(String status) {
        return PageResponse.<FirstAidGuideResponse>builder()
                .content(List.of(sampleResponse(status)))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }

    private MockMultipartFile dataPart(FirstAidGuideRequest request) throws Exception {
        return new MockMultipartFile(
                "data",
                "data",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(request)
        );
    }

    private MockMultipartFile imagePart() {
        return new MockMultipartFile(
                "image",
                "guide.png",
                MediaType.IMAGE_PNG_VALUE,
                "image".getBytes(StandardCharsets.UTF_8)
        );
    }
}
