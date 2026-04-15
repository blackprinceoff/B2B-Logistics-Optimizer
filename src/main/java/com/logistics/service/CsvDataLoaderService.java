package com.logistics.service;

import com.logistics.model.*;
import com.opencsv.bean.CsvToBeanBuilder;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.io.InputStreamReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

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
        System.out.println("--- ПОЧАТОК ЗАВАНТАЖЕННЯ ДАНИХ ---");

        locations = loadFile("locations.csv", Location.class);
        vehicles = loadFile("vehicles.csv", Vehicle.class);
        drivers = loadFile("drivers.csv", Driver.class);
        orders = loadFile("orders.csv", Order.class);
        // Завантажуємо матрицю відстаней
        distanceEntries = loadFile("distances.csv", DistanceEntry.class);

        System.out.println("--- ЗАВАНТАЖЕННЯ ЗАВЕРШЕНО ---");
        System.out.println("Локацій: " + locations.size());
        System.out.println("Транспорту: " + vehicles.size());
        System.out.println("Водіїв: " + drivers.size());
        System.out.println("Замовлень: " + orders.size());
        System.out.println("Записів відстаней: " + distanceEntries.size());
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
            System.err.println("Помилка при читанні файлу " + filename + ": " + e.getMessage());
            // e.printStackTrace(); // для дебагу
            return new ArrayList<>();
        }
    }
}