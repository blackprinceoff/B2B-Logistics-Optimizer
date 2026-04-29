package com.logistics.service;

import com.logistics.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ForceMajeureService {

    public void handleBreakdown(VehicleState state, Order order, List<RouteSegment> schedule, List<VehicleState> fleet, Set<String> brokenIds) {
        log.warn("BREAKDOWN! Vehicle {}", state.getVehicle().getId());
        brokenIds.add(state.getVehicle().getId());
        fleet.remove(state);
        schedule.add(RouteSegment.builder()
                .vehicleId(state.getVehicle().getId()).type(SegmentType.BREAKDOWN)
                .startTime(order.getPickupTime()).endTime(order.getPickupTime().plusMinutes(60))
                .startLocationId(state.getCurrentLocationId()).endLocationId(state.getCurrentLocationId())
                .profitOrCost(-500.0).build());
    }

    public void handleNoShow(OptimizationCandidate candidate, List<RouteSegment> schedule, Order order, SmartGraphOptimizationStrategy strategy) {
        log.warn("NO-SHOW! Client failed to show up for order {}", order.getId());
        VehicleState state = candidate.getVehicleState();
        CalculationResult calc = candidate.getCalculation();
        
        strategy.addSupportSegments(state, calc, schedule, order.getPickupLocationId());

        long waitTime = 15;
        double waitCost = (waitTime / 60.0) * state.getDriver().getHourlyRate();
        
        schedule.add(strategy.createSegment(state, SegmentType.WAITING, 
                order.getPickupLocationId(), order.getPickupLocationId(),
                calc.getStartTime(), waitTime, 0, -waitCost));

        state.setCurrentLocationId(order.getPickupLocationId());
        state.setAvailableFrom(calc.getStartTime().plusMinutes(waitTime));
    }
}
