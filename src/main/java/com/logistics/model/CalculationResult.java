package com.logistics.model;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class CalculationResult {
    private boolean isValid;
    private double transferDist;
    private long transferTime;
    private double orderDist;
    private long orderTime;
    private long idleTime;
    private long breakTime;
    private long timeDeviation;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    public static CalculationResult invalid() {
        return CalculationResult.builder().isValid(false).build();
    }
}
