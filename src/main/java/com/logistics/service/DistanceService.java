package com.logistics.service;

import com.logistics.model.DistanceEntry;
import com.logistics.model.Location;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class DistanceService {

    private final CsvDataLoaderService dataLoader;
    
    // Кеш для швидкого пошуку: "fromId_toId" -> DistanceEntry
    private final Map<String, DistanceEntry> distanceCache = new HashMap<>();

    private static final int EARTH_RADIUS_KM = 6371;
    private static final double SPEED_CITY_CENTER = 22.0;
    private static final double SPEED_CITY_MAIN = 35.0;
    private static final double SPEED_SUBURB = 70.0;
    private static final double CURVATURE_CITY = 1.45;
    private static final double CURVATURE_SUBURB = 1.25;

    private final Random random = new Random();

    @PostConstruct
    public void initCache() {
        // Перетворюю список у Map для миттєвого доступу O(1)
        for (DistanceEntry entry : dataLoader.getDistanceEntries()) {
            String key = generateKey(entry.getFromId(), entry.getToId());
            distanceCache.put(key, entry);
        }
        System.out.println("DistanceService: Cached " + distanceCache.size() + " routes.");
    }

    public double getDistanceKm(Location from, Location to) {
        if (from.getId().equals(to.getId())) return 0.0;

        // 1. Спробувати знайти точну відстань у кеші (OSRM)
        String key = generateKey(from.getId(), to.getId());
        if (distanceCache.containsKey(key)) {
            return distanceCache.get(key).getDistanceKm();
        }

        // 2. Fallback: Евристика
        System.out.println("Warning: No OSRM data for " + from.getId() + "->" + to.getId() + ". Using heuristic.");
        return calculateHeuristicDistance(from, to);
    }

    public double getTravelTimeMinutes(Location from, Location to, LocalDateTime departureTime) {
        if (from.getId().equals(to.getId())) return 0.0;

        double baseMinutes;
        
        // 1. Спробувати знайти точний час у кеші (OSRM)
        String key = generateKey(from.getId(), to.getId());
        if (distanceCache.containsKey(key)) {
            baseMinutes = distanceCache.get(key).getDurationMin();
        } else {
            // 2. Fallback: Розрахунок
            double dist = calculateHeuristicDistance(from, to);
            double avgSpeed = getSmartAverageSpeed(from, to, dist);
            baseMinutes = (dist / avgSpeed) * 60.0;
        }

        // 3. Накладаємо динамічні фактори (Затори + Шум)
        // Навіть якщо дані з OSRM, вони зазвичай "чисті" (без заторів), тому коефіцієнт потрібен
        double trafficFactor = getTrafficFactor(departureTime.toLocalTime());
        double noise = 0.95 + (0.1 * random.nextDouble()); // ±5%
        // double noise = 1.00;

        return baseMinutes * (1.0 / trafficFactor) * noise; 
        // trafficFactor < 1 означає затор, тому ділимо швидкість або множимо час?
        // У getTrafficFactor я повертав коефіцієнт швидкості (0.6 = повільно).
        // Час = База / (ФакторШвидкості) -> База / 0.6 = База * 1.66 (часу більше)
    }

    public double getFuelConsumptionFactor(Location loc) {
        return "CITY".equalsIgnoreCase(loc.getZone()) ? 1.3 : 1.0;
    }

    // --- PRIVATE HELPERS ---

    private String generateKey(String fromId, String toId) {
        return fromId + "_" + toId;
    }

    private double calculateHeuristicDistance(Location loc1, Location loc2) {
        double airDistance = calculateHaversine(loc1, loc2);
        double curvature = getCurvatureFactor(loc1, loc2);
        return airDistance * curvature;
    }

    private double calculateHaversine(Location loc1, Location loc2) {
        double lat1 = Math.toRadians(loc1.getLatitude());
        double lon1 = Math.toRadians(loc1.getLongitude());
        double lat2 = Math.toRadians(loc2.getLatitude());
        double lon2 = Math.toRadians(loc2.getLongitude());
        double a = Math.pow(Math.sin((lat2 - lat1) / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
    }

    private double getCurvatureFactor(Location l1, Location l2) {
        boolean city1 = "CITY".equalsIgnoreCase(l1.getZone());
        boolean city2 = "CITY".equalsIgnoreCase(l2.getZone());
        if (city1 && city2) return CURVATURE_CITY;
        if (!city1 && !city2) return CURVATURE_SUBURB;
        return (CURVATURE_CITY + CURVATURE_SUBURB) / 2;
    }

    private double getSmartAverageSpeed(Location l1, Location l2, double distanceKm) {
        boolean city1 = "CITY".equalsIgnoreCase(l1.getZone());
        boolean city2 = "CITY".equalsIgnoreCase(l2.getZone());
        double estimatedSpeed;

        if (city1 && city2) {
            if (distanceKm > 8.0) estimatedSpeed = SPEED_CITY_MAIN;
            else estimatedSpeed = SPEED_CITY_CENTER;
        } else if (!city1 && !city2) {
            estimatedSpeed = SPEED_SUBURB;
        } else {
            estimatedSpeed = (SPEED_CITY_MAIN * 0.4) + (SPEED_SUBURB * 0.6);
        }

        if (distanceKm < 3.0) estimatedSpeed *= 0.7;
        return estimatedSpeed;
    }

    private double getTrafficFactor(LocalTime time) {
        int hour = time.getHour();
        // Повертає % від нормальної швидкості (1.0 = 100%)
        if (hour < 6) return 1.2; // Швидше
        if (hour >= 8 && hour < 10) return 0.6; // Затор
        if (hour >= 17 && hour < 19) return 0.65; // Затор
        if (hour >= 10 && hour < 17) return 0.85; // Робочий день
        return 1.0;
    }
}