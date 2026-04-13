package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import vn.edu.fpt.doghandbook.backend.dto.request.ApprovalRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApprovalRecordResponse;
import vn.edu.fpt.doghandbook.backend.entity.*;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovalDecision;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.*;
import vn.edu.fpt.doghandbook.backend.service.impl.ApprovalServiceImpl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApprovalServiceImplTest {

    @Mock private ApprovalRecordRepository approvalRecordRepository;
    @Mock private UserRepository userRepository;
    @Mock private ContentRepository contentRepository;
    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private NutritionStandardRepository nutritionStandardRepository;
    @Mock private TrainingExerciseRepository trainingExerciseRepository;
    @Mock private TrainingRoadmapRepository trainingRoadmapRepository;
    @Mock private TrainingMethodRepository trainingMethodRepository;
    @Mock private DevelopmentStageRepository developmentStageRepository;
    @Mock private DiseaseRepository diseaseRepository;
    @Mock private MedicationRepository medicationRepository;
    @Mock private FirstAidGuideRepository firstAidGuideRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private ApprovalServiceImpl service;

    private User author;
    private User reviewer;
    private Content content;

    @BeforeEach
    void setUp() {
        author = User.builder().userId(1).username("editor01").fullName("Editor One")
                .role(UserRole.CONTENT_EDITOR).isActive(true).isDeleted(false).build();
        reviewer = User.builder().userId(2).username("reviewer01").fullName("Reviewer One")
                .role(UserRole.REVIEWER).isActive(true).isDeleted(false).build();

        content = Content.builder()
                .contentId(10)
                .title("Test Content")
                .status(ContentStatus.DRAFT)
                .author(author)
                .isDeleted(false)
                .build();
    }

    // ──────────────────── submitForReview ────────────────────

    @Test
    void submitForReview_draftContent_setsStatusToPending() {
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(1)).thenReturn(Optional.of(author));

        service.submitForReview(ApprovableEntityType.CONTENT, 10, 1);

        assertThat(content.getStatus()).isEqualTo(ContentStatus.PENDING);
        verify(contentRepository).save(content);
    }

    @Test
    void submitForReview_rejectedContent_setsStatusToPending() {
        content.setStatus(ContentStatus.REJECTED);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(1)).thenReturn(Optional.of(author));

        service.submitForReview(ApprovableEntityType.CONTENT, 10, 1);

        assertThat(content.getStatus()).isEqualTo(ContentStatus.PENDING);
    }

    @Test
    void submitForReview_pendingContent_throwsBadRequest() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        assertThatThrownBy(() -> service.submitForReview(ApprovableEntityType.CONTENT, 10, 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void submitForReview_approvedContent_throwsBadRequest() {
        content.setStatus(ContentStatus.APPROVED);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        assertThatThrownBy(() -> service.submitForReview(ApprovableEntityType.CONTENT, 10, 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void submitForReview_publishedContent_throwsBadRequest() {
        content.setStatus(ContentStatus.PUBLISHED);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        assertThatThrownBy(() -> service.submitForReview(ApprovableEntityType.CONTENT, 10, 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void submitForReview_contentNotFound_throwsResourceNotFound() {
        when(contentRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submitForReview(ApprovableEntityType.CONTENT, 999, 1))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void submitForReview_notifiesReviewerRole() {
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(1)).thenReturn(Optional.of(author));

        service.submitForReview(ApprovableEntityType.CONTENT, 10, 1);

        verify(notificationService).notifyRole(eq(UserRole.REVIEWER), eq(author), any(), anyString(), anyString(), anyString(), anyInt());
    }

    // ──────────────────── review ────────────────────

    @Test
    void review_approved_setsStatusToApproved() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));
        when(approvalRecordRepository.save(any(ApprovalRecord.class))).thenAnswer(inv -> {
            ApprovalRecord r = inv.getArgument(0);
            r.setApprovalId(100);
            return r;
        });

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("APPROVED");

        ApprovalRecordResponse result = service.review(ApprovableEntityType.CONTENT, 10, req, 2);

        assertThat(content.getStatus()).isEqualTo(ContentStatus.APPROVED);
        assertThat(result.getDecision()).isEqualTo("APPROVED");
    }

    @Test
    void review_rejected_setsStatusToRejected() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));
        when(approvalRecordRepository.save(any(ApprovalRecord.class))).thenAnswer(inv -> {
            ApprovalRecord r = inv.getArgument(0);
            r.setApprovalId(101);
            return r;
        });

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("REJECTED");
        req.setComments("Need improvements");

        ApprovalRecordResponse result = service.review(ApprovableEntityType.CONTENT, 10, req, 2);

        assertThat(content.getStatus()).isEqualTo(ContentStatus.REJECTED);
        assertThat(result.getDecision()).isEqualTo("REJECTED");
    }

    @Test
    void review_revisionRequested_setsStatusToRejected() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));
        when(approvalRecordRepository.save(any(ApprovalRecord.class))).thenAnswer(inv -> {
            ApprovalRecord r = inv.getArgument(0);
            r.setApprovalId(102);
            return r;
        });

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("REVISION_REQUESTED");
        req.setComments("Fix section 2");

        ApprovalRecordResponse result = service.review(ApprovableEntityType.CONTENT, 10, req, 2);

        assertThat(content.getStatus()).isEqualTo(ContentStatus.REJECTED);
        assertThat(result.getDecision()).isEqualTo("REVISION_REQUESTED");
    }

    @Test
    void review_notPending_throwsBadRequest() {
        content.setStatus(ContentStatus.DRAFT);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("APPROVED");

        assertThatThrownBy(() -> service.review(ApprovableEntityType.CONTENT, 10, req, 2))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void review_pendingDecision_throwsBadRequest() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("PENDING");

        assertThatThrownBy(() -> service.review(ApprovableEntityType.CONTENT, 10, req, 2))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void review_rejectedWithoutComments_throwsBadRequest() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("REJECTED");
        // no comments

        assertThatThrownBy(() -> service.review(ApprovableEntityType.CONTENT, 10, req, 2))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void review_revisionRequestedWithoutComments_throwsBadRequest() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("REVISION_REQUESTED");
        // no comments

        assertThatThrownBy(() -> service.review(ApprovableEntityType.CONTENT, 10, req, 2))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void review_nullDecision_throwsBadRequest() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        ApprovalRequest req = new ApprovalRequest();
        // no decision set

        assertThatThrownBy(() -> service.review(ApprovableEntityType.CONTENT, 10, req, 2))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void review_reviewerNotFound_throwsResourceNotFound() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(userRepository.findById(999)).thenReturn(Optional.empty());

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("APPROVED");

        assertThatThrownBy(() -> service.review(ApprovableEntityType.CONTENT, 10, req, 999))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void review_approved_notifiesAuthor() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));
        when(approvalRecordRepository.save(any(ApprovalRecord.class))).thenAnswer(inv -> {
            ApprovalRecord r = inv.getArgument(0);
            r.setApprovalId(103);
            return r;
        });

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("APPROVED");

        service.review(ApprovableEntityType.CONTENT, 10, req, 2);

        verify(notificationService).notifyUser(eq(author), eq(reviewer), any(), anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    void review_savesApprovalRecord() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));
        when(approvalRecordRepository.save(any(ApprovalRecord.class))).thenAnswer(inv -> {
            ApprovalRecord r = inv.getArgument(0);
            r.setApprovalId(104);
            return r;
        });

        ApprovalRequest req = new ApprovalRequest();
        req.setDecision("APPROVED");

        service.review(ApprovableEntityType.CONTENT, 10, req, 2);

        verify(approvalRecordRepository).save(any(ApprovalRecord.class));
    }

    @Test
    void review_usesActionFieldFallback() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));
        when(approvalRecordRepository.save(any(ApprovalRecord.class))).thenAnswer(inv -> {
            ApprovalRecord r = inv.getArgument(0);
            r.setApprovalId(105);
            return r;
        });

        ApprovalRequest req = new ApprovalRequest();
        req.setAction("APPROVED");  // using action instead of decision

        ApprovalRecordResponse result = service.review(ApprovableEntityType.CONTENT, 10, req, 2);

        assertThat(result.getDecision()).isEqualTo("APPROVED");
    }

    // ──────────────────── publish ────────────────────

    @Test
    void publish_approvedContent_setsStatusToPublished() {
        content.setStatus(ContentStatus.APPROVED);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(1)).thenReturn(Optional.of(author));

        service.publish(ApprovableEntityType.CONTENT, 10, 1);

        assertThat(content.getStatus()).isEqualTo(ContentStatus.PUBLISHED);
        assertThat(content.getPublishedAt()).isNotNull();
    }

    @Test
    void publish_notApproved_throwsBadRequest() {
        content.setStatus(ContentStatus.DRAFT);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        assertThatThrownBy(() -> service.publish(ApprovableEntityType.CONTENT, 10, 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void publish_pendingContent_throwsBadRequest() {
        content.setStatus(ContentStatus.PENDING);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        assertThatThrownBy(() -> service.publish(ApprovableEntityType.CONTENT, 10, 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void publish_contentNotFound_throwsResourceNotFound() {
        when(contentRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.publish(ApprovableEntityType.CONTENT, 999, 1))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void publish_notifiesTrainerRole() {
        content.setStatus(ContentStatus.APPROVED);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));

        service.publish(ApprovableEntityType.CONTENT, 10, 2);

        verify(notificationService).notifyRole(eq(UserRole.TRAINER), any(), any(), anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    void publish_notifiesAuthorIfDifferentFromSender() {
        content.setStatus(ContentStatus.APPROVED);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));

        service.publish(ApprovableEntityType.CONTENT, 10, 2);

        // author is userId=1, sender is userId=2 -> should notify author
        verify(notificationService).notifyUser(eq(author), eq(reviewer), any(), anyString(), anyString(), anyString(), anyInt());
    }

    // ──────────────────── unpublish ────────────────────

    @Test
    void unpublish_publishedContent_setsStatusToDraft() {
        content.setStatus(ContentStatus.PUBLISHED);
        content.setPublishedAt(LocalDateTime.now());
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));

        service.unpublish(ApprovableEntityType.CONTENT, 10, 2);

        assertThat(content.getStatus()).isEqualTo(ContentStatus.DRAFT);
        assertThat(content.getPublishedAt()).isNull();
    }

    @Test
    void unpublish_notPublished_throwsBadRequest() {
        content.setStatus(ContentStatus.APPROVED);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        assertThatThrownBy(() -> service.unpublish(ApprovableEntityType.CONTENT, 10, 2))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void unpublish_draftContent_throwsBadRequest() {
        content.setStatus(ContentStatus.DRAFT);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        assertThatThrownBy(() -> service.unpublish(ApprovableEntityType.CONTENT, 10, 2))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void unpublish_contentNotFound_throwsResourceNotFound() {
        when(contentRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.unpublish(ApprovableEntityType.CONTENT, 999, 2))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void unpublish_notifiesAuthor() {
        content.setStatus(ContentStatus.PUBLISHED);
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));
        when(contentRepository.save(any())).thenReturn(content);
        when(userRepository.findById(2)).thenReturn(Optional.of(reviewer));

        service.unpublish(ApprovableEntityType.CONTENT, 10, 2);

        verify(notificationService).notifyUser(eq(author), eq(reviewer), any(), anyString(), anyString(), anyString(), anyInt());
    }

    // ──────────────────── getApprovalHistory ────────────────────

    @Test
    void getApprovalHistory_returnsRecords() {
        ApprovalRecord record = ApprovalRecord.builder()
                .approvalId(1)
                .entityType(ApprovableEntityType.CONTENT)
                .entityId(10)
                .reviewer(reviewer)
                .decision(ApprovalDecision.APPROVED)
                .comments("Good work")
                .reviewedAt(LocalDateTime.of(2025, 1, 1, 10, 0))
                .build();
        when(approvalRecordRepository.findByEntityTypeAndEntityIdOrderByReviewedAtDesc(
                ApprovableEntityType.CONTENT, 10))
                .thenReturn(List.of(record));
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        List<ApprovalRecordResponse> result = service.getApprovalHistory(ApprovableEntityType.CONTENT, 10);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDecision()).isEqualTo("APPROVED");
        assertThat(result.get(0).getReviewerName()).isEqualTo("Reviewer One");
    }

    @Test
    void getApprovalHistory_emptyList_returnsEmpty() {
        when(approvalRecordRepository.findByEntityTypeAndEntityIdOrderByReviewedAtDesc(
                ApprovableEntityType.CONTENT, 99))
                .thenReturn(Collections.emptyList());

        List<ApprovalRecordResponse> result = service.getApprovalHistory(ApprovableEntityType.CONTENT, 99);

        assertThat(result).isEmpty();
    }

    @Test
    void getApprovalHistory_mapsFields() {
        ApprovalRecord record = ApprovalRecord.builder()
                .approvalId(2)
                .entityType(ApprovableEntityType.CONTENT)
                .entityId(10)
                .reviewer(reviewer)
                .decision(ApprovalDecision.REJECTED)
                .comments("Need changes")
                .reviewedAt(LocalDateTime.of(2025, 2, 1, 14, 0))
                .build();
        when(approvalRecordRepository.findByEntityTypeAndEntityIdOrderByReviewedAtDesc(
                ApprovableEntityType.CONTENT, 10))
                .thenReturn(List.of(record));
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        List<ApprovalRecordResponse> result = service.getApprovalHistory(ApprovableEntityType.CONTENT, 10);
        ApprovalRecordResponse resp = result.get(0);

        assertThat(resp.getApprovalId()).isEqualTo(2);
        assertThat(resp.getEntityType()).isEqualTo("CONTENT");
        assertThat(resp.getEntityId()).isEqualTo(10);
        assertThat(resp.getReviewerId()).isEqualTo(2);
        assertThat(resp.getComments()).isEqualTo("Need changes");
    }

    @Test
    void getApprovalHistory_multipleRecords_returnsAll() {
        ApprovalRecord r1 = ApprovalRecord.builder()
                .approvalId(1).entityType(ApprovableEntityType.CONTENT).entityId(10)
                .reviewer(reviewer).decision(ApprovalDecision.REJECTED)
                .comments("Fix it").reviewedAt(LocalDateTime.of(2025, 1, 1, 10, 0)).build();
        ApprovalRecord r2 = ApprovalRecord.builder()
                .approvalId(2).entityType(ApprovableEntityType.CONTENT).entityId(10)
                .reviewer(reviewer).decision(ApprovalDecision.APPROVED)
                .reviewedAt(LocalDateTime.of(2025, 1, 2, 10, 0)).build();
        when(approvalRecordRepository.findByEntityTypeAndEntityIdOrderByReviewedAtDesc(
                ApprovableEntityType.CONTENT, 10))
                .thenReturn(List.of(r2, r1));
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        List<ApprovalRecordResponse> result = service.getApprovalHistory(ApprovableEntityType.CONTENT, 10);

        assertThat(result).hasSize(2);
    }

    @Test
    void getApprovalHistory_nullReviewer_handlesGracefully() {
        ApprovalRecord record = ApprovalRecord.builder()
                .approvalId(3).entityType(ApprovableEntityType.CONTENT).entityId(10)
                .reviewer(null).decision(ApprovalDecision.APPROVED)
                .reviewedAt(LocalDateTime.of(2025, 1, 1, 10, 0)).build();
        when(approvalRecordRepository.findByEntityTypeAndEntityIdOrderByReviewedAtDesc(
                ApprovableEntityType.CONTENT, 10))
                .thenReturn(List.of(record));
        when(contentRepository.findById(10)).thenReturn(Optional.of(content));

        List<ApprovalRecordResponse> result = service.getApprovalHistory(ApprovableEntityType.CONTENT, 10);

        assertThat(result.get(0).getReviewerId()).isNull();
        assertThat(result.get(0).getReviewerName()).isNull();
    }

    // ──────────────────── getPendingReviews ────────────────────

    @Test
    void getPendingReviews_content_returnsPendingList() {
        Page<Content> page = new PageImpl<>(List.of(content));
        when(contentRepository.findByStatusAndIsDeletedFalse(eq(ContentStatus.PENDING), any(Pageable.class)))
                .thenReturn(page);

        List<Map<String, Object>> result = service.getPendingReviews(ApprovableEntityType.CONTENT, 0, 10);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("entityType")).isEqualTo("CONTENT");
        assertThat(result.get(0).get("status")).isEqualTo("PENDING");
    }

    @Test
    void getPendingReviews_emptyPage_returnsEmptyList() {
        Page<Content> page = new PageImpl<>(Collections.emptyList());
        when(contentRepository.findByStatusAndIsDeletedFalse(eq(ContentStatus.PENDING), any(Pageable.class)))
                .thenReturn(page);

        List<Map<String, Object>> result = service.getPendingReviews(ApprovableEntityType.CONTENT, 0, 10);

        assertThat(result).isEmpty();
    }

    @Test
    void getPendingReviews_dogProfile_throwsBadRequest() {
        assertThatThrownBy(() -> service.getPendingReviews(ApprovableEntityType.DOG_PROFILE, 0, 10))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getPendingReviews_content_mapsEntityId() {
        Page<Content> page = new PageImpl<>(List.of(content));
        when(contentRepository.findByStatusAndIsDeletedFalse(eq(ContentStatus.PENDING), any(Pageable.class)))
                .thenReturn(page);

        List<Map<String, Object>> result = service.getPendingReviews(ApprovableEntityType.CONTENT, 0, 10);

        assertThat(result.get(0).get("entityId")).isEqualTo(10);
    }

    @Test
    void getPendingReviews_content_mapsTitle() {
        Page<Content> page = new PageImpl<>(List.of(content));
        when(contentRepository.findByStatusAndIsDeletedFalse(eq(ContentStatus.PENDING), any(Pageable.class)))
                .thenReturn(page);

        List<Map<String, Object>> result = service.getPendingReviews(ApprovableEntityType.CONTENT, 0, 10);

        assertThat(result.get(0).get("title")).isEqualTo("Test Content");
    }
}
