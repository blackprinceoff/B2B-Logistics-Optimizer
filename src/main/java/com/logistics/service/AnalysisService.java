package com.logistics.service;

import com.logistics.dto.AnalysisResult;
import com.logistics.dto.MonteCarloStats;
import com.logistics.model.Order;
import com.logistics.model.RouteSegment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final CsvDataLoaderService dataLoader;
    private final SmartGraphOptimizationStrategy optimizationStrategy;

    /**
     * Runs a full mathematical analysis of the optimization strategy including
     * sensitivity analysis for look-ahead horizons and Monte Carlo simulations.
     *
     * @return AnalysisResult containing sensitivity and statistical data
     */
    public AnalysisResult runFullAnalysis() {
        log.info("Starting mathematical analysis...");

        // 1. Sensitivity Analysis for Look-Ahead horizon
        Map<Integer, Double> sensitivity = new TreeMap<>();
        int[] horizons = {0, 30, 60, 90, 120, 180, 240};

        for (int h : horizons) {
            optimizationStrategy.setLookAheadMinutes(h);
            double profit = simulateSingleRun();
            sensitivity.put(h, profit);
        }

        // 2. Optimality Gap Evaluation
        double baselineProfit = sensitivity.get(0); // Greedy algorithm baseline
        double smartProfit = sensitivity.get(120);  // Optimized horizon

        double optimalityGap = 0;
        if (baselineProfit != 0) {
            optimalityGap = ((smartProfit - baselineProfit) / Math.abs(baselineProfit)) * 100.0;
        }

        // 3. Monte Carlo Simulation for stochastic events
        optimizationStrategy.setLookAheadMinutes(120);
        int iterations = 50;
        List<Double> mcResults = new ArrayList<>();

        double sum = 0;
        double min = Double.MAX_VALUE;
        double max = -Double.MAX_VALUE;

        for (int i = 0; i < iterations; i++) {
            double profit = simulateSingleRun();
            mcResults.add(profit);
            sum += profit;
            if (profit < min) min = profit;
            if (profit > max) max = profit;
        }

        double expectedValue = sum / iterations;

        double varianceSum = 0;
        for (Double p : mcResults) {
            varianceSum += Math.pow(p - expectedValue, 2);
        }
        double variance = varianceSum / iterations;

        double stdDev = Math.sqrt(variance);

        MonteCarloStats mcStats = new MonteCarloStats(
                Math.round(expectedValue * 100.0) / 100.0,
                Math.round(variance * 100.0) / 100.0,
                Math.round(stdDev * 100.0) / 100.0,
                Math.round(min * 100.0) / 100.0,
                Math.round(max * 100.0) / 100.0,
                mcResults
        );

        log.info("Analysis completed successfully.");

        return new AnalysisResult(sensitivity, baselineProfit, smartProfit, optimalityGap, mcStats);
    }

    private double simulateSingleRun() {
        Set<String> brokenVehicles = new HashSet<>();
        List<Order> ordersCopy = new ArrayList<>(dataLoader.getOrders());

        List<RouteSegment> schedule = optimizationStrategy.optimize(
                ordersCopy,
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                brokenVehicles
        );

        return schedule.stream().mapToDouble(RouteSegment::getProfitOrCost).sum();
    }
}