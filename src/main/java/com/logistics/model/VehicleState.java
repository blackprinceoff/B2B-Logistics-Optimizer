package com.logistics.model;

import lombok.Data;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class VehicleState {
    private Vehicle vehicle;
    private Driver driver;
    private String currentLocationId;
    private LocalDateTime availableFrom;
    private long workedMinutesWithoutBreak;

    public VehicleState(Vehicle v, Driver d, String loc, LocalDateTime time) {
        this.vehicle = v;
        this.driver = d;
        this.currentLocationId = loc;
        this.availableFrom = time;
        this.workedMinutesWithoutBreak = 0;
    }
}
