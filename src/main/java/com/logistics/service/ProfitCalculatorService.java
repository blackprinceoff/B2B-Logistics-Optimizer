package com.logistics.service;

import com.logistics.model.CalculationResult;
import com.logistics.model.Location;
import com.logistics.model.Order;
import com.logistics.model.VehicleState;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfitCalculatorService {

    private final DistanceService distanceService;
    
    private static final long MAX_WORK_TIME_MINUTES = 240;
    private static final long REQUIRED_BREAK_MINUTES = 45;
    private static final long TIME_TOLERANCE_MINUTES = 20;

    public CalculationResult calculateLogistics(VehicleState state, Order order, Map<String, Location> locMap) {
        Location vehLoc = locMap.get(state.getCurrentLocationId());
        Location pickupLoc = locMap.get(order.getPickupLocationId());

        boolean needsBreak = state.getWorkedMinutesWithoutBreak() >= MAX_WORK_TIME_MINUTES;
        long breakDuration = needsBreak ? REQUIRED_BREAK_MINUTES : 0;
        LocalDateTime availabilityTime = state.getAvailableFrom().plusMinutes(breakDuration);

        double distTransfer = distanceService.getDistanceKm(vehLoc, pickupLoc);
        long timeTransfer = (long) Math.ceil(distanceService.getTravelTimeMinutes(vehLoc, pickupLoc, availabilityTime));
        
        LocalDateTime arrivalTime = availabilityTime.plusMinutes(timeTransfer);
        long delta = Duration.between(order.getPickupTime(), arrivalTime).toMinutes();

        if (delta > TIME_TOLERANCE_MINUTES || availabilityTime.isAfter(order.getPickupTime().plusMinutes(TIME_TOLERANCE_MINUTES))) {
            return CalculationResult.invalid();
        }

        long idleMinutes = 0;
        LocalDateTime departureFromPickup;
        if (arrivalTime.isBefore(order.getPickupTime())) {
            departureFromPickup = order.getPickupTime();
            LocalDateTime optimalDeparture = order.getPickupTime().minusMinutes(timeTransfer);
            if (optimalDeparture.isBefore(availabilityTime)) optimalDeparture = availabilityTime;
            idleMinutes = Duration.between(availabilityTime, optimalDeparture).toMinutes();
            delta = 0;
        } else {
            departureFromPickup = arrivalTime;
        }

        Location dropoffLoc = locMap.get(order.getDropoffLocationId());
        double distOrder = distanceService.getDistanceKm(pickupLoc, dropoffLoc);
        long timeOrder = (long) Math.ceil(distanceService.getTravelTimeMinutes(pickupLoc, dropoffLoc, departureFromPickup));

        return CalculationResult.builder()
                .isValid(true)
                .transferDist(distTransfer).transferTime(timeTransfer)
                .orderDist(distOrder).orderTime(timeOrder)
                .idleTime(idleMinutes).breakTime(breakDuration)
                .timeDeviation(Math.max(0, delta))
                .startTime(departureFromPickup)
                .endTime(departureFromPickup.plusMinutes(timeOrder))
                .build();
    }

    public double calculateNetProfit(Order order, VehicleState state, CalculationResult calc, Map<String, Location> locMap) {
        Location vehLoc = locMap.get(state.getCurrentLocationId());
        Location pickupLoc = locMap.get(order.getPickupLocationId());
        Location dropoffLoc = locMap.get(order.getDropoffLocationId());
        Location depotLoc = locMap.get(state.getVehicle().getStartLocationId());

        double fuelFactorTransfer = distanceService.getFuelConsumptionFactor(vehLoc);
        double fuelFactorOrder = distanceService.getFuelConsumptionFactor(pickupLoc);

        double costFuel = (calc.getTransferDist() * state.getVehicle().getCostPerKm() * fuelFactorTransfer) +
                (calc.getOrderDist() * state.getVehicle().getCostPerKm() * fuelFactorOrder);

        double distToHome = distanceService.getDistanceKm(dropoffLoc, depotLoc);
        costFuel += (distToHome * state.getVehicle().getCostPerKm() * 0.5);

        long totalMinutes = calc.getIdleTime() + calc.getTransferTime() + calc.getOrderTime() + calc.getBreakTime();
        double costSalary = (totalMinutes / 60.0) * state.getDriver().getHourlyRate();
        double penalty = calc.getTimeDeviation() * 10.0;

        return order.getPrice() - (costFuel + costSalary + penalty);
    }

    public double calculateOpportunityCost(VehicleState state, CalculationResult currentCalc, List<Order> futureOrders, int lookAheadMinutes) {
        LocalDateTime finishTime = currentCalc.getEndTime();
        double maxPotentialLoss = 0.0;
        for (Order future : futureOrders) {
            if (future.getPickupTime().isAfter(finishTime.plusMinutes(lookAheadMinutes))) break;
            if (future.getPrice() > 600.0) {
                if (finishTime.plusMinutes(30).isAfter(future.getPickupTime())) {
                    double potentialProfit = future.getPrice() * 0.6;
                    if (potentialProfit > maxPotentialLoss) maxPotentialLoss = potentialProfit;
                }
            }
        }
        return maxPotentialLoss;
    }
}
