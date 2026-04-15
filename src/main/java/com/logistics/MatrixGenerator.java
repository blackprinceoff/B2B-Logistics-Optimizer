package com.logistics;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Утиліта для генерації матриці відстаней на основі locations.csv.
 * Використовує OSRM API.
 * Результат записується у src/main/resources/distances.csv
 */
public class MatrixGenerator {

    private static final String LOCATIONS_FILE = "src/main/resources/locations.csv";
    private static final String OUTPUT_FILE = "src/main/resources/distances.csv";

    // Простий клас для зберігання даних локації під час генерації
    record LocationPoint(String id, double lat, double lon) {}

    public static void main(String[] args) {
        System.out.println(">>> Start generating Distance Matrix...");
        
        List<LocationPoint> locations = readLocations(LOCATIONS_FILE);
        if (locations.isEmpty()) {
            System.err.println("No locations found in " + LOCATIONS_FILE);
            return;
        }

        System.out.println("Loaded " + locations.size() + " locations. Calculating routes...");

        try (FileWriter writer = new FileWriter(OUTPUT_FILE, StandardCharsets.UTF_8)) {
            // Записуємо заголовок CSV
            writer.write("from_id,to_id,distance_km,duration_min\n");

            HttpClient client = HttpClient.newHttpClient();
            int count = 0;

            for (LocationPoint from : locations) {
                for (LocationPoint to : locations) {
                    if (from.id.equals(to.id)) {
                        // Відстань до самої себе = 0
                        writer.write(String.format(Locale.US, "%s,%s,0.0,0.0\n", from.id, to.id));
                        continue;
                    }

                    // OSRM API format: longitude,latitude
                    String url = String.format(Locale.US, "http://router.project-osrm.org/route/v1/driving/%s,%s;%s,%s?overview=false",
                            from.lon, from.lat, to.lon, to.lat);

                    try {
                        HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
                        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                        if (response.statusCode() == 200) {
                            // Парсинг JSON (distance in meters, duration in seconds)
                            double distanceKm = extractValue(response.body(), "\"distance\":([0-9.]+)");
                            double durationMin = extractValue(response.body(), "\"duration\":([0-9.]+)");

                            // Конвертація
                            distanceKm = Math.round((distanceKm / 1000.0) * 100.0) / 100.0; // до 2 знаків
                            durationMin = Math.round((durationMin / 60.0) * 10.0) / 10.0;   // до 1 знаку

                            // ВИПРАВЛЕННЯ: Використовуємо Locale.US для крапки замість коми
                            writer.write(String.format(Locale.US, "%s,%s,%.2f,%.1f\n", from.id, to.id, distanceKm, durationMin));
                            System.out.printf(Locale.US, "Route %s -> %s: %.2f km, %.1f min%n", from.id, to.id, distanceKm, durationMin);
                        } else {
                            System.err.println("API Error for " + from.id + "->" + to.id + ": " + response.statusCode());
                        }

                        // Пауза, щоб не отримати бан від OSRM (demo server limit)
                        Thread.sleep(250); 

                    } catch (Exception e) {
                        System.err.println("Error calculating " + from.id + "->" + to.id + ": " + e.getMessage());
                    }
                    count++;
                }
            }
            System.out.println(">>> Done! Matrix saved to " + OUTPUT_FILE);

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static List<LocationPoint> readLocations(String filePath) {
        List<LocationPoint> list = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(filePath, StandardCharsets.UTF_8))) {
            String line;
            boolean isHeader = true;
            while ((line = br.readLine()) != null) {
                if (isHeader) { isHeader = false; continue; } // Skip header
                
                String[] parts = line.split(",");
                if (parts.length >= 4) {
                    // CSV format: id,name,latitude,longitude,...
                    String id = parts[0].trim();
                    double lat = Double.parseDouble(parts[2].trim());
                    double lon = Double.parseDouble(parts[3].trim());
                    list.add(new LocationPoint(id, lat, lon));
                }
            }
        } catch (Exception e) {
            System.err.println("Error reading CSV: " + e.getMessage());
        }
        return list;
    }

    private static double extractValue(String json, String regex) {
        Matcher m = Pattern.compile(regex).matcher(json);
        if (m.find()) {
            return Double.parseDouble(m.group(1));
        }
        return 0.0;
    }
}
