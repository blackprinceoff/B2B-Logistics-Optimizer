package com.logistics;

import com.logistics.model.RouteSegment;
import com.logistics.service.CsvDataLoaderService;
import com.logistics.service.DistanceService;
import com.logistics.service.SmartGraphOptimizationStrategy;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashSet;
import java.util.List;

@Slf4j
@SpringBootTest
public class OptimizationTest {

    @Autowired
    private SmartGraphOptimizationStrategy strategy;

    @Autowired
    private CsvDataLoaderService dataLoader;
    
    @Autowired
    private DistanceService distanceService;

    @Test
    void testOptimizationFlow() {
        // 1. Ініціалізація кешу відстаней (важливо для тесту)
        distanceService.initCache();
        
        log.info(">>> STARTING OPTIMIZATION TEST <<<");

        // 2. Запуск оптимізації
        List<RouteSegment> schedule = strategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>() // Немає поламаних машин на старті
        );

        // 3. Аналіз результатів
        double totalProfit = schedule.stream().mapToDouble(RouteSegment::getProfitOrCost).sum();
        long ordersCompleted = schedule.stream().filter(s -> "ORDER".equals(s.getType().name())).count();
        long breakdowns = schedule.stream().filter(s -> "BREAKDOWN".equals(s.getType().name())).count();

        log.info(">>> TEST RESULTS <<<");
        log.info("Total Profit: {} UAH", String.format("%.2f", totalProfit));
        log.info("Orders Completed: {} / {}", ordersCompleted, dataLoader.getOrders().size());
        log.info("Breakdowns: {}", breakdowns);
        
        // Вивід деталей для перевірки Carpooling
        log.info("--- Commute Details ---");
        schedule.stream()
                .filter(s -> s.getProfitOrCost() < 0 && s.getDistanceKm() > 0 && s.getType().name().equals("TRANSFER") && s.getStartTime().getHour() < 9)
                .limit(5)
                .forEach(s -> log.info("{}: {} UAH ({} km)", s.getDriverId(), s.getProfitOrCost(), s.getDistanceKm()));
    }
}