package com.logistics;

import com.logistics.model.RouteSegment;
import com.logistics.service.CsvDataLoaderService;
import com.logistics.service.DistanceService;
import com.logistics.service.SmartGraphOptimizationStrategy;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.HashSet;
import java.util.List;

@SpringBootApplication
public class SimulationRunner {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(SimulationRunner.class, args);

        SmartGraphOptimizationStrategy strategy = context.getBean(SmartGraphOptimizationStrategy.class);
        CsvDataLoaderService dataLoader = context.getBean(CsvDataLoaderService.class);
        DistanceService distanceService = context.getBean(DistanceService.class);

        // Ініціалізація кешу (якщо ще не ініціалізований)
        distanceService.initCache();

        System.out.println(">>> STARTING SIMULATION <<<");

        List<RouteSegment> schedule = strategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>()
        );

        double totalProfit = schedule.stream().mapToDouble(RouteSegment::getProfitOrCost).sum();
        long ordersCompleted = schedule.stream().filter(s -> "ORDER".equals(s.getType().name())).count();

        System.out.println("\n>>> SIMULATION RESULTS <<<");
        System.out.println("Total Profit: " + String.format("%.2f", totalProfit) + " UAH");
        System.out.println("Orders Completed: " + ordersCompleted);
        
        // Вихід
        System.exit(0);
    }
}