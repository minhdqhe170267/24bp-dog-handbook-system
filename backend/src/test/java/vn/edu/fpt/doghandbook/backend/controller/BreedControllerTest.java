package vn.edu.fpt.doghandbook.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.request.BreedCompareRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.BreedRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedCompareResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.BreedService;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(BreedController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class BreedControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private BreedService breedService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_authenticatedReturnsPagedBreeds() throws Exception {
        when(breedService.getAll(0, 10, null)).thenReturn(PageResponse.<BreedResponse>builder()
                .content(List.of(BreedResponse.builder()
                        .breedId(1)
                        .breedName("German Shepherd")
                        .status("PUBLISHED")
                        .build()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build());

        mockMvc.perform(get("/breeds")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].breedId").value(1))
                .andExpect(jsonPath("$.data.content[0].breedName").value("German Shepherd"));

        verify(breedService).getAll(0, 10, null);
    }

    @Test
    void getAll_unauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/breeds"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void compare_authenticatedReturnsComparison() throws Exception {
        BreedCompareRequest request = new BreedCompareRequest();
        request.setBreedIds(List.of(1, 2));

        when(breedService.compare(List.of(1, 2))).thenReturn(BreedCompareResponse.builder()
                .breeds(List.of(
                        BreedResponse.builder().breedId(1).breedName("German Shepherd").build(),
                        BreedResponse.builder().breedId(2).breedName("Belgian Malinois").build()
                ))
                .summary(BreedCompareResponse.ComparisonSummary.builder()
                        .heaviestBreed("German Shepherd")
                        .mostTrainable("Belgian Malinois")
                        .build())
                .build());

        mockMvc.perform(post("/breeds/compare")
                        .with(csrf())
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.breeds[0].breedId").value(1))
                .andExpect(jsonPath("$.data.summary.heaviestBreed").value("German Shepherd"));
    }

    @Test
    void create_trainerReturns403() throws Exception {
        BreedRequest request = new BreedRequest();
        request.setBreedName("New Breed");

        mockMvc.perform(post("/breeds")
                        .with(csrf())
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verifyNoInteractions(breedService);
    }

    @Test
    void create_contentEditorReturns201() throws Exception {
        BreedRequest request = new BreedRequest();
        request.setBreedName("New Breed");

        when(breedService.create(any(BreedRequest.class), eq(10), isNull())).thenReturn(BreedResponse.builder()
                .breedId(9)
                .breedName("New Breed")
                .status("DRAFT")
                .build());

        mockMvc.perform(post("/breeds")
                        .with(csrf())
                        .with(authenticatedUser(10, UserRole.CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.breedId").value(9))
                .andExpect(jsonPath("$.data.breedName").value("New Breed"));
    }
}
