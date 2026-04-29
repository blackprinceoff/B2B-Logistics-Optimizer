package com.logistics.dto;

import com.logistics.model.RouteSegment;
import java.util.List;

public record OptimizationResponse(
        List<RouteSegment> schedule,
        double totalProfit,
        long completedOrders,
        double totalDistanceKm
) {}
