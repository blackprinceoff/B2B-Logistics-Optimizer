package com.logistics.model;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class Order {
    @CsvBindByName(column = "id")
    private String id;

    @CsvBindByName(column = "pickup_loc_id")
    private String pickupLocationId;

    @CsvBindByName(column = "dropoff_loc_id")
    private String dropoffLocationId;

    @CsvBindByName(column = "pickup_time")
    @CsvDate("yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime pickupTime;

    @CsvBindByName(column = "dropoff_time_estimated")
    @CsvDate("yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dropoffTimeEstimated;

    @CsvBindByName(column = "price")
    private double price;

    @CsvBindByName(column = "weight_kg")
    private double weightKg;
}