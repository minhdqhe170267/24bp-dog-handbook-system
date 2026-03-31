package vn.edu.fpt.doghandbook.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogExerciseProgress;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.DogTrainingEnrollment;
import vn.edu.fpt.doghandbook.backend.entity.RoadmapExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingMethod;
import vn.edu.fpt.doghandbook.backend.entity.TrainingPhase;
import vn.edu.fpt.doghandbook.backend.entity.TrainingRoadmap;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentScope;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.EnrollmentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SizeClassification;
import vn.edu.fpt.doghandbook.backend.entity.enums.TrainabilityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogExerciseProgressRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogTrainingEnrollmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.RoadmapExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingPhaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "123456";
    private static final LocalDate BASE_DATE = LocalDate.of(2026, 1, 1);
    private static final LocalDateTime BASE_TIME = LocalDateTime.of(2026, 1, 1, 8, 0);
    private static final Set<ExerciseProgressStatus> DONE_STATUSES =
            EnumSet.of(ExerciseProgressStatus.COMPLETED, ExerciseProgressStatus.SKIPPED);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DogBreedRepository dogBreedRepository;
    private final DogProfileRepository dogProfileRepository;
    private final DogAssignmentRepository dogAssignmentRepository;
    private final TrainingMethodRepository trainingMethodRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final TrainingRoadmapRepository trainingRoadmapRepository;
    private final TrainingPhaseRepository trainingPhaseRepository;
    private final RoadmapExerciseRepository roadmapExerciseRepository;
    private final DogTrainingEnrollmentRepository dogTrainingEnrollmentRepository;
    private final DogExerciseProgressRepository dogExerciseProgressRepository;

    @Override
    @Transactional
    public void run(String... args) {
        resetExistingPasswords();

        User admin = ensureTestUser("admin01", "admin123", UserRole.ADMIN, "Admin He Thong", null, null);
        ensureTestUser("editor01", "editor123", UserRole.CONTENT_EDITOR, "Bien tap vien Tran Van Phong", null, null);
        ensureTestUser("reviewer01", "reviewer123", UserRole.REVIEWER, "Phan bien Le Thi Hoa", null, null);
        User trainer = ensureTestUser(
                "trainer01",
                "trainer123",
                UserRole.TRAINER,
                "Nguyen Van Kien",
                "Trung uy",
                "Tieu doan 24"
        );

        seedTrainingDemo(admin, trainer);
    }

    private void resetExistingPasswords() {
        Map<String, String> mockUsers = Map.of(
                "admin.dhs", DEFAULT_PASSWORD,
                "trainer.minh", DEFAULT_PASSWORD,
                "trainer.huong", DEFAULT_PASSWORD,
                "trainer.duc", DEFAULT_PASSWORD,
                "editor.lan", DEFAULT_PASSWORD,
                "editor.tuan", DEFAULT_PASSWORD,
                "reviewer.hung", DEFAULT_PASSWORD
        );

        String encodedDefault = passwordEncoder.encode(DEFAULT_PASSWORD);
        int updated = 0;

        for (String username : mockUsers.keySet()) {
            Optional<User> opt = userRepository.findByUsername(username);
            if (opt.isPresent()) {
                User user = opt.get();
                if (!passwordEncoder.matches(DEFAULT_PASSWORD, user.getPasswordHash())) {
                    user.setPasswordHash(encodedDefault);
                    user.setFailedLoginCount(0);
                    user.setIsLocked(false);
                    userRepository.save(user);
                    updated++;
                }
            }
        }

        if (updated > 0) {
            log.info("Reset default password for {} existing mock users", updated);
        }
    }

    private User ensureTestUser(String username, String password, UserRole role,
                                String fullName, String militaryRank, String unit) {
        User user = userRepository.findByUsername(username).orElseGet(User::new);
        user.setUsername(username);
        if (user.getUserId() == null) {
            user.setPasswordHash(passwordEncoder.encode(password));
        }
        user.setRole(role);
        user.setFullName(fullName);
        user.setMilitaryRank(militaryRank);
        user.setUnit(unit);
        user.setIsActive(true);
        user.setIsLocked(false);
        user.setFailedLoginCount(0);
        user.setIsDeleted(false);
        return userRepository.save(user);
    }

    private void seedTrainingDemo(User admin, User trainer) {
        DogBreed malinois = ensureBreed(admin);

        DogProfile atlas = ensureDog("DHS-SEED-001", "Atlas", malinois, DogGender.MALE, 31.5, "Black Tan");
        DogProfile bora = ensureDog("DHS-SEED-002", "Bora", malinois, DogGender.FEMALE, 28.2, "Fawn");
        DogProfile kilo = ensureDog("DHS-SEED-003", "Kilo", malinois, DogGender.MALE, 33.4, "Mahogany");
        DogProfile misa = ensureDog("DHS-SEED-004", "Misa", malinois, DogGender.FEMALE, 27.8, "Sable");

        ensurePrimaryAssignment(trainer, atlas);
        ensurePrimaryAssignment(trainer, bora);
        ensurePrimaryAssignment(trainer, kilo);
        ensurePrimaryAssignment(trainer, misa);

        TrainingMethod rewardShaping = ensureMethod(
                "Reward Shaping",
                "Build behavior through marker timing and reward repetition.",
                admin
        );
        TrainingMethod markerConditioning = ensureMethod(
                "Marker Conditioning",
                "Stabilize command-response associations before stress drills.",
                admin
        );

        Map<String, TrainingExercise> exercises = new LinkedHashMap<>();
        exercises.put("Heel Position", ensureExercise("Heel Position", rewardShaping, DifficultyLevel.BASIC, 15, admin));
        exercises.put("Sit and Stay", ensureExercise("Sit and Stay", markerConditioning, DifficultyLevel.BASIC, 20, admin));
        exercises.put("Immediate Recall", ensureExercise("Immediate Recall", rewardShaping, DifficultyLevel.BASIC, 15, admin));
        exercises.put("Leash Turns", ensureExercise("Leash Turns", rewardShaping, DifficultyLevel.INTERMEDIATE, 20, admin));
        exercises.put("Obstacle Crossing", ensureExercise("Obstacle Crossing", markerConditioning, DifficultyLevel.INTERMEDIATE, 25, admin));
        exercises.put("Area Patrol", ensureExercise("Area Patrol", rewardShaping, DifficultyLevel.ADVANCED, 30, admin));
        exercises.put("Vehicle Approach", ensureExercise("Vehicle Approach", markerConditioning, DifficultyLevel.INTERMEDIATE, 25, admin));
        exercises.put("Evidence Scent Intro", ensureExercise("Evidence Scent Intro", rewardShaping, DifficultyLevel.BASIC, 20, admin));
        exercises.put("Target Indication", ensureExercise("Target Indication", markerConditioning, DifficultyLevel.INTERMEDIATE, 20, admin));
        exercises.put("Search Pattern Discipline", ensureExercise("Search Pattern Discipline", rewardShaping, DifficultyLevel.ADVANCED, 35, admin));

        TrainingRoadmap basicProgram = ensureProgram(
                "Canh khuyen co ban",
                malinois,
                "Basic obedience",
                "Entry program for discipline, response speed, and trainer bonding.",
                8,
                admin,
                List.of(
                        new PhaseSeed("Lenh co ban", 1, 4, "Solidify baseline commands.", "Stable command response.", List.of(
                                "Sit and Stay", "Immediate Recall", "Heel Position"
                        )),
                        new PhaseSeed("Di chuyen va vat can", 2, 4, "Maintain control while moving.", "Controlled movement in drill lane.", List.of(
                                "Leash Turns", "Obstacle Crossing"
                        ))
                ),
                exercises
        );

        TrainingRoadmap patrolProgram = ensureProgram(
                "Tuan tra co dong",
                malinois,
                "Patrol support",
                "Intermediate patrol flow with movement discipline and area coverage.",
                10,
                admin,
                List.of(
                        new PhaseSeed("Tiep can muc tieu", 1, 5, "Approach safely under command.", "Clean approach sequence.", List.of(
                                "Heel Position", "Vehicle Approach"
                        )),
                        new PhaseSeed("Kiem soat khu vuc", 2, 5, "Patrol lanes and search rhythm.", "Stable patrol tempo.", List.of(
                                "Area Patrol", "Search Pattern Discipline", "Obstacle Crossing"
                        ))
                ),
                exercises
        );

        TrainingRoadmap detectionProgram = ensureProgram(
                "Phat hien vat chung",
                malinois,
                "Evidence detection",
                "Detection-oriented program with source recognition and indication.",
                9,
                admin,
                List.of(
                        new PhaseSeed("Nhan mui co ban", 1, 4, "Associate target odor with reward.", "Reliable odor engagement.", List.of(
                                "Evidence Scent Intro", "Target Indication"
                        )),
                        new PhaseSeed("Tim kiem co he thong", 2, 5, "Follow systematic search patterns.", "Consistent area coverage.", List.of(
                                "Search Pattern Discipline", "Area Patrol"
                        ))
                ),
                exercises
        );

        TrainingRoadmap supportProgram = ensureProgram(
                "Ho tro truy vet",
                malinois,
                "Support tracking",
                "Support program for interrupted sessions and controlled recovery.",
                6,
                admin,
                List.of(
                        new PhaseSeed("On dinh nhan lenh", 1, 3, "Reset focus under light distraction.", "Responds to handler within one cue.", List.of(
                                "Sit and Stay", "Heel Position"
                        )),
                        new PhaseSeed("Phoi hop tim kiem", 2, 3, "Hold discipline during assisted sweep.", "Maintains handler line and indication.", List.of(
                                "Target Indication", "Search Pattern Discipline"
                        ))
                ),
                exercises
        );

        ensureEnrollmentScenario(atlas, basicProgram, trainer, EnrollmentScenario.COMPLETED);
        ensureEnrollmentScenario(bora, patrolProgram, trainer, EnrollmentScenario.IN_PROGRESS);
        ensureEnrollmentScenario(kilo, detectionProgram, trainer, EnrollmentScenario.NOT_STARTED);
        ensureEnrollmentScenario(misa, supportProgram, trainer, EnrollmentScenario.SUSPENDED);

        log.info("Seeded training demo data: 4 dogs, 4 enrollments, multi-phase roadmaps, and exercise progress.");
    }

    private DogBreed ensureBreed(User admin) {
        DogBreed breed = dogBreedRepository.findByBreedNameAndIsDeletedFalse("Belgian Malinois").orElseGet(DogBreed::new);
        breed.setBreedName("Belgian Malinois");
        breed.setOrigin("Belgium");
        breed.setDescription("Working breed used for patrol, detection, and tactical response.");
        breed.setSizeClassification(SizeClassification.LARGE);
        breed.setWeightMaleMinKg(BigDecimal.valueOf(28));
        breed.setWeightMaleMaxKg(BigDecimal.valueOf(34));
        breed.setWeightFemaleMinKg(BigDecimal.valueOf(20));
        breed.setWeightFemaleMaxKg(BigDecimal.valueOf(26));
        breed.setAvgHeightCm(BigDecimal.valueOf(62));
        breed.setLifespanYears("12-14");
        breed.setTrainabilityLevel(TrainabilityLevel.VERY_HIGH);
        breed.setOperationalCapabilities("patrol,detection,tracking");
        breed.setStatus(ContentStatus.PUBLISHED);
        breed.setPublishedAt(BASE_TIME);
        breed.setCreatedBy(admin);
        breed.setIsDeleted(false);
        breed.setDeletedAt(null);
        return dogBreedRepository.save(breed);
    }

    private DogProfile ensureDog(String dogCode, String dogName, DogBreed breed, DogGender gender,
                                 double weightKg, String color) {
        DogProfile dog = dogProfileRepository.findByDogCode(dogCode).orElseGet(DogProfile::new);
        dog.setDogCode(dogCode);
        dog.setDogName(dogName);
        dog.setDogBreed(breed);
        dog.setBirthDate(BASE_DATE.minusYears(3));
        dog.setGender(gender);
        dog.setCurrentWeightKg(BigDecimal.valueOf(weightKg));
        dog.setHeightCm(BigDecimal.valueOf(61));
        dog.setColor(color);
        dog.setMicrochipId("MC-" + dogCode);
        dog.setStatus(DogStatus.ACTIVE);
        dog.setAssignmentDate(BASE_DATE.minusMonths(2));
        dog.setIsSterilized(false);
        dog.setNotes("Seeded training dog for roadmap enrollment demos.");
        dog.setIsDeleted(false);
        dog.setDeletedAt(null);
        return dogProfileRepository.save(dog);
    }

    private void ensurePrimaryAssignment(User trainer, DogProfile dog) {
        DogAssignment assignment = dogAssignmentRepository.findByDogProfileDogId(dog.getDogId()).stream()
                .filter(item -> item.getTrainer().getUserId().equals(trainer.getUserId()))
                .findFirst()
                .orElseGet(DogAssignment::new);
        assignment.setTrainer(trainer);
        assignment.setDogProfile(dog);
        assignment.setAssignmentType(AssignmentType.PRIMARY);
        assignment.setAssignmentScope(AssignmentScope.FULL_TRAINING);
        assignment.setStartDate(BASE_DATE.minusDays(45));
        assignment.setEndDate(null);
        assignment.setIsActive(true);
        assignment.setNotes("Seeded primary trainer assignment for enrollment demos.");
        dogAssignmentRepository.save(assignment);
    }

    private TrainingMethod ensureMethod(String methodName, String description, User admin) {
        TrainingMethod method = trainingMethodRepository.findByMethodNameIgnoreCaseAndIsDeletedFalse(methodName)
                .orElseGet(TrainingMethod::new);
        method.setMethodName(methodName);
        method.setDescription(description);
        method.setAdvantages("Fast feedback loop for handler and dog.");
        method.setDisadvantages("Requires timing consistency from trainer.");
        method.setInstructions("Use short command cycles, immediate marker, and repeatable rewards.");
        method.setStatus(ContentStatus.PUBLISHED);
        method.setPublishedAt(BASE_TIME);
        method.setCreatedBy(admin);
        method.setIsDeleted(false);
        method.setDeletedAt(null);
        return trainingMethodRepository.save(method);
    }

    private TrainingExercise ensureExercise(String exerciseName, TrainingMethod method,
                                            DifficultyLevel level, int durationMinutes, User admin) {
        TrainingExercise exercise = trainingExerciseRepository.findByExerciseNameIgnoreCaseAndIsDeletedFalse(exerciseName)
                .orElseGet(TrainingExercise::new);
        exercise.setExerciseName(exerciseName);
        exercise.setDescription("Seeded exercise used by enrollment progress demos.");
        exercise.setDifficultyLevel(level);
        exercise.setTrainingMethod(method);
        exercise.setInstructions("Warm up, execute command chain, record handler observation.");
        exercise.setDurationMinutes(durationMinutes);
        exercise.setSafetyPrecautions("Use lead control and clear drill lane before execution.");
        exercise.setRequiredEquipment("Lead, reward pouch, marker.");
        exercise.setStatus(ContentStatus.PUBLISHED);
        exercise.setPublishedAt(BASE_TIME);
        exercise.setCreatedBy(admin);
        exercise.setIsDeleted(false);
        exercise.setDeletedAt(null);
        return trainingExerciseRepository.save(exercise);
    }

    private TrainingRoadmap ensureProgram(String roadmapName, DogBreed breed, String targetRole,
                                          String description, int totalDurationWeeks, User admin,
                                          List<PhaseSeed> phaseSeeds, Map<String, TrainingExercise> exercises) {
        TrainingRoadmap roadmap = trainingRoadmapRepository.findByRoadmapNameIgnoreCaseAndIsDeletedFalse(roadmapName)
                .orElseGet(TrainingRoadmap::new);
        roadmap.setRoadmapName(roadmapName);
        roadmap.setDogBreed(breed);
        roadmap.setTargetRole(targetRole);
        roadmap.setDescription(description);
        roadmap.setTotalDurationWeeks(totalDurationWeeks);
        roadmap.setStatus(ContentStatus.PUBLISHED);
        roadmap.setPublishedAt(BASE_TIME);
        roadmap.setCreatedBy(admin);
        roadmap.setIsDeleted(false);
        roadmap.setDeletedAt(null);
        TrainingRoadmap savedRoadmap = trainingRoadmapRepository.save(roadmap);

        Map<String, TrainingPhase> existingPhases = new LinkedHashMap<>();
        for (TrainingPhase phase : trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(savedRoadmap.getRoadmapId())) {
            existingPhases.put(normalizeKey(phase.getPhaseName()), phase);
        }

        for (PhaseSeed phaseSeed : phaseSeeds) {
            TrainingPhase phase = existingPhases.getOrDefault(normalizeKey(phaseSeed.phaseName()), new TrainingPhase());
            phase.setTrainingRoadmap(savedRoadmap);
            phase.setRoadmapName(savedRoadmap.getRoadmapName());
            phase.setTargetRole(savedRoadmap.getTargetRole());
            phase.setDescription(savedRoadmap.getDescription());
            phase.setTotalDurationWeeks(savedRoadmap.getTotalDurationWeeks());
            phase.setPhaseName(phaseSeed.phaseName());
            phase.setPhaseOrder(phaseSeed.phaseOrder());
            phase.setPhaseDurationWeeks(phaseSeed.durationWeeks());
            phase.setPhaseObjectives(phaseSeed.objectives());
            phase.setAssessmentCriteria(phaseSeed.assessmentCriteria());
            phase.setStatus(ContentStatus.PUBLISHED);
            phase.setPublishedAt(BASE_TIME);
            phase.setIsDeleted(false);
            phase.setDeletedAt(null);
            TrainingPhase savedPhase = trainingPhaseRepository.save(phase);
            ensureRoadmapExercises(savedPhase, phaseSeed.exerciseNames(), exercises);
        }

        return savedRoadmap;
    }

    private void ensureRoadmapExercises(TrainingPhase phase, List<String> exerciseNames,
                                        Map<String, TrainingExercise> exercises) {
        Map<Integer, RoadmapExercise> existing = new LinkedHashMap<>();
        for (RoadmapExercise roadmapExercise :
                roadmapExerciseRepository.findByTrainingPhasePhaseIdOrderByExerciseOrder(phase.getPhaseId())) {
            existing.put(roadmapExercise.getTrainingExercise().getExerciseId(), roadmapExercise);
        }

        for (int i = 0; i < exerciseNames.size(); i++) {
            TrainingExercise exercise = exercises.get(exerciseNames.get(i));
            RoadmapExercise roadmapExercise = existing.getOrDefault(exercise.getExerciseId(), new RoadmapExercise());
            roadmapExercise.setTrainingPhase(phase);
            roadmapExercise.setTrainingExercise(exercise);
            roadmapExercise.setExerciseOrder(i + 1);
            roadmapExercise.setIsMandatory(true);
            roadmapExerciseRepository.save(roadmapExercise);
        }
    }

    private void ensureEnrollmentScenario(DogProfile dog, TrainingRoadmap roadmap, User trainer,
                                          EnrollmentScenario scenario) {
        DogTrainingEnrollment enrollment = dogTrainingEnrollmentRepository
                .findByDogProfileDogIdAndTrainingRoadmapRoadmapIdAndIsDeletedFalse(dog.getDogId(), roadmap.getRoadmapId())
                .orElseGet(DogTrainingEnrollment::new);
        enrollment.setDogProfile(dog);
        enrollment.setTrainingRoadmap(roadmap);
        enrollment.setAssignedTrainer(trainer);
        enrollment.setNotes(scenario.notes);
        enrollment.setEnrolledAt(BASE_TIME.minusDays(scenario.enrolledDaysAgo));
        enrollment.setStatus(scenario.status);
        enrollment.setIsDeleted(false);
        enrollment.setDeletedAt(null);
        DogTrainingEnrollment savedEnrollment = dogTrainingEnrollmentRepository.save(enrollment);

        List<RoadmapExercise> roadmapExercises = roadmapExerciseRepository
                .findByRoadmapRoadmapIdOrderByPhaseOrderAndExerciseOrder(roadmap.getRoadmapId());
        Map<Integer, DogExerciseProgress> existing = new LinkedHashMap<>();
        for (DogExerciseProgress progress : dogExerciseProgressRepository
                .findByEnrollmentIdWithDetails(savedEnrollment.getEnrollmentId())) {
            existing.put(progress.getRoadmapExercise().getRoadmapExerciseId(), progress);
        }

        int doneTarget = scenario == EnrollmentScenario.IN_PROGRESS
                ? (int) Math.floor(roadmapExercises.size() * 0.6d)
                : scenario.doneCount;

        for (int i = 0; i < roadmapExercises.size(); i++) {
            RoadmapExercise roadmapExercise = roadmapExercises.get(i);
            DogExerciseProgress progress = existing.getOrDefault(
                    roadmapExercise.getRoadmapExerciseId(),
                    DogExerciseProgress.builder()
                            .enrollment(savedEnrollment)
                            .roadmapExercise(roadmapExercise)
                            .build()
            );
            ExerciseProgressStatus progressStatus = resolveProgressStatus(scenario, i, doneTarget);
            progress.setEnrollment(savedEnrollment);
            progress.setRoadmapExercise(roadmapExercise);
            progress.setStatus(progressStatus);
            progress.setTrainerNotes(resolveProgressNote(scenario, progressStatus));
            progress.setScore(resolveScore(progressStatus, i));
            progress.setEvaluatedBy(progressStatus == ExerciseProgressStatus.NOT_STARTED ? null : trainer);
            progress.setStartedAt(progressStatus == ExerciseProgressStatus.NOT_STARTED
                    ? null
                    : BASE_TIME.minusDays(scenario.enrolledDaysAgo - i));
            progress.setCompletedAt(DONE_STATUSES.contains(progressStatus)
                    ? BASE_TIME.minusDays(Math.max(1, scenario.enrolledDaysAgo - i - 1))
                    : null);
            dogExerciseProgressRepository.save(progress);
        }

        List<TrainingPhase> phases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(roadmap.getRoadmapId());
        savedEnrollment.setCurrentPhase(resolveCurrentPhase(phases, roadmapExercises, scenario, doneTarget));
        savedEnrollment.setCompletedAt(scenario.status == EnrollmentStatus.COMPLETED
                ? BASE_TIME.minusDays(1)
                : null);
        dogTrainingEnrollmentRepository.save(savedEnrollment);
    }

    private ExerciseProgressStatus resolveProgressStatus(EnrollmentScenario scenario, int index, int doneTarget) {
        if (scenario == EnrollmentScenario.COMPLETED) {
            return index == scenario.doneCount - 1 ? ExerciseProgressStatus.SKIPPED : ExerciseProgressStatus.COMPLETED;
        }
        if (scenario == EnrollmentScenario.IN_PROGRESS) {
            if (index < doneTarget) {
                return ExerciseProgressStatus.COMPLETED;
            }
            return index == doneTarget ? ExerciseProgressStatus.IN_PROGRESS : ExerciseProgressStatus.NOT_STARTED;
        }
        if (scenario == EnrollmentScenario.SUSPENDED) {
            if (index < 2) {
                return ExerciseProgressStatus.COMPLETED;
            }
            return index == 2 ? ExerciseProgressStatus.SKIPPED : ExerciseProgressStatus.NOT_STARTED;
        }
        return ExerciseProgressStatus.NOT_STARTED;
    }

    private String resolveProgressNote(EnrollmentScenario scenario, ExerciseProgressStatus status) {
        if (status == ExerciseProgressStatus.NOT_STARTED) {
            return null;
        }
        if (status == ExerciseProgressStatus.IN_PROGRESS) {
            return "Handler session is underway and waiting for final evaluation.";
        }
        if (scenario == EnrollmentScenario.SUSPENDED) {
            return "Scenario seeded as interrupted training plan.";
        }
        return "Scenario seeded for enrollment progress demo.";
    }

    private BigDecimal resolveScore(ExerciseProgressStatus status, int index) {
        if (status == ExerciseProgressStatus.NOT_STARTED || status == ExerciseProgressStatus.SKIPPED) {
            return null;
        }
        if (status == ExerciseProgressStatus.IN_PROGRESS) {
            return BigDecimal.valueOf(6.5);
        }
        return BigDecimal.valueOf(8 + (index % 3)).setScale(2);
    }

    private Integer resolveCurrentPhase(List<TrainingPhase> phases, List<RoadmapExercise> roadmapExercises,
                                        EnrollmentScenario scenario, int doneTarget) {
        if (scenario == EnrollmentScenario.COMPLETED) {
            return phases.get(phases.size() - 1).getPhaseOrder();
        }
        if (scenario == EnrollmentScenario.NOT_STARTED) {
            return phases.get(0).getPhaseOrder();
        }

        int boundary = scenario == EnrollmentScenario.IN_PROGRESS ? doneTarget : 3;
        if (boundary >= roadmapExercises.size()) {
            return phases.get(phases.size() - 1).getPhaseOrder();
        }
        return roadmapExercises.get(boundary).getTrainingPhase().getPhaseOrder();
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private record PhaseSeed(
            String phaseName,
            int phaseOrder,
            int durationWeeks,
            String objectives,
            String assessmentCriteria,
            List<String> exerciseNames
    ) {
    }

    private enum EnrollmentScenario {
        COMPLETED(EnrollmentStatus.COMPLETED, 5, 14, "Seeded enrollment finished at 100%."),
        IN_PROGRESS(EnrollmentStatus.IN_PROGRESS, 0, 6, "Seeded enrollment is around 60% complete."),
        NOT_STARTED(EnrollmentStatus.ENROLLED, 0, 1, "Seeded enrollment has just started."),
        SUSPENDED(EnrollmentStatus.SUSPENDED, 0, 9, "Seeded enrollment is currently suspended.");

        private final EnrollmentStatus status;
        private final int doneCount;
        private final int enrolledDaysAgo;
        private final String notes;

        EnrollmentScenario(EnrollmentStatus status, int doneCount, int enrolledDaysAgo, String notes) {
            this.status = status;
            this.doneCount = doneCount;
            this.enrolledDaysAgo = enrolledDaysAgo;
            this.notes = notes;
        }
    }
}
