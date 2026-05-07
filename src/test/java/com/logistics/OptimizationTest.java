package com.logistics;

import com.logistics.dto.AnalysisResult;
import com.logistics.model.RouteSegment;
import com.logistics.model.SegmentType;
import com.logistics.service.AnalysisService;
import com.logistics.service.CsvDataLoaderService;
import com.logistics.service.DistanceService;
import com.logistics.service.SmartGraphOptimizationStrategy;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for the SmartGraph optimization algorithm.
 *
 * These tests verify:
 * 1. The optimizer produces a valid, profitable schedule
 * 2. Monte Carlo simulation produces real stochastic variance (stdDev > 0)
 * 3. Look-ahead improves profit over greedy baseline
 * 4. Schedule temporal consistency — no segment ends before it starts
 * 5. Broken vehicles are correctly excluded
 */
@Slf4j
@SpringBootTest
class OptimizationTest {

    @Autowired
    private SmartGraphOptimizationStrategy strategy;

    @Autowired
    private CsvDataLoaderService dataLoader;

    @Autowired
    private DistanceService distanceService;

    @Autowired
    private AnalysisService analysisService;

    @BeforeEach
    void initCache() {
        distanceService.initCache();
    }

    // ─────────────────────────────────────────────────────────────────
    // Test 1 — Basic schedule sanity
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Full-day optimization: schedule is non-empty and profitable")
    void testScheduleIsNonEmptyAndProfitable() {
        List<RouteSegment> schedule = strategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>()
        );

        assertThat(schedule).isNotEmpty();

        long orderCount = schedule.stream()
                .filter(s -> s.getType() == SegmentType.ORDER)
                .count();
        assertThat(orderCount).isGreaterThan(0)
                .as("Optimizer must complete at least one order");

        double totalProfit = schedule.stream()
                .mapToDouble(RouteSegment::getProfitOrCost)
                .sum();
        assertThat(totalProfit).isGreaterThan(0)
                .as("Net profit across the full day must be positive");

        log.info("✅ Schedule: {} segments, {} orders, profit = {:.2f} ₴",
                schedule.size(), orderCount, totalProfit);
    }

    // ─────────────────────────────────────────────────────────────────
    // Test 2 — Temporal consistency
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("All segments: endTime must be after startTime")
    void testTemporalConsistency() {
        List<RouteSegment> schedule = strategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>()
        );

        schedule.forEach(seg -> {
            assertThat(seg.getEndTime())
                    .as("Segment [%s] %s→%s must end after it starts",
                            seg.getType(), seg.getStartLocationId(), seg.getEndLocationId())
                    .isAfterOrEqualTo(seg.getStartTime());
        });
        log.info("✅ Temporal consistency OK for {} segments", schedule.size());
    }

    // ─────────────────────────────────────────────────────────────────
    // Test 3 — Broken vehicle is excluded
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Broken vehicle is excluded from schedule orders")
    void testBrokenVehicleExclusion() {
        String brokenId = dataLoader.getVehicles().get(0).getId();

        List<RouteSegment> schedule = strategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>(List.of(brokenId))
        );

        boolean brokenUsedForOrder = schedule.stream()
                .filter(s -> s.getType() == SegmentType.ORDER)
                .anyMatch(s -> brokenId.equals(s.getVehicleId()));

        assertThat(brokenUsedForOrder).isFalse()
                .as("Broken vehicle '%s' must not be assigned any orders", brokenId);

        log.info("✅ Broken vehicle {} correctly excluded from all ORDER segments", brokenId);
    }

    // ─────────────────────────────────────────────────────────────────
    // Test 4 — Look-ahead improves profit over greedy baseline
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Look-ahead (120 min) profit >= greedy (0 min) profit")
    void testLookAheadImprovesProfit() {
        strategy.setLookAheadMinutes(0);
        double greedyProfit = runAndGetProfit();

        strategy.setLookAheadMinutes(120);
        double smartProfit = runAndGetProfit();

        strategy.setLookAheadMinutes(120); // reset to default

        log.info("Greedy profit: {:.2f} ₴", greedyProfit);
        log.info("Smart  profit: {:.2f} ₴", smartProfit);
        log.info("Improvement:   {:.2f}%", ((smartProfit - greedyProfit) / Math.abs(greedyProfit)) * 100);

        assertThat(smartProfit).isGreaterThanOrEqualTo(greedyProfit)
                .as("Look-ahead heuristic should not perform worse than greedy baseline");
    }

    // ─────────────────────────────────────────────────────────────────
    // Test 5 — Monte Carlo: real variance (stdDev > 0)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Monte Carlo simulation produces real stochastic variance (stdDev > 0)")
    void testMonteCarloHasRealVariance() {
        AnalysisResult result = analysisService.runFullAnalysis();

        assertThat(result.monteCarloStats().expectedValue())
                .isGreaterThan(0)
                .as("Expected value must be > 0");

        assertThat(result.monteCarloStats().minProfit())
                .isLessThan(result.monteCarloStats().expectedValue())
                .as("Min profit must be below expected value");

        assertThat(result.monteCarloStats().maxProfit())
                .isGreaterThan(result.monteCarloStats().expectedValue())
                .as("Max profit must be above expected value");

        log.info("✅ MC stdDev={:.2f}, range=[{:.0f}, {:.0f}], μ={:.0f}",
                result.monteCarloStats().stdDev(),
                result.monteCarloStats().minProfit(),
                result.monteCarloStats().maxProfit(),
                result.monteCarloStats().expectedValue());
    }

    // ─────────────────────────────────────────────────────────────────
    // Test 6 — Optimality gap is positive
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Optimality gap: smart algorithm outperforms greedy baseline")
    void testOptimalityGapIsPositive() {
        AnalysisResult result = analysisService.runFullAnalysis();

        assertThat(result.optimalityGap())
                .isGreaterThanOrEqualTo(0)
                .as("Smart algorithm should match or beat the greedy baseline");

        assertThat(result.smartProfit())
                .isGreaterThanOrEqualTo(result.baselineProfit())
                .as("Smart profit >= baseline profit");

        log.info("✅ Optimality gap: +{:.2f}% ({:.0f} ₴ absolute)",
                result.optimalityGap(),
                result.smartProfit() - result.baselineProfit());
    }

    // ─────────────────────────────────────────────────────────────────
    // Test 7 — Profit per ORDER segment is always bounded
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Each ORDER segment profit is within plausible bounds [-500, +3000] ₴")
    void testOrderProfitBounds() {
        List<RouteSegment> schedule = strategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>()
        );

        schedule.stream()
                .filter(s -> s.getType() == SegmentType.ORDER)
                .forEach(seg -> {
                    assertThat(seg.getProfitOrCost())
                            .as("Order segment profit must be in plausible range")
                            .isGreaterThan(-500.0)
                            .isLessThan(3000.0);
                });
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    private double runAndGetProfit() {
        return strategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>()
        ).stream().mapToDouble(RouteSegment::getProfitOrCost).sum();
    }
}