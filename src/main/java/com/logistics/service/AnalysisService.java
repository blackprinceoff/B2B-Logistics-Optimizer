package com.logistics.service;

import com.logistics.model.Order;
import com.logistics.model.RouteSegment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final CsvDataLoaderService dataLoader;
    private final SmartGraphOptimizationStrategy optimizationStrategy;

    // Структура для повернення JSON на фронтенд
    public record AnalysisResult(
            Map<Integer, Double> lookAheadSensitivity,
            double baselineProfit,
            double smartProfit,
            double optimalityGap,
            MonteCarloStats monteCarloStats
    ) {}

    public record MonteCarloStats(
            double expectedValue, // M[X] (Математичне сподівання)
            double variance,      // D[X] (Дисперсія)
            double stdDev,        // Сигма (Середньоквадратичне відхилення)
            double minProfit,
            double maxProfit,
            List<Double> distribution // Усі результати для гістограми
    ) {}

    public AnalysisResult runFullAnalysis() {
        System.out.println("⏳ Початок математичного аналізу...");

        // 1. Аналіз чутливості (Sensitivity Analysis) для параметра Look-Ahead
        Map<Integer, Double> sensitivity = new TreeMap<>();
        int[] horizons = {0, 30, 60, 90, 120, 180, 240};

        for (int h : horizons) {
            optimizationStrategy.setLookAheadMinutes(h);
            double profit = simulateSingleRun();
            sensitivity.put(h, profit);
        }

        // 2. Оцінка ефективності (Optimality Gap)
        // Baseline: Жадібний алгоритм (Look-Ahead = 0)
        double baselineProfit = sensitivity.get(0);
        // Smart: Наш оптимум (Look-Ahead = 120)
        double smartProfit = sensitivity.get(120);

        // Формула: Gap = (Smart - Baseline) / |Baseline| * 100%
        double optimalityGap = 0;
        if (baselineProfit != 0) {
            optimalityGap = ((smartProfit - baselineProfit) / Math.abs(baselineProfit)) * 100.0;
        }

        // 3. Стохастичне моделювання (Метод Монте-Карло)
        // Повертаємо оптимальний параметр
        optimizationStrategy.setLookAheadMinutes(120);
        int iterations = 50; // Кількість прогонів "одного дня"
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

        // Математичне сподівання M[X]
        double expectedValue = sum / iterations;

        // Дисперсія D[X] = sum((X - M[X])^2) / N
        double varianceSum = 0;
        for (Double p : mcResults) {
            varianceSum += Math.pow(p - expectedValue, 2);
        }
        double variance = varianceSum / iterations;

        // Середньоквадратичне відхилення (Сигма)
        double stdDev = Math.sqrt(variance);

        MonteCarloStats mcStats = new MonteCarloStats(
                Math.round(expectedValue * 100.0) / 100.0,
                Math.round(variance * 100.0) / 100.0,
                Math.round(stdDev * 100.0) / 100.0,
                Math.round(min * 100.0) / 100.0,
                Math.round(max * 100.0) / 100.0,
                mcResults
        );

        System.out.println("✅ Аналіз завершено!");

        return new AnalysisResult(sensitivity, baselineProfit, smartProfit, optimalityGap, mcStats);
    }

    private double simulateSingleRun() {
        Set<String> brokenVehicles = new HashSet<>();
        // Створюємо копію замовлень, щоб алгоритм міг їх безпечно сортувати
        List<Order> ordersCopy = new ArrayList<>(dataLoader.getOrders());

        List<RouteSegment> schedule = optimizationStrategy.optimize(
                ordersCopy,
                dataLoader.getVehicles(),
                dataLoader.getDrivers(),
                brokenVehicles
        );

        // Рахуємо сумарний прибуток/витрати зі всіх сегментів (включно з добиранням)
        return schedule.stream().mapToDouble(RouteSegment::getProfitOrCost).sum();
    }
}