package com.logistics.controller;

import com.logistics.dto.OptimizationResponse;
import com.logistics.model.RouteSegment;
import com.logistics.model.SimulationResult;
import com.logistics.service.CsvDataLoaderService;
import com.logistics.service.SmartGraphOptimizationStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LogisticsController {

    private final CsvDataLoaderService dataLoader;
    private final SmartGraphOptimizationStrategy optimizationStrategy;

    private final Set<String> brokenVehicles = new HashSet<>();

    @GetMapping("/optimize")
    public OptimizationResponse getSchedule() {
        List<RouteSegment> segments = optimizationStrategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>(brokenVehicles)
        );

        segments.sort(Comparator.comparing(RouteSegment::getStartTime));

        double totalProfit = segments.stream()
                .mapToDouble(RouteSegment::getProfitOrCost)
                .sum();

        long completed = segments.stream()
                .filter(s -> "ORDER".equals(s.getType().name()))
                .count();

        double totalDistance = segments.stream()
                .mapToDouble(RouteSegment::getDistanceKm)
                .sum();

        return new OptimizationResponse(
                segments,
                totalProfit,
                completed,
                totalDistance
        );
    }
    @PostMapping("/vehicles/{vehicleId}/breakdown")
    public String reportBreakdown(@PathVariable String vehicleId) {
        brokenVehicles.add(vehicleId);
        return "WARNING: Vehicle " + vehicleId + " is marked as BROKEN. The next optimization run will account for this.";
    }

    @PostMapping("/vehicles/{vehicleId}/repair")
    public String reportRepair(@PathVariable String vehicleId) {
        brokenVehicles.remove(vehicleId);
        return "Vehicle " + vehicleId + " has been repaired.";
    }
}
