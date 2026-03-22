package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.response.WeightAssessmentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.WeightAssessmentResponse.WeightHistoryItem;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.HealthRecord;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.WeightAssessment;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.WeightStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.WeightAssessmentRepository;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;
import vn.edu.fpt.doghandbook.backend.service.WeightAssessmentService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WeightAssessmentServiceImpl implements WeightAssessmentService {

    private final DogProfileRepository dogProfileRepository;
    private final HealthRecordRepository healthRecordRepository;
    private final WeightAssessmentRepository weightAssessmentRepository;
    private final DogAssignmentRepository dogAssignmentRepository;
    private final NotificationService notificationService;

    @Override
    public WeightAssessmentResponse assess(Integer dogId) {
        // 1. Load dog + breed
        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(dogId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chó với ID: " + dogId));
        DogBreed breed = dog.getDogBreed();

        // 2. Weight range by gender
        BigDecimal minKg;
        BigDecimal maxKg;
        if (dog.getGender() == DogGender.MALE) {
            minKg = breed.getWeightMaleMinKg();
            maxKg = breed.getWeightMaleMaxKg();
        } else {
            minKg = breed.getWeightFemaleMinKg();
            maxKg = breed.getWeightFemaleMaxKg();
        }

        BigDecimal currentWeight = dog.getCurrentWeightKg();
        if (currentWeight == null) {
            throw new RuntimeException("Chó " + dog.getDogName() + " chưa có dữ liệu cân nặng.");
        }
        if (minKg == null || maxKg == null) {
            throw new RuntimeException("Giống " + breed.getBreedName() + " chưa có dữ liệu chuẩn cân nặng.");
        }

        // 3. Deviation
        BigDecimal midpoint = minKg.add(maxKg).divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
        BigDecimal deviation = currentWeight.subtract(midpoint)
                .multiply(BigDecimal.valueOf(100))
                .divide(midpoint, 2, RoundingMode.HALF_UP);

        // 4. Weight status
        WeightStatus weightStatus;
        if (deviation.compareTo(BigDecimal.valueOf(-20)) < 0) {
            weightStatus = WeightStatus.SEVERELY_UNDERWEIGHT;
        } else if (deviation.compareTo(BigDecimal.valueOf(-10)) < 0) {
            weightStatus = WeightStatus.UNDERWEIGHT;
        } else if (deviation.compareTo(BigDecimal.valueOf(20)) > 0) {
            weightStatus = WeightStatus.OBESE;
        } else if (deviation.compareTo(BigDecimal.valueOf(10)) > 0) {
            weightStatus = WeightStatus.OVERWEIGHT;
        } else {
            weightStatus = WeightStatus.NORMAL;
        }

        // 5. Trend from 3 most recent health records
        List<HealthRecord> top3 = healthRecordRepository
                .findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(dogId);
        String trend = determineTrend(top3);

        // 6. History from 10 most recent records
        List<HealthRecord> top10 = healthRecordRepository
                .findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(dogId);
        List<WeightHistoryItem> recentHistory = buildHistory(top10);

        // Weight change (latest vs previous)
        BigDecimal weightChangeKg = BigDecimal.ZERO;
        if (top10.size() >= 2
                && top10.get(0).getWeightKg() != null
                && top10.get(1).getWeightKg() != null) {
            weightChangeKg = top10.get(0).getWeightKg().subtract(top10.get(1).getWeightKg());
        }

        // 7. Recommendation
        String recommendation = buildRecommendation(
                weightStatus, trend, dog.getDogName(), breed.getBreedName(),
                deviation, minKg, maxKg);

        // 8. Alert level
        String alertLevel;
        if (weightStatus == WeightStatus.SEVERELY_UNDERWEIGHT || weightStatus == WeightStatus.OBESE) {
            alertLevel = "CRITICAL";
        } else if (weightStatus == WeightStatus.UNDERWEIGHT || weightStatus == WeightStatus.OVERWEIGHT) {
            alertLevel = "WARNING";
        } else {
            alertLevel = "NORMAL";
        }

        // Age in months
        Integer ageMonths = null;
        if (dog.getBirthDate() != null) {
            ageMonths = Period.between(dog.getBirthDate(), LocalDate.now()).getYears() * 12
                    + Period.between(dog.getBirthDate(), LocalDate.now()).getMonths();
        }

        // 9. Save assessment entity
        User currentUser = ((CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal()).getUser();
        WeightAssessment entity = WeightAssessment.builder()
                .dogProfile(dog)
                .assessor(currentUser)
                .recordedWeightKg(currentWeight)
                .standardMinKg(minKg)
                .standardMaxKg(maxKg)
                .status(weightStatus)
                .deviationPercent(deviation)
                .recommendation(recommendation)
                .followUpWeeks(alertLevel.equals("CRITICAL") ? 1 : alertLevel.equals("WARNING") ? 2 : 4)
                .build();
        weightAssessmentRepository.save(entity);

        if (weightStatus != WeightStatus.NORMAL) {
            String alertLabel = switch (weightStatus) {
                case SEVERELY_UNDERWEIGHT -> "thiếu cân nghiêm trọng";
                case UNDERWEIGHT -> "thiếu cân";
                case OVERWEIGHT -> "thừa cân";
                case OBESE -> "béo phì";
                default -> "bất thường";
            };
            String title = "Cảnh báo cân nặng: " + dog.getDogName();
            String message = dog.getDogName() + " (" + dog.getDogCode() + ") " + alertLabel
                    + " - " + currentWeight + "kg (lệch " + deviation + "%)";

            // Trainer-only: notify trainers assigned to this dog
            for (DogAssignment a : dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(dogId)) {
                notificationService.notifyUser(
                        a.getTrainer(), currentUser,
                        NotificationType.WEIGHT_ABNORMAL,
                        title, message,
                        "WEIGHT_ASSESSMENT", entity.getAssessmentId()
                );
            }

            // Severe → escalate to Admin
            boolean isCritical = (weightStatus == WeightStatus.SEVERELY_UNDERWEIGHT || weightStatus == WeightStatus.OBESE);
            if (isCritical) {
                notificationService.notifyRole(
                        UserRole.ADMIN, currentUser,
                        NotificationType.WEIGHT_ABNORMAL_CRITICAL,
                        title, message,
                        "WEIGHT_ASSESSMENT", entity.getAssessmentId()
                );
            }
        }

        return WeightAssessmentResponse.builder()
                .dogId(dogId)
                .dogName(dog.getDogName())
                .dogCode(dog.getDogCode())
                .breedName(breed.getBreedName())
                .currentWeightKg(currentWeight)
                .ageMonths(ageMonths)
                .gender(dog.getGender().name())
                .standardMinKg(minKg)
                .standardMaxKg(maxKg)
                .deviationPercent(deviation)
                .weightStatus(weightStatus.name())
                .trend(trend)
                .weightChangeKg(weightChangeKg)
                .recentHistory(recentHistory)
                .recommendation(recommendation)
                .alertLevel(alertLevel)
                .build();
    }

    private String determineTrend(List<HealthRecord> records) {
        List<BigDecimal> weights = records.stream()
                .filter(r -> r.getWeightKg() != null)
                .map(HealthRecord::getWeightKg)
                .toList();

        if (weights.size() < 2) {
            return "STABLE";
        }

        // records are DESC by date, so weights[0] = newest
        boolean allGaining = true;
        boolean allLosing = true;
        for (int i = 0; i < weights.size() - 1; i++) {
            int cmp = weights.get(i).compareTo(weights.get(i + 1));
            if (cmp <= 0) allGaining = false;
            if (cmp >= 0) allLosing = false;
        }

        if (allGaining) return "GAINING";
        if (allLosing) return "LOSING";
        return "STABLE";
    }

    private List<WeightHistoryItem> buildHistory(List<HealthRecord> records) {
        List<WeightHistoryItem> items = new ArrayList<>();
        for (int i = 0; i < records.size(); i++) {
            HealthRecord r = records.get(i);
            BigDecimal changeKg = BigDecimal.ZERO;
            if (i < records.size() - 1
                    && r.getWeightKg() != null
                    && records.get(i + 1).getWeightKg() != null) {
                changeKg = r.getWeightKg().subtract(records.get(i + 1).getWeightKg());
            }
            items.add(WeightHistoryItem.builder()
                    .weightKg(r.getWeightKg())
                    .recordDate(r.getExaminationDate())
                    .changeKg(changeKg)
                    .build());
        }
        return items;
    }

    private String buildRecommendation(WeightStatus status, String trend,
                                        String dogName, String breedName,
                                        BigDecimal deviation, BigDecimal min, BigDecimal max) {
        StringBuilder sb = new StringBuilder();

        switch (status) {
            case SEVERELY_UNDERWEIGHT ->
                    sb.append("⚠️ CẢNH BÁO: ").append(dogName)
                            .append(" thiếu cân nghiêm trọng (").append(deviation).append("%). ")
                            .append("Cần tăng khẩu phần và khám thú y ngay.");
            case UNDERWEIGHT ->
                    sb.append(dogName).append(" hơi nhẹ cân. Tăng 10-15% khẩu phần, theo dõi hàng tuần.");
            case NORMAL ->
                    sb.append(dogName).append(" cân nặng tốt, trong chuẩn ")
                            .append(min).append("-").append(max).append("kg giống ").append(breedName).append(".");
            case OVERWEIGHT ->
                    sb.append(dogName).append(" thừa cân. Giảm 10% khẩu phần, tăng vận động.");
            case OBESE ->
                    sb.append("⚠️ CẢNH BÁO: ").append(dogName)
                            .append(" béo phì (+").append(deviation).append("%). ")
                            .append("Cần ăn kiêng và khám thú y.");
        }

        // Trend warnings
        boolean isUnderOrSevere = (status == WeightStatus.SEVERELY_UNDERWEIGHT || status == WeightStatus.UNDERWEIGHT);
        boolean isOverOrObese = (status == WeightStatus.OVERWEIGHT || status == WeightStatus.OBESE);

        if ("LOSING".equals(trend) && !isOverOrObese) {
            sb.append(" ⚠️ Xu hướng giảm cân liên tục, cần theo dõi sát.");
        }
        if ("GAINING".equals(trend) && isOverOrObese) {
            sb.append(" ⚠️ Xu hướng tăng cân liên tục khi đã thừa cân, cần can thiệp ngay.");
        }

        return sb.toString();
    }
}
