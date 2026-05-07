package com.logistics.controller;

import com.logistics.dto.OptimizationResponse;
import com.logistics.dto.MidDayOptimizationRequest;
import com.logistics.model.Location;
import com.logistics.model.RouteSegment;
import com.logistics.service.CsvDataLoaderService;
import com.logistics.service.SmartGraphOptimizationStrategy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Tag(name = "Logistics Optimizer", description = "B2B Fleet route optimization and scheduling API")
public class LogisticsController {

    private final CsvDataLoaderService dataLoader;
    private final SmartGraphOptimizationStrategy optimizationStrategy;

    private final Set<String> brokenVehicles = new HashSet<>();

    @Operation(summary = "Get all depot and customer locations", description = "Returns the list of all geographic locations (depots, customers) used in routing")
    @GetMapping("/locations")
    public List<Location> getLocations() {
        return dataLoader.getLocations();
    }

    @Operation(summary = "Run full-day fleet optimization", description = "Executes the Smart Graph heuristic with look-ahead to generate an optimal vehicle schedule for all orders")
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
    @Operation(summary = "Capture fleet state at a given time", description = "Runs partial optimization up to 'time' and returns current vehicle positions and remaining unassigned orders")
    @GetMapping("/snapshot")
    public MidDayOptimizationRequest getSnapshot(
            @Parameter(description = "ISO datetime, e.g. 2025-06-20T12:00:00") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime time) {
        return optimizationStrategy.extractStateAt(
                time,
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>(brokenVehicles)
        );
    }

    @Operation(summary = "Report vehicle breakdown", description = "Marks a vehicle as broken — it will be excluded from the next optimization run")
    @PostMapping("/vehicles/{vehicleId}/breakdown")
    public String reportBreakdown(@PathVariable String vehicleId) {
        brokenVehicles.add(vehicleId);
        return "WARNING: Vehicle " + vehicleId + " is marked as BROKEN. The next optimization run will account for this.";
    }

    @Operation(summary = "Mark vehicle as repaired", description = "Removes breakdown status — vehicle is eligible for next optimization run")
    @PostMapping("/vehicles/{vehicleId}/repair")
    public String reportRepair(@PathVariable String vehicleId) {
        brokenVehicles.remove(vehicleId);
        return "Vehicle " + vehicleId + " has been repaired.";
    }

    @Operation(summary = "Mid-day re-optimization", description = "Re-runs the optimizer from current fleet state (positions + remaining orders) to handle late-day changes")
    @PostMapping("/reoptimize")
    public OptimizationResponse reoptimizeMidDay(@RequestBody MidDayOptimizationRequest request) {
        List<RouteSegment> segments = optimizationStrategy.optimizeMidDay(
                request,
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>(brokenVehicles)
        );

        segments.sort(Comparator.comparing(RouteSegment::getStartTime));

        double totalProfit = segments.stream().mapToDouble(RouteSegment::getProfitOrCost).sum();
        long completed = segments.stream().filter(s -> "ORDER".equals(s.getType().name())).count();
        double totalDistance = segments.stream().mapToDouble(RouteSegment::getDistanceKm).sum();

        return new OptimizationResponse(segments, totalProfit, completed, totalDistance);
    }
}
