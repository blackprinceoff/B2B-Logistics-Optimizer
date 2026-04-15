package com.logistics.controller;

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

    // Список поламаних машин (зберігається в пам'яті між запитами)
    private final Set<String> brokenVehicles = new HashSet<>();

    @GetMapping("/optimize")
    public OptimizationResponse getSchedule() {
        // Запуск оптимізації з урахуванням списку поламаних машин
        List<RouteSegment> segments = optimizationStrategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>(brokenVehicles) // Копія, щоб стратегія не змінювала оригінал
        );

        // Сортування хронологічно
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

    // СИМУЛЯЦІЯ АВАРІЇ
    @PostMapping("/vehicles/{vehicleId}/breakdown")
    public String reportBreakdown(@PathVariable String vehicleId) {
        brokenVehicles.add(vehicleId);
        return "УВАГА: Машина " + vehicleId + " позначена як НЕСПРАВНА. Наступний запуск оптимізації врахує це.";
    }

    // ПОЛАГОДИТИ МАШИНУ
    @PostMapping("/vehicles/{vehicleId}/repair")
    public String reportRepair(@PathVariable String vehicleId) {
        brokenVehicles.remove(vehicleId);
        return "Машина " + vehicleId + " відремонтована.";
    }

    // DTO для відповіді (щоб відповідати фронтенду)
    record OptimizationResponse(
            List<RouteSegment> schedule,
            double totalProfit,
            long completedOrders,
            double totalDistanceKm
    ) {}
}
