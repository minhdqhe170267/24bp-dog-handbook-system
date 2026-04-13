package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.SearchHistoryResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SearchResultResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.SearchService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(SearchController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SearchService searchService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void search_authenticatedReturnsResults() throws Exception {
        when(searchService.search("german", "BREED", 7)).thenReturn(List.of(
                SearchResultResponse.builder()
                        .entityType("BREED")
                        .entityId(1)
                        .title("German Shepherd")
                        .description("Working dog")
                        .build()
        ));

        mockMvc.perform(get("/search")
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .param("keyword", "german")
                        .param("context", "BREED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].entityType").value("BREED"))
                .andExpect(jsonPath("$.data[0].entityId").value(1))
                .andExpect(jsonPath("$.data[0].title").value("German Shepherd"));

        verify(searchService).search("german", "BREED", 7);
    }

    @Test
    void search_unauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/search")
                        .param("keyword", "german"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void history_authenticatedReturnsEntries() throws Exception {
        when(searchService.getHistory(7)).thenReturn(List.of(
                SearchHistoryResponse.builder()
                        .searchId(1)
                        .searchKeyword("german")
                        .searchContext("BREED")
                        .resultCount(3)
                        .searchedAt(LocalDateTime.of(2026, 4, 2, 9, 0))
                        .build()
        ));

        mockMvc.perform(get("/search/history")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].searchId").value(1))
                .andExpect(jsonPath("$.data[0].searchKeyword").value("german"));
    }

    @Test
    void suggestions_authenticatedReturnsSuggestions() throws Exception {
        when(searchService.getSuggestions(7, "ge")).thenReturn(List.of("German Shepherd", "General article"));

        mockMvc.perform(get("/search/suggestions")
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .param("keyword", "ge"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value("German Shepherd"))
                .andExpect(jsonPath("$.data[1]").value("General article"));

        verify(searchService).getSuggestions(7, "ge");
    }
}
