package com.logistics.dto;

import java.util.List;

public record MonteCarloStats(
        double expectedValue,
        double variance,
        double stdDev,
        double minProfit,
        double maxProfit,
        List<Double> distribution
) {}
