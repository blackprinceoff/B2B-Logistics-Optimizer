package com.logistics.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RouteSegment {
    private String vehicleId;
    private String driverId;

    private SegmentType type;
    private String orderId; // Якщо це замовлення

    private String startLocationId;
    private String endLocationId;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private double distanceKm;
    private double profitOrCost;
}