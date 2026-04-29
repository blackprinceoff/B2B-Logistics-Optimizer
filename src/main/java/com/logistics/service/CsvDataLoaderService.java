package com.logistics.service;

import com.logistics.model.*;
import com.opencsv.bean.CsvToBeanBuilder;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStreamReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@Getter
public class CsvDataLoaderService {

    private List<Location> locations = new ArrayList<>();
    private List<Vehicle> vehicles = new ArrayList<>();
    private List<Driver> drivers = new ArrayList<>();
    private List<Order> orders = new ArrayList<>();
    private List<DistanceEntry> distanceEntries = new ArrayList<>();

    @PostConstruct
    public void init() {
        log.info("Starting data loading process...");

        locations = loadFile("locations.csv", Location.class);
        vehicles = loadFile("vehicles.csv", Vehicle.class);
        drivers = loadFile("drivers.csv", Driver.class);
        orders = loadFile("orders.csv", Order.class);
        distanceEntries = loadFile("distances.csv", DistanceEntry.class);

        log.info("Data loading completed. Locations: {}, Vehicles: {}, Drivers: {}, Orders: {}, Distance entries: {}",
                locations.size(), vehicles.size(), drivers.size(), orders.size(), distanceEntries.size());
    }

    private <T> List<T> loadFile(String filename, Class<T> type) {
        try (Reader reader = new InputStreamReader(
                Objects.requireNonNull(getClass().getResourceAsStream("/" + filename)))) {

            return new CsvToBeanBuilder<T>(reader)
                    .withType(type)
                    .withSeparator(',')
                    .build()
                    .parse();

        } catch (Exception e) {
            log.error("Error reading file {}: {}", filename, e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}