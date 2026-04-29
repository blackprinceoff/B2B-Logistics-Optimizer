package com.logistics.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OptimizationCandidate {
    private VehicleState vehicleState;
    private CalculationResult calculation;
    private double netProfit;
    private double opportunityCost;
}
