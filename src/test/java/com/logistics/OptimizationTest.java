package com.logistics;

import com.logistics.model.RouteSegment;
import com.logistics.service.CsvDataLoaderService;
import com.logistics.service.DistanceService;
import com.logistics.service.SmartGraphOptimizationStrategy;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashSet;
import java.util.List;

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
        
        System.out.println(">>> STARTING OPTIMIZATION TEST <<<");

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

        System.out.println("\n>>> TEST RESULTS <<<");
        System.out.println("Total Profit: " + String.format("%.2f", totalProfit) + " UAH");
        System.out.println("Orders Completed: " + ordersCompleted + " / " + dataLoader.getOrders().size());
        System.out.println("Breakdowns: " + breakdowns);
        
        // Вивід деталей для перевірки Carpooling
        System.out.println("\n--- Commute Details ---");
        schedule.stream()
                .filter(s -> s.getProfitOrCost() < 0 && s.getDistanceKm() > 0 && s.getType().name().equals("TRANSFER") && s.getStartTime().getHour() < 9)
                .limit(5)
                .forEach(s -> System.out.println(s.getDriverId() + ": " + s.getProfitOrCost() + " UAH (" + s.getDistanceKm() + " km)"));
    }
}