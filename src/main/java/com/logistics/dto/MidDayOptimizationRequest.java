package com.logistics.dto;

import com.logistics.model.Order;
import java.time.LocalDateTime;
import java.util.List;

public record MidDayOptimizationRequest(
        LocalDateTime currentTime,
        List<DriverCurrentState> driverStates,
        List<Order> remainingOrders
) {
    public record DriverCurrentState(
            String driverId,
            String vehicleId,
            String currentLocationId,
            LocalDateTime availableFrom
    ) {}
}
