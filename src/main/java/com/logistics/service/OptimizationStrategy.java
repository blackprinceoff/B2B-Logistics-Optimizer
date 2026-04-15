package com.logistics.service;

import com.logistics.model.Driver;
import com.logistics.model.Order;
import com.logistics.model.RouteSegment;
import com.logistics.model.Vehicle;

import java.util.List;
import java.util.Set;

public interface OptimizationStrategy {
    // Додали brokenVehicleIds
    List<RouteSegment> optimize(List<Order> orders, List<Vehicle> vehicles, List<Driver> drivers, Set<String> brokenVehicleIds);
}