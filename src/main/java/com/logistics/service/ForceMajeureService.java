package com.logistics.service;

import com.logistics.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
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

    public void handleNoShow(OptimizationCandidate candidate, List<RouteSegment> schedule, Order order, SmartGraphOptimizationStrategy strategy, Map<String, Vehicle> vehicleMap) {
        log.warn("NO-SHOW! Client failed to show up for order {}", order.getId());
        VehicleState state = candidate.getVehicleState();
        CalculationResult calc = candidate.getCalculation();
        
        // Always do the transfer (we only realize it's a no-show when we arrive)
        strategy.addSupportSegments(state, calc, schedule, order.getPickupLocationId(), vehicleMap);

        // Option A: Wait 15 mins, client shows up, we fulfill
        double waitCostA = (15.0 / 60.0) * state.getDriver().getHourlyRate();
        double profitA = candidate.getNetProfit() - waitCostA;
        
        // Option B: Cancel immediately
        double transferCost = (calc.getTransferDist() * state.getVehicle().getCostPerKm() * 1.2) + 
                              ((calc.getTransferTime() / 60.0) * state.getDriver().getHourlyRate());
        double profitB = -transferCost;

        // Option C: Wait 5 mins to confirm, abort, but charge 50% penalty fee
        double waitCostC = (5.0 / 60.0) * state.getDriver().getHourlyRate();
        double profitC = (order.getPrice() * 0.5) - transferCost - waitCostC;

        if (profitA >= profitB && profitA >= profitC) {
            log.info("Force-Majeure Decision: Option A (Wait and fulfill). Expected profit: {}", String.format("%.2f", profitA));
            schedule.add(strategy.createSegment(state, SegmentType.WAITING, 
                    order.getPickupLocationId(), order.getPickupLocationId(),
                    state.getAvailableFrom(), 15, 0, -waitCostA));
            state.setAvailableFrom(state.getAvailableFrom().plusMinutes(15));
            
            double salary = (calc.getOrderTime() / 60.0) * state.getDriver().getHourlyRate();
            double fuel = calc.getOrderDist() * state.getVehicle().getCostPerKm() * 1.2;
            schedule.add(RouteSegment.builder()
                    .vehicleId(state.getVehicle().getId()).driverId(state.getDriver().getId())
                    .type(SegmentType.ORDER).orderId(order.getId())
                    .startLocationId(order.getPickupLocationId()).endLocationId(order.getDropoffLocationId())
                    .startTime(state.getAvailableFrom()).endTime(state.getAvailableFrom().plusMinutes(calc.getOrderTime()))
                    .distanceKm(calc.getOrderDist()).profitOrCost(order.getPrice() - (salary + fuel))
                    .build());
                    
            state.setCurrentLocationId(order.getDropoffLocationId());
            state.setAvailableFrom(state.getAvailableFrom().plusMinutes(calc.getOrderTime()));
            state.setWorkedMinutesWithoutBreak(state.getWorkedMinutesWithoutBreak() + calc.getOrderTime() + 15);
            
        } else if (profitC > profitB) {
            log.info("Force-Majeure Decision: Option C (Charge penalty). Expected profit: {}", String.format("%.2f", profitC));
            schedule.add(strategy.createSegment(state, SegmentType.WAITING, 
                    order.getPickupLocationId(), order.getPickupLocationId(),
                    state.getAvailableFrom(), 5, 0, -waitCostC));
            state.setAvailableFrom(state.getAvailableFrom().plusMinutes(5));
            
            schedule.add(strategy.createSegment(state, SegmentType.ORDER, 
                    order.getPickupLocationId(), order.getPickupLocationId(),
                    state.getAvailableFrom(), 0, 0, order.getPrice() * 0.5));
        } else {
            log.info("Force-Majeure Decision: Option B (Cancel immediately). Expected profit: {}", String.format("%.2f", profitB));
        }
    }
}
