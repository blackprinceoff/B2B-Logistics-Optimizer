package com.logistics.service;

import com.logistics.model.DistanceEntry;
import com.logistics.model.Location;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class DistanceService {

    private final CsvDataLoaderService dataLoader;
    
    // Cache for quick lookups: "fromId_toId" -> DistanceEntry
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
        // Convert the list to a Map for O(1) instant access
        for (DistanceEntry entry : dataLoader.getDistanceEntries()) {
            String key = generateKey(entry.getFromId(), entry.getToId());
            distanceCache.put(key, entry);
        }
        log.info("DistanceService: Cached {} routes.", distanceCache.size());
    }

    public double getDistanceKm(Location from, Location to) {
        if (from.getId().equals(to.getId())) return 0.0;

        // 1. Try to find the exact distance in the cache (OSRM)
        String key = generateKey(from.getId(), to.getId());
        if (distanceCache.containsKey(key)) {
            return distanceCache.get(key).getDistanceKm();
        }

        // 2. Fallback: Heuristic calculation
        log.warn("Warning: No OSRM data for {}->{}. Using heuristic.", from.getId(), to.getId());
        return calculateHeuristicDistance(from, to);
    }

    public double getTravelTimeMinutes(Location from, Location to, LocalDateTime departureTime) {
        if (from.getId().equals(to.getId())) return 0.0;

        double baseMinutes;
        
        // 1. Try to find exact duration in the cache (OSRM)
        String key = generateKey(from.getId(), to.getId());
        if (distanceCache.containsKey(key)) {
            baseMinutes = distanceCache.get(key).getDurationMin();
        } else {
            // 2. Fallback: Calculation based on distance and average speed
            double dist = calculateHeuristicDistance(from, to);
            double avgSpeed = getSmartAverageSpeed(from, to, dist);
            baseMinutes = (dist / avgSpeed) * 60.0;
        }

        // 3. Apply dynamic factors (Traffic + Noise)
        // Even OSRM data is often "clean" (without traffic), so a coefficient is needed
        double trafficFactor = getTrafficFactor(departureTime.toLocalTime());
        double noise = 0.95 + (0.1 * random.nextDouble()); // ±5%
        // double noise = 1.00;

        return baseMinutes * (1.0 / trafficFactor) * noise; 
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
        // Returns percentage of normal speed (1.0 = 100%)
        if (hour < 6) return 1.2; // Faster
        if (hour >= 8 && hour < 10) return 0.6; // Traffic jam
        if (hour >= 17 && hour < 19) return 0.65; // Traffic jam
        if (hour >= 10 && hour < 17) return 0.85; // Work day
        return 1.0;
    }
}