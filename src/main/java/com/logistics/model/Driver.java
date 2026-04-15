package com.logistics.model;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import lombok.Data;

import java.time.LocalTime;

@Data
public class Driver {
    @CsvBindByName(column = "id")
    private String id;

    @CsvBindByName(column = "name")
    private String name;

    @CsvBindByName(column = "hourly_rate")
    private double hourlyRate;

    @CsvBindByName(column = "start_location_id")
    private String startLocationId;

    @CsvBindByName(column = "shift_start")
    @CsvDate("HH:mm")
    private LocalTime shiftStart;

    @CsvBindByName(column = "shift_end")
    @CsvDate("HH:mm")
    private LocalTime shiftEnd;
}