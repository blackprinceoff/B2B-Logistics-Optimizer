package com.logistics.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class SimulationResult {
    private double totalProfit;
    private int totalOrders;
    private int completedOrders;
    private int cancelledOrders;
    private List<RouteSegment> segments;
}