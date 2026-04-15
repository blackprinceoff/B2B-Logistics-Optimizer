package com.logistics.model;

import com.opencsv.bean.CsvBindByName;
import lombok.Data;

@Data
public class Location {
    @CsvBindByName(column = "id")
    private String id;

    @CsvBindByName(column = "name")
    private String name;

    @CsvBindByName(column = "latitude")
    private double latitude;

    @CsvBindByName(column = "longitude")
    private double longitude;

    @CsvBindByName(column = "is_depot")
    private boolean isDepot;

    @CsvBindByName(column = "zone")
    private String zone;

}
