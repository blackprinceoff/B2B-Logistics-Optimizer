package com.logistics.dto;

import java.util.Map;

public record AnalysisResult(
        Map<Integer, Double> lookAheadSensitivity,
        double baselineProfit,
        double smartProfit,
        double optimalityGap,
        MonteCarloStats monteCarloStats
) {}
