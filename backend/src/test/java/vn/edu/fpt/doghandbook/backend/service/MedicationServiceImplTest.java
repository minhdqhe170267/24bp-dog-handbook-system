package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import vn.edu.fpt.doghandbook.backend.dto.request.MedicationRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.MedicationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.Medication;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.MedicationServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MedicationServiceImplTest {

    @Mock private MedicationRepository medicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private CloudinaryService cloudinaryService;

    @InjectMocks
    private MedicationServiceImpl service;

    private User editor;

    @BeforeEach
    void setUp() {
        editor = User.builder()
                .userId(1)
                .username("editor")
                .fullName("Editor")
                .passwordHash("hash")
                .role(UserRole.CONTENT_EDITOR)
                .build();
    }

    @Test
    void getAll_withSearchAndStatus_returnsMappedPage() {
        Medication medication = Medication.builder()
                .medicationId(1)
                .medicationName("Amoxicillin")
                .description("Antibiotic")
                .dosageInstructions("10mg/kg")
                .status(ContentStatus.PUBLISHED)
                .createdBy(editor)
                .build();

        when(medicationRepository.findByMedicationNameContainingIgnoreCaseAndStatusAndIsDeletedFalse(
                "Amox",
                ContentStatus.PUBLISHED,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))))
                .thenReturn(new PageImpl<>(List.of(medication), PageRequest.of(0, 10), 1));

        PageResponse<MedicationResponse> response = service.getAll(0, 10, "Amox", "PUBLISHED");

        assertThat(response.getTotalElements()).isEqualTo(1);
        assertThat(response.getContent()).hasSize(1);
        MedicationResponse item = (MedicationResponse) response.getContent().get(0);
        assertThat(item.getMedicationName()).isEqualTo("Amoxicillin");
        assertThat(item.getDescription()).isEqualTo("Antibiotic");
        assertThat(item.getStatus()).isEqualTo("PUBLISHED");
        assertThat(item.getCreatedByName()).isEqualTo("Editor");
    }

    @Test
    void getAll_invalidStatus_throwsBadRequestException() {
        assertThatThrownBy(() -> service.getAll(0, 10, null, "UNKNOWN"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid medication status");
    }

    @Test
    void getById_existingMedication_returnsResponse() {
        Medication medication = Medication.builder()
                .medicationId(3)
                .medicationName("Ketamine")
                .description("Sedative")
                .dosageInstructions("As directed")
                .administrationMethod("Injection")
                .status(ContentStatus.DRAFT)
                .createdBy(editor)
                .build();

        when(medicationRepository.findByMedicationIdAndIsDeletedFalse(3)).thenReturn(Optional.of(medication));

        MedicationResponse response = service.getById(3);

        assertThat(response.getMedicationId()).isEqualTo(3);
        assertThat(response.getMedicationName()).isEqualTo("Ketamine");
        assertThat(response.getAdministrationMethod()).isEqualTo("Injection");
        assertThat(response.getCreatedByName()).isEqualTo("Editor");
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(medicationRepository.findByMedicationIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void create_duplicateName_throwsConflictException() {
        MedicationRequest request = new MedicationRequest();
        request.setMedicationName("Amoxicillin");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(medicationRepository.existsByMedicationNameIgnoreCaseAndIsDeletedFalse("Amoxicillin")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request, 1, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("same name");
    }

    @Test
    void create_withPublishedStatusStillStartsAsDraft() {
        MedicationRequest request = new MedicationRequest();
        request.setMedicationName("Ketamine");
        request.setStatus("PUBLISHED");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(medicationRepository.existsByMedicationNameIgnoreCaseAndIsDeletedFalse("Ketamine")).thenReturn(false);
        when(medicationRepository.save(any(Medication.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MedicationResponse response = service.create(request, 1, null);

        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void create_validRequest_trimsFieldsAndReturnsSavedMedication() {
        MedicationRequest request = new MedicationRequest();
        request.setMedicationName("  Vitamin C  ");
        request.setDescription("  Supportive treatment ");
        request.setDosageInstructions(" 1 tablet daily ");
        request.setAdministrationMethod(" Oral ");
        request.setSideEffects(" Mild upset stomach ");
        request.setContraindications(" None ");
        request.setStorageRequirements(" Room temperature ");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(medicationRepository.existsByMedicationNameIgnoreCaseAndIsDeletedFalse("Vitamin C")).thenReturn(false);
        when(medicationRepository.save(any(Medication.class))).thenAnswer(invocation -> {
            Medication saved = invocation.getArgument(0);
            saved.setMedicationId(8);
            saved.setCreatedAt(LocalDateTime.of(2026, 4, 7, 10, 0));
            return saved;
        });

        MedicationResponse response = service.create(request, 1, null);

        assertThat(response.getMedicationId()).isEqualTo(8);
        assertThat(response.getMedicationName()).isEqualTo("Vitamin C");
        assertThat(response.getDescription()).isEqualTo("Supportive treatment");
        assertThat(response.getDosageInstructions()).isEqualTo("1 tablet daily");
        assertThat(response.getCreatedByName()).isEqualTo("Editor");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void update_rejectedMedication_resetsStatusToDraft() {
        Medication medication = Medication.builder()
                .medicationId(9)
                .medicationName("Old name")
                .status(ContentStatus.REJECTED)
                .isDeleted(false)
                .build();

        MedicationRequest request = new MedicationRequest();
        request.setMedicationName("New name");
        request.setDescription("Updated");

        when(medicationRepository.findByMedicationIdAndIsDeletedFalse(9)).thenReturn(Optional.of(medication));
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(medicationRepository.existsByMedicationNameIgnoreCaseAndMedicationIdNotAndIsDeletedFalse("New name", 9))
                .thenReturn(false);
        when(medicationRepository.save(any(Medication.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MedicationResponse response = service.update(9, request, 1, null);

        assertThat(response.getMedicationName()).isEqualTo("New name");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void update_duplicateName_throwsConflictException() {
        Medication medication = Medication.builder()
                .medicationId(10)
                .medicationName("Existing")
                .status(ContentStatus.DRAFT)
                .isDeleted(false)
                .build();
        MedicationRequest request = new MedicationRequest();
        request.setMedicationName("Duplicate");

        when(medicationRepository.findByMedicationIdAndIsDeletedFalse(10)).thenReturn(Optional.of(medication));
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(medicationRepository.existsByMedicationNameIgnoreCaseAndMedicationIdNotAndIsDeletedFalse("Duplicate", 10))
                .thenReturn(true);

        assertThatThrownBy(() -> service.update(10, request, 1, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("same name");
    }

    @Test
    void delete_publishedMedication_throwsBadRequestException() {
        Medication medication = Medication.builder()
                .medicationId(5)
                .medicationName("Vitamin C")
                .status(ContentStatus.PUBLISHED)
                .isDeleted(false)
                .build();

        when(medicationRepository.findByMedicationIdAndIsDeletedFalse(5)).thenReturn(Optional.of(medication));

        assertThatThrownBy(() -> service.delete(5))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("xuất bản");
    }

    @Test
    void delete_draftMedication_softDeletesMedication() {
        Medication medication = Medication.builder()
                .medicationId(7)
                .medicationName("Vitamin C")
                .status(ContentStatus.DRAFT)
                .isDeleted(false)
                .build();

        when(medicationRepository.findByMedicationIdAndIsDeletedFalse(7)).thenReturn(Optional.of(medication));
        when(medicationRepository.save(any(Medication.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(7);

        assertThat(medication.getIsDeleted()).isTrue();
        assertThat(medication.getDeletedAt()).isNotNull();
        verify(medicationRepository).save(medication);
    }
}
