package com.logistics.controller;

import com.logistics.dto.OptimizationResponse;
import com.logistics.dto.MidDayOptimizationRequest;
import com.logistics.model.RouteSegment;
import com.logistics.service.CsvDataLoaderService;
import com.logistics.service.SmartGraphOptimizationStrategy;
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
    @GetMapping("/snapshot")
    public MidDayOptimizationRequest getSnapshot(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime time) {
        return optimizationStrategy.extractStateAt(
                time,
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>(brokenVehicles)
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
