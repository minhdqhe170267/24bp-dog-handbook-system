package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.entity.AuditLog;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AuditActionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.AuditLogRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.AuditLogServiceImpl;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceImplTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditLogServiceImpl auditLogService;

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void log_withoutSecurityContext_savesAuditEntryWithNullUserAndIp() {
        auditLogService.log(AuditActionType.CREATE, "CONTENT", 5, "Created content");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertThat(saved.getUser()).isNull();
        assertThat(saved.getIpAddress()).isNull();
        assertThat(saved.getActionType()).isEqualTo("CREATE");
        assertThat(saved.getEntityType()).isEqualTo("CONTENT");
        assertThat(saved.getEntityId()).isEqualTo(5);
        assertThat(saved.getDescription()).isEqualTo("Created content");
    }

    @Test
    void log_repositoryFailure_isSwallowed() {
        doThrow(new RuntimeException("db down")).when(auditLogRepository).save(any(AuditLog.class));

        auditLogService.log(AuditActionType.DELETE, "CONTENT", 6, "Delete content");
    }

    @Test
    void log_withCustomUserAndForwardedHeader_savesResolvedUserAndIp() {
        User user = sampleUser();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "10.0.0.1, 10.0.0.2");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new CustomUserDetails(user), null,
                        new CustomUserDetails(user).getAuthorities())
        );

        auditLogService.log(AuditActionType.UPDATE, "DOG", 8, "Updated dog");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isEqualTo(user);
        assertThat(captor.getValue().getIpAddress()).isEqualTo("10.0.0.1");
    }

    @Test
    void log_withRemoteAddressFallback_usesRemoteAddr() {
        User user = sampleUser();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.55");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new CustomUserDetails(user), null,
                        new CustomUserDetails(user).getAuthorities())
        );

        auditLogService.log(AuditActionType.CREATE, "DOG", 9, "Created dog");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getIpAddress()).isEqualTo("192.168.1.55");
    }

    @Test
    void logWithUser_persistsExpectedAuditEntry() {
        User user = sampleUser();

        auditLogService.logWithUser(user, "127.0.0.1", AuditActionType.LOGIN, "USER", 7, "Login successful");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertThat(saved.getUser()).isSameAs(user);
        assertThat(saved.getActionType()).isEqualTo("LOGIN");
        assertThat(saved.getEntityType()).isEqualTo("USER");
        assertThat(saved.getEntityId()).isEqualTo(7);
        assertThat(saved.getIpAddress()).isEqualTo("127.0.0.1");
        assertThat(saved.getDescription()).isEqualTo("Login successful");
    }

    @Test
    void logWithUser_repositoryFailure_isSwallowed() {
        doThrow(new RuntimeException("db down")).when(auditLogRepository).save(any(AuditLog.class));

        auditLogService.logWithUser(sampleUser(), "127.0.0.1", AuditActionType.LOGIN, "USER", 7, "Login");
    }

    @Test
    void getById_mapsUserInformation() {
        when(auditLogRepository.findById(1L)).thenReturn(Optional.of(sampleAuditLog()));

        AuditLogResponse response = auditLogService.getById(1L);

        assertThat(response.getLogId()).isEqualTo(1L);
        assertThat(response.getUserId()).isEqualTo(7);
        assertThat(response.getUsername()).isEqualTo("admin");
        assertThat(response.getActionType()).isEqualTo("LOGIN");
    }

    @Test
    void getById_withNullUser_mapsNullUserFields() {
        AuditLog auditLog = AuditLog.builder()
                .logId(2L)
                .actionType("DELETE")
                .entityType("DOG")
                .entityId(5)
                .description("Deleted")
                .actionTimestamp(LocalDateTime.now())
                .build();
        when(auditLogRepository.findById(2L)).thenReturn(Optional.of(auditLog));

        AuditLogResponse response = auditLogService.getById(2L);

        assertThat(response.getUserId()).isNull();
        assertThat(response.getUsername()).isNull();
        assertThat(response.getFullName()).isNull();
    }

    @Test
    void getById_notFound_throwsBadRequestException() {
        when(auditLogRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> auditLogService.getById(99L))
                .isInstanceOf(vn.edu.fpt.doghandbook.backend.exception.BadRequestException.class)
                .hasMessageContaining("99");
    }

    @Test
    void getAll_returnsMappedPageResponse() {
        AuditLog log = sampleAuditLog();
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log), PageRequest.of(0, 20), 1));

        PageResponse<AuditLogResponse> response = auditLogService.getAll(
                0, 20, "LOGIN", "USER", 7, "2026-03-01", "2026-03-21");

        assertThat(response.getTotalElements()).isEqualTo(1);
        assertThat(response.getTotalPages()).isEqualTo(1);
        AuditLogResponse first = (AuditLogResponse) response.getContent().get(0);
        assertThat(first.getUsername()).isEqualTo("admin");
        assertThat(first.getDescription()).isEqualTo("Login successful");
    }

    @Test
    void getAll_withInvalidDatesStillReturnsResults() {
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PageResponse<AuditLogResponse> response = auditLogService.getAll(
                0, 10, "LOGIN", "USER", 7, "invalid-date", "also-invalid");

        assertThat(response.getContent()).isEmpty();
        assertThat(response.getTotalElements()).isZero();
        assertThat(response.getTotalPages()).isEqualTo(0);
    }

    @Test
    @SuppressWarnings("unchecked")
    void buildSpecification_allFilters_presentAddsAllPredicates() {
        Specification<AuditLog> specification = (Specification<AuditLog>) ReflectionTestUtils.invokeMethod(
                auditLogService,
                "buildSpecification",
                "LOGIN", "USER", 7, "2026-03-01", "2026-03-21"
        );
        Root<AuditLog> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Object> actionPath = mock(Path.class);
        Path<Object> entityPath = mock(Path.class);
        Path<Object> userPath = mock(Path.class);
        Path<Object> userIdPath = mock(Path.class);
        Path<LocalDateTime> timestampPath = mock(Path.class);
        Predicate actionPredicate = mock(Predicate.class);
        Predicate entityPredicate = mock(Predicate.class);
        Predicate userPredicate = mock(Predicate.class);
        Predicate fromPredicate = mock(Predicate.class);
        Predicate toPredicate = mock(Predicate.class);
        Predicate finalPredicate = mock(Predicate.class);

        when(root.get("actionType")).thenReturn(actionPath);
        when(root.get("entityType")).thenReturn(entityPath);
        when(root.get("user")).thenReturn(userPath);
        when(userPath.get("userId")).thenReturn(userIdPath);
        when(root.<LocalDateTime>get("actionTimestamp")).thenReturn(timestampPath);
        when(cb.equal(actionPath, "LOGIN")).thenReturn(actionPredicate);
        when(cb.equal(entityPath, "USER")).thenReturn(entityPredicate);
        when(cb.equal(userIdPath, 7)).thenReturn(userPredicate);
        when(cb.greaterThanOrEqualTo(eq(timestampPath), eq(LocalDate.of(2026, 3, 1).atStartOfDay())))
                .thenReturn(fromPredicate);
        when(cb.lessThanOrEqualTo(eq(timestampPath), eq(LocalDate.of(2026, 3, 21).atTime(LocalTime.MAX))))
                .thenReturn(toPredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(finalPredicate);

        Predicate result = specification.toPredicate(root, query, cb);

        assertThat(result).isSameAs(finalPredicate);
        verify(cb).equal(actionPath, "LOGIN");
        verify(cb).equal(entityPath, "USER");
        verify(cb).equal(userIdPath, 7);
        verify(cb).greaterThanOrEqualTo(eq(timestampPath), eq(LocalDate.of(2026, 3, 1).atStartOfDay()));
        verify(cb).lessThanOrEqualTo(eq(timestampPath), eq(LocalDate.of(2026, 3, 21).atTime(LocalTime.MAX)));
    }

    @Test
    @SuppressWarnings("unchecked")
    void buildSpecification_blankAndInvalidDateFilters_ignorePredicates() {
        Specification<AuditLog> specification = (Specification<AuditLog>) ReflectionTestUtils.invokeMethod(
                auditLogService,
                "buildSpecification",
                " ", "", null, "invalid", "also-invalid"
        );
        Root<AuditLog> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Predicate finalPredicate = mock(Predicate.class);

        when(cb.and(any(Predicate[].class))).thenReturn(finalPredicate);

        Predicate result = specification.toPredicate(root, query, cb);

        assertThat(result).isSameAs(finalPredicate);
        verify(root, never()).get(anyString());
    }

    @Test
    void getStats_aggregatesRepositoryMetrics() {
        when(auditLogRepository.count()).thenReturn(12L);
        when(auditLogRepository.countByActionTimestampBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(3L, 8L);
        when(auditLogRepository.countByActionTypeGrouped(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(
                        new Object[]{"LOGIN", 5L},
                        new Object[]{"UPDATE", 2L}
                ));
        when(auditLogRepository.countDailyBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(
                        new Object[]{LocalDate.of(2026, 3, 21), 4L}
                ));

        AuditLogStatsResponse response = auditLogService.getStats();

        assertThat(response.getTotalLogs()).isEqualTo(12);
        assertThat(response.getTodayLogs()).isEqualTo(3);
        assertThat(response.getThisWeekLogs()).isEqualTo(8);
        assertThat(response.getActionTypeCounts()).containsEntry("LOGIN", 5L);
        assertThat(response.getActionTypeCounts()).containsEntry("UPDATE", 2L);
        assertThat(response.getDailyCounts()).hasSize(1);
        assertThat(response.getDailyCounts().get(0).getDate()).isEqualTo("2026-03-21");
        assertThat(response.getDailyCounts().get(0).getCount()).isEqualTo(4L);
    }

    @Test
    void getStats_withNoData_returnsEmptyCollections() {
        when(auditLogRepository.count()).thenReturn(0L);
        when(auditLogRepository.countByActionTimestampBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(0L);
        when(auditLogRepository.countByActionTypeGrouped(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of());
        when(auditLogRepository.countDailyBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of());

        AuditLogStatsResponse response = auditLogService.getStats();

        assertThat(response.getTotalLogs()).isZero();
        assertThat(response.getTodayLogs()).isZero();
        assertThat(response.getThisWeekLogs()).isZero();
        assertThat(response.getActionTypeCounts()).isEmpty();
        assertThat(response.getDailyCounts()).isEmpty();
    }

    private AuditLog sampleAuditLog() {
        return AuditLog.builder()
                .logId(1L)
                .user(sampleUser())
                .actionType("LOGIN")
                .entityType("USER")
                .entityId(7)
                .description("Login successful")
                .ipAddress("127.0.0.1")
                .actionTimestamp(LocalDateTime.of(2026, 3, 21, 9, 30))
                .build();
    }

    private User sampleUser() {
        return User.builder()
                .userId(7)
                .username("admin")
                .passwordHash("hash")
                .fullName("System Admin")
                .role(UserRole.ADMIN)
                .build();
    }
}
