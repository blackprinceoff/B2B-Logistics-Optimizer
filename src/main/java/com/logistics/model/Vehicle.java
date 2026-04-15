package com.logistics.model;

import com.opencsv.bean.CsvBindByName;
import lombok.Data;

@Data
public class Vehicle {
    @CsvBindByName(column = "id")
    private String id;

    @CsvBindByName(column = "type")
    private String type;

    @CsvBindByName(column = "license_plate")
    private String licensePlate;

    @CsvBindByName(column = "cost_per_km")
    private double costPerKm;

    @CsvBindByName(column = "speed_avg_kmh")
    private double speedAvgKmh;

    @CsvBindByName(column = "start_location_id")
    private String startLocationId;

    @CsvBindByName(column = "capacity_kg")
    private double capacityKg;
}