package com.logistics.model;

import com.opencsv.bean.CsvBindByName;
import lombok.Data;

@Data
public class DistanceEntry {
    @CsvBindByName(column = "from_id")
    private String fromId;

    @CsvBindByName(column = "to_id")
    private String toId;

    @CsvBindByName(column = "distance_km")
    private double distanceKm;

    @CsvBindByName(column = "duration_min")
    private double durationMin;
}