package vn.edu.fpt.doghandbook.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingMethodRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingMethodResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.TrainingService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;

@WebMvcTest(TrainingMethodController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class TrainingMethodControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private TrainingService trainingService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAllMethods_authenticated_returns200() throws Exception {
        when(trainingService.getAllMethods(0, 10, null)).thenReturn(pageResponse());

        mockMvc.perform(get("/training-methods")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].methodName").value("Clicker"));
    }

    @Test
    void getMethodById_notFound_returns404() throws Exception {
        when(trainingService.getMethodById(99)).thenThrow(new ResourceNotFoundException("Method", "id", 99));

        mockMvc.perform(get("/training-methods/99")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void createMethod_customPrincipal_returns201() throws Exception {
        when(trainingService.createMethod(any(TrainingMethodRequest.class), eq(5))).thenReturn(response());

        mockMvc.perform(post("/training-methods")
                        .with(authenticatedUser(5, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.methodId").value(1));
    }

    @Test
    void createMethod_numberPrincipal_returns201() throws Exception {
        when(trainingService.createMethod(any(TrainingMethodRequest.class), eq(17))).thenReturn(response());

        mockMvc.perform(post("/training-methods")
                        .with(authentication(new TestingAuthenticationToken(17, null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.methodId").value(1))
                .andExpect(jsonPath("$.data.methodName").value("Clicker"));
    }

    @Test
    void createMethod_stringPrincipal_returns201() throws Exception {
        when(trainingService.createMethod(any(TrainingMethodRequest.class), eq(19))).thenReturn(response());

        mockMvc.perform(post("/training-methods")
                        .with(authentication(new TestingAuthenticationToken("19", null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.methodId").value(1));
    }

    @Test
    void createMethod_anonymousPrincipal_returns400() throws Exception {
        mockMvc.perform(post("/training-methods")
                        .with(authentication(new TestingAuthenticationToken("anonymousUser", null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));
    }

    @Test
    void createMethod_objectPrincipal_returns400() throws Exception {
        mockMvc.perform(post("/training-methods")
                        .with(authentication(new TestingAuthenticationToken(new Object(), null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));
    }

    @Test
    void createMethod_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/training-methods")
                        .with(authenticatedUser(5, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void updateMethod_contentEditorRole_returns200() throws Exception {
        when(trainingService.updateMethod(eq(1), any(TrainingMethodRequest.class))).thenReturn(response());

        mockMvc.perform(put("/training-methods/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.methodName").value("Clicker"));
    }

    @Test
    void deleteMethod_adminRole_returns200() throws Exception {
        doNothing().when(trainingService).deleteMethod(1);

        mockMvc.perform(delete("/training-methods/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void deleteMethod_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(delete("/training-methods/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    private TrainingMethodRequest validRequest() {
        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("Clicker");
        request.setDescription("Reward based");
        return request;
    }

    private TrainingMethodResponse response() {
        return TrainingMethodResponse.builder()
                .methodId(1)
                .methodName("Clicker")
                .description("Reward based")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<TrainingMethodResponse> pageResponse() {
        return PageResponse.<TrainingMethodResponse>builder()
                .content(List.of(response()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
