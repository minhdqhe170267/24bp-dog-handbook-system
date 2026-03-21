package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuditLogStatsResponse {

    private long totalLogs;
    private long todayLogs;
    private long thisWeekLogs;
    private Map<String, Long> actionTypeCounts;
    private List<DailyCount> dailyCounts;

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DailyCount {
        private String date;
        private long count;
    }
}
