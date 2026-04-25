package vn.edu.fpt.doghandbook.backend.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import vn.edu.fpt.doghandbook.backend.aspect.AuditAspect;
import vn.edu.fpt.doghandbook.backend.entity.enums.AuditActionType;
import vn.edu.fpt.doghandbook.backend.service.AuditLogService;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;

@SpringJUnitConfig(classes = AuditAspectContextTest.TestConfig.class)
class AuditAspectContextTest {

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private AuditAspectFixtureServiceImpl fixtureService;

    @BeforeEach
    void setUp() {
        reset(auditLogService);
    }

    @Test
    void createMethod_isInterceptedByAspect() {
        fixtureService.createFixture(11);

        verify(auditLogService).log(
                eq(AuditActionType.CREATE),
                eq("AUDIT_ASPECT_FIXTURE"),
                eq(11),
                contains("createFixture")
        );
    }

    @Test
    void updateMethod_isInterceptedByAspect() {
        fixtureService.updateFixture(12);

        verify(auditLogService).log(
                eq(AuditActionType.UPDATE),
                eq("AUDIT_ASPECT_FIXTURE"),
                eq(12),
                contains("updateFixture")
        );
    }

    @Test
    void deleteMethod_isInterceptedByAspect() {
        fixtureService.deleteFixture(13);

        verify(auditLogService).log(
                eq(AuditActionType.DELETE),
                eq("AUDIT_ASPECT_FIXTURE"),
                eq(13),
                contains("deleteFixture")
        );
    }

    @Test
    void createMethodWithoutNumericId_logsNullEntityId() {
        fixtureService.createFixtureWithoutId("no-id");

        verify(auditLogService).log(
                eq(AuditActionType.CREATE),
                eq("AUDIT_ASPECT_FIXTURE"),
                isNull(),
                contains("createFixtureWithoutId")
        );
    }

    @Configuration
    @EnableAspectJAutoProxy
    static class TestConfig {

        @Bean
        AuditLogService auditLogService() {
            return mock(AuditLogService.class);
        }

        @Bean
        AuditAspect auditAspect(AuditLogService auditLogService) {
            return new AuditAspect(auditLogService);
        }

        @Bean
        AuditAspectFixtureServiceImpl fixtureService() {
            return new AuditAspectFixtureServiceImpl();
        }
    }
}
