package com.logistics;

import com.logistics.model.RouteSegment;
import com.logistics.service.CsvDataLoaderService;
import com.logistics.service.DistanceService;
import com.logistics.service.SmartGraphOptimizationStrategy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.HashSet;
import java.util.List;

@Slf4j
@SpringBootApplication
public class SimulationRunner {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(SimulationRunner.class, args);

        SmartGraphOptimizationStrategy strategy = context.getBean(SmartGraphOptimizationStrategy.class);
        CsvDataLoaderService dataLoader = context.getBean(CsvDataLoaderService.class);
        DistanceService distanceService = context.getBean(DistanceService.class);

        // Ініціалізація кешу (якщо ще не ініціалізований)
        distanceService.initCache();

        log.info(">>> STARTING SIMULATION <<<");

        List<RouteSegment> schedule = strategy.optimize(
                dataLoader.getOrders(),
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                new HashSet<>()
        );

        double totalProfit = schedule.stream().mapToDouble(RouteSegment::getProfitOrCost).sum();
        long ordersCompleted = schedule.stream().filter(s -> "ORDER".equals(s.getType().name())).count();

        log.info(">>> SIMULATION RESULTS <<<");
        log.info("Total Profit: {} UAH", String.format("%.2f", totalProfit));
        log.info("Orders Completed: {}", ordersCompleted);
        
        // Вихід
        System.exit(0);
    }
}