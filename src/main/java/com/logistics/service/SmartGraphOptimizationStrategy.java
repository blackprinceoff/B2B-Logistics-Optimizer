package com.logistics.service;

import com.logistics.model.*;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import com.logistics.dto.MidDayOptimizationRequest;

/**
 * Strategic Profit-Oriented Heuristic with Look-Ahead.
 */
@Slf4j
@Service
@Primary
@RequiredArgsConstructor
public class SmartGraphOptimizationStrategy implements OptimizationStrategy {

    private final DistanceService distanceService;
    private final CsvDataLoaderService dataLoader;
    private final ProfitCalculatorService profitCalculatorService;
    private final ForceMajeureService forceMajeureService;

    // Configuration
    private static final double BREAKDOWN_CHANCE = 0.01;
    private static final double NO_SHOW_CHANCE = 0.03;

    // Commute
    private static final double PUBLIC_TRANSPORT_COST = 15.0;
    private static final double OWN_CAR_COST_PER_KM = 4.0;
    private static final double PUBLIC_TRANSPORT_TIME_FACTOR = 2.2;

    @Setter
    private int lookAheadMinutes = 120;
    private final Random random = new Random(12345);

    @Override
    public List<RouteSegment> optimize(List<Order> orders, List<Vehicle> vehicles, List<Driver> drivers,
            Set<String> brokenVehicleIds) {
        List<RouteSegment> schedule = new ArrayList<>();
        Map<String, Location> locationMap = dataLoader.getLocations().stream()
                .collect(Collectors.toMap(Location::getId, loc -> loc));

        List<Order> sortedOrders = new ArrayList<>(orders);
        sortedOrders.sort(Comparator.comparing(Order::getPickupTime));

        // 1. Initialization
        List<VehicleState> fleet = initializeFleet(vehicles, drivers, brokenVehicleIds, schedule, locationMap);

        log.info("--- STARTING: STRATEGIC OPTIMIZATION (Full Core) ---");

        Map<String, Vehicle> vehicleMap = vehicles.stream()
                .collect(Collectors.toMap(Vehicle::getId, v -> v));

        // 2. Order Distribution
        for (int i = 0; i < sortedOrders.size(); i++) {
            Order currentOrder = sortedOrders.get(i);
            List<Order> futureOrders = sortedOrders.subList(Math.min(i + 1, sortedOrders.size()), sortedOrders.size());

            boolean assigned = tryAssignOrder(currentOrder, futureOrders, fleet, schedule, brokenVehicleIds,
                    locationMap, vehicleMap);

            if (!assigned) {
                log.warn("Order #{}: CANCELLED (No resources or not profitable)", currentOrder.getId());
            }
        }

        // 3. Return to Depot and Home Commute
        returnFleetToDepotAndHome(fleet, schedule, locationMap);

        // 4. Cleanup unused drivers
        cleanupUnusedDrivers(schedule);

        return schedule;
    }

    public List<RouteSegment> optimizeMidDay(MidDayOptimizationRequest request, List<Vehicle> allVehicles,
            List<Driver> allDrivers, Set<String> brokenVehicleIds) {
        List<RouteSegment> schedule = new ArrayList<>();
        Map<String, Location> locationMap = dataLoader.getLocations().stream()
                .collect(Collectors.toMap(Location::getId, loc -> loc));

        List<Order> sortedOrders = new ArrayList<>(request.remainingOrders());
        sortedOrders.sort(Comparator.comparing(Order::getPickupTime));

        List<VehicleState> fleet = new ArrayList<>();
        Map<String, Vehicle> vehicleMap = allVehicles.stream().collect(Collectors.toMap(Vehicle::getId, v -> v));
        Map<String, Driver> driverMap = allDrivers.stream().collect(Collectors.toMap(Driver::getId, d -> d));

        for (MidDayOptimizationRequest.DriverCurrentState stateDto : request.driverStates()) {
            Vehicle v = vehicleMap.get(stateDto.vehicleId());
            Driver d = driverMap.get(stateDto.driverId());
            if (v != null && d != null && !brokenVehicleIds.contains(v.getId())) {
                VehicleState state = new VehicleState(v, d, stateDto.currentLocationId(), stateDto.availableFrom());
                fleet.add(state);
            }
        }

        log.info("--- STARTING: MID-DAY RE-OPTIMIZATION at {} ---", request.currentTime());

        for (int i = 0; i < sortedOrders.size(); i++) {
            Order currentOrder = sortedOrders.get(i);
            List<Order> futureOrders = sortedOrders.subList(Math.min(i + 1, sortedOrders.size()), sortedOrders.size());
            boolean assigned = tryAssignOrder(currentOrder, futureOrders, fleet, schedule, brokenVehicleIds,
                    locationMap, vehicleMap);
            if (!assigned) {
                log.warn("Order #{}: CANCELLED (No resources or not profitable)", currentOrder.getId());
            }
        }

        returnFleetToDepotAndHome(fleet, schedule, locationMap);
        cleanupUnusedDrivers(schedule);

        return schedule;
    }

    private void cleanupUnusedDrivers(List<RouteSegment> schedule) {
        Set<String> activeDrivers = schedule.stream()
                .filter(s -> s.getType() == SegmentType.ORDER)
                .map(RouteSegment::getDriverId)
                .collect(Collectors.toSet());

        schedule.removeIf(s -> !activeDrivers.contains(s.getDriverId()));
        log.info("Cleanup: Removed drivers with no assigned orders.");
    }

    private boolean tryAssignOrder(Order order, List<Order> futureOrders, List<VehicleState> fleet,
            List<RouteSegment> schedule, Set<String> brokenVehicleIds, Map<String, Location> locMap,
            Map<String, Vehicle> vehicleMap) {
        int attempts = 0;
        while (attempts < 3 && !fleet.isEmpty()) {
            attempts++;
            OptimizationCandidate bestCandidate = findBestCandidate(order, futureOrders, fleet, brokenVehicleIds,
                    locMap);

            if (bestCandidate == null)
                return false;

            VehicleState state = bestCandidate.getVehicleState();

            if (simulateEvent(BREAKDOWN_CHANCE)) {
                forceMajeureService.handleBreakdown(state, order, schedule, fleet, brokenVehicleIds);
                continue;
            }

            if (simulateEvent(NO_SHOW_CHANCE)) {
                forceMajeureService.handleNoShow(bestCandidate, schedule, order, this, vehicleMap);
                return true;
            }

            commitAssignment(bestCandidate, schedule, order, vehicleMap);

            String strategicNote = bestCandidate.getOpportunityCost() > 0
                    ? String.format(" [Risk: %.2f]", bestCandidate.getOpportunityCost())
                    : "";
            log.info("Order #{} -> {} (Profit: %.2f){}",
                    order.getId(), state.getVehicle().getId(), bestCandidate.getNetProfit(), strategicNote);

            return true;
        }
        return false;
    }

    private OptimizationCandidate findBestCandidate(Order order, List<Order> futureOrders, List<VehicleState> fleet,
            Set<String> brokenIds, Map<String, Location> locMap) {
        OptimizationCandidate best = null;
        double maxScore = -1000.0;

        for (VehicleState state : fleet) {
            if (brokenIds.contains(state.getVehicle().getId()))
                continue;
            if (state.getVehicle().getCapacityKg() < order.getWeightKg())
                continue;

            CalculationResult calc = profitCalculatorService.calculateLogistics(state, order, locMap);
            if (!calc.isValid())
                continue;

            double currentProfit = profitCalculatorService.calculateNetProfit(order, state, calc, locMap);
            double opportunityCost = profitCalculatorService.calculateOpportunityCost(state, calc, futureOrders,
                    lookAheadMinutes);
            double strategicScore = currentProfit - opportunityCost;

            if (strategicScore > maxScore) {
                maxScore = strategicScore;
                best = OptimizationCandidate.builder()
                        .vehicleState(state).calculation(calc)
                        .netProfit(currentProfit).opportunityCost(opportunityCost).build();
            }
        }
        if (maxScore <= -1000.0)
            return null;
        return best;
    }

    private void commitAssignment(OptimizationCandidate candidate, List<RouteSegment> schedule, Order order,
            Map<String, Vehicle> vehicleMap) {
        VehicleState state = candidate.getVehicleState();
        CalculationResult calc = candidate.getCalculation();

        addSupportSegments(state, calc, schedule, order.getPickupLocationId(), vehicleMap);

        double salary = (calc.getOrderTime() / 60.0) * state.getDriver().getHourlyRate();
        double fuel = calc.getOrderDist() * state.getVehicle().getCostPerKm() * 1.2;

        schedule.add(RouteSegment.builder()
                .vehicleId(state.getVehicle().getId()).driverId(state.getDriver().getId())
                .type(SegmentType.ORDER).orderId(order.getId())
                .startLocationId(order.getPickupLocationId()).endLocationId(order.getDropoffLocationId())
                .startTime(calc.getStartTime()).endTime(calc.getEndTime())
                .distanceKm(calc.getOrderDist()).profitOrCost(order.getPrice() - (salary + fuel))
                .build());

        state.setCurrentLocationId(order.getDropoffLocationId());
        state.setAvailableFrom(calc.getEndTime());
        state.setWorkedMinutesWithoutBreak(state.getWorkedMinutesWithoutBreak() + calc.getOrderTime());
    }

    public void addSupportSegments(VehicleState state, CalculationResult calc, List<RouteSegment> schedule,
            String destId, Map<String, Vehicle> vehicleMap) {
        if (calc.getBreakTime() > 0) {
            schedule.add(createSegment(state, SegmentType.WAITING, state.getCurrentLocationId(),
                    state.getCurrentLocationId(),
                    state.getAvailableFrom(), calc.getBreakTime(), 0, 0));
            state.setAvailableFrom(state.getAvailableFrom().plusMinutes(calc.getBreakTime()));
            state.setWorkedMinutesWithoutBreak(0);
        }
        if (calc.getIdleTime() > 0) {
            double cost = (calc.getIdleTime() / 60.0) * state.getDriver().getHourlyRate();
            schedule.add(createSegment(state, SegmentType.WAITING, state.getCurrentLocationId(),
                    state.getCurrentLocationId(),
                    state.getAvailableFrom(), calc.getIdleTime(), 0, -cost));
            state.setAvailableFrom(state.getAvailableFrom().plusMinutes(calc.getIdleTime()));
        }
        if (calc.getTransferDist() > 0.01) {
            boolean carpooled = tryCarpooling(state, calc, schedule, destId, vehicleMap);
            if (!carpooled) {
                double salary = (calc.getTransferTime() / 60.0) * state.getDriver().getHourlyRate();
                double fuel = calc.getTransferDist() * state.getVehicle().getCostPerKm() * 1.2;
                schedule.add(createSegment(state, SegmentType.TRANSFER, state.getCurrentLocationId(), destId,
                        state.getAvailableFrom(), calc.getTransferTime(), calc.getTransferDist(), -(salary + fuel)));
                state.setWorkedMinutesWithoutBreak(state.getWorkedMinutesWithoutBreak() + calc.getTransferTime());
            }
        }
    }

    private boolean tryCarpooling(VehicleState state, CalculationResult calc, List<RouteSegment> schedule,
            String destId, Map<String, Vehicle> vehicleMap) {
        if (!"MOTORCYCLE".equals(state.getVehicle().getType()) || calc.getTransferDist() < 5.0) {
            return false;
        }

        for (RouteSegment seg : schedule) {
            Vehicle candidateVehicle = vehicleMap.get(seg.getVehicleId());
            if (candidateVehicle == null || seg.getVehicleId().equals(state.getVehicle().getId()))
                continue;

            if ("MINIVAN".equals(candidateVehicle.getType())) {
                if (seg.getStartTime().isBefore(state.getAvailableFrom().plusMinutes(15)) &&
                        seg.getEndTime().isAfter(state.getAvailableFrom())) {

                    log.info("Dynamic Workforce Routing: Driver {} (scooter) carpools with {} to {}",
                            state.getDriver().getId(), seg.getVehicleId(), destId);

                    double salary = (calc.getTransferTime() / 60.0) * state.getDriver().getHourlyRate();
                    schedule.add(createSegment(state, SegmentType.TRANSFER, state.getCurrentLocationId(), destId,
                            state.getAvailableFrom(), calc.getTransferTime(), calc.getTransferDist(), -salary));
                    state.setWorkedMinutesWithoutBreak(state.getWorkedMinutesWithoutBreak() + calc.getTransferTime());
                    return true;
                }
            }
        }
        return false;
    }

    private List<VehicleState> initializeFleet(List<Vehicle> vehicles, List<Driver> drivers, Set<String> brokenIds,
            List<RouteSegment> schedule, Map<String, Location> locMap) {
        List<VehicleState> fleet = new ArrayList<>();

        Map<String, List<Driver>> carpoolGroups = new HashMap<>();
        for (Driver d : drivers) {
            String key = d.getStartLocationId() + "_" + d.getShiftStart().getHour();
            carpoolGroups.computeIfAbsent(key, k -> new ArrayList<>()).add(d);
        }

        int driverIndex = 0;
        for (Vehicle v : vehicles) {
            if (brokenIds.contains(v.getId()))
                continue;
            Driver driver = (driverIndex < drivers.size()) ? drivers.get(driverIndex) : drivers.get(0);
            driverIndex++;

            Location driverHome = locMap.get(driver.getStartLocationId());
            Location vehicleGarage = locMap.get(v.getStartLocationId());
            LocalDateTime shiftStart = LocalDateTime.of(2025, 6, 20, driver.getShiftStart().getHour(),
                    driver.getShiftStart().getMinute());

            double commuteDist = distanceService.getDistanceKm(driverHome, vehicleGarage);
            double ownCarTimeDouble = distanceService.getTravelTimeMinutes(driverHome, vehicleGarage,
                    shiftStart.minusMinutes(60));
            long ownCarTime = (long) Math.ceil(ownCarTimeDouble);
            long publicTransportTime = (long) (ownCarTime * PUBLIC_TRANSPORT_TIME_FACTOR);

            String groupKey = driver.getStartLocationId() + "_" + driver.getShiftStart().getHour();
            List<Driver> group = carpoolGroups.get(groupKey);
            boolean isPassenger = false;

            if (group != null && group.size() > 1 && group.indexOf(driver) > 0) {
                isPassenger = true;
            }

            double commuteCost;
            long finalCommuteTime;

            if (commuteDist < 1.0) {
                commuteCost = 0.0;
                finalCommuteTime = (long) (commuteDist * 12.0);
            } else if (isPassenger) {
                commuteCost = 0.0;
                finalCommuteTime = ownCarTime;
                log.info("Carpooling: Driver {} rides as a passenger.", driver.getName());
            } else {
                if (publicTransportTime > 90) {
                    commuteCost = commuteDist * OWN_CAR_COST_PER_KM;
                    finalCommuteTime = ownCarTime;
                } else {
                    commuteCost = PUBLIC_TRANSPORT_COST;
                    finalCommuteTime = publicTransportTime;
                }
            }

            LocalDateTime commuteStart = shiftStart.minusMinutes(finalCommuteTime);

            schedule.add(RouteSegment.builder()
                    .vehicleId("COMMUTE")
                    .driverId(driver.getId())
                    .type(SegmentType.TRANSFER)
                    .startLocationId(driver.getStartLocationId())
                    .endLocationId(v.getStartLocationId())
                    .startTime(commuteStart)
                    .endTime(commuteStart.plusMinutes(finalCommuteTime))
                    .distanceKm(commuteDist)
                    .profitOrCost(-commuteCost)
                    .build());

            fleet.add(new VehicleState(v, driver, v.getStartLocationId(), shiftStart));
        }
        return fleet;
    }

    private void returnFleetToDepotAndHome(List<VehicleState> fleet, List<RouteSegment> schedule,
            Map<String, Location> locMap) {
        log.info("--- SHIFT END ---");
        for (VehicleState state : fleet) {
            Location current = locMap.get(state.getCurrentLocationId());
            Location garage = locMap.get(state.getVehicle().getStartLocationId());
            double dist = distanceService.getDistanceKm(current, garage);
            LocalDateTime garageArrivalTime = state.getAvailableFrom();

            if (dist > 0.1) {
                long time = (long) Math
                        .ceil(distanceService.getTravelTimeMinutes(current, garage, state.getAvailableFrom()));
                double salary = (time / 60.0) * state.getDriver().getHourlyRate();
                double fuel = dist * state.getVehicle().getCostPerKm() * 1.1;
                schedule.add(createSegment(state, SegmentType.TRANSFER, state.getCurrentLocationId(),
                        state.getVehicle().getStartLocationId(),
                        state.getAvailableFrom(), time, dist, -(salary + fuel)));
                garageArrivalTime = state.getAvailableFrom().plusMinutes(time);
            }

            Location home = locMap.get(state.getDriver().getStartLocationId());
            double commuteDist = distanceService.getDistanceKm(garage, home);

            double commuteCost;
            long commuteTime;

            if (commuteDist < 1.0) {
                commuteCost = 0.0;
                commuteTime = (long) (commuteDist * 12.0);
            } else {
                commuteCost = PUBLIC_TRANSPORT_COST;
                commuteTime = (long) (distanceService.getTravelTimeMinutes(garage, home, garageArrivalTime)
                        * PUBLIC_TRANSPORT_TIME_FACTOR);
            }

            schedule.add(RouteSegment.builder()
                    .vehicleId("COMMUTE")
                    .driverId(state.getDriver().getId())
                    .type(SegmentType.TRANSFER)
                    .startLocationId(state.getVehicle().getStartLocationId())
                    .endLocationId(state.getDriver().getStartLocationId())
                    .startTime(garageArrivalTime)
                    .endTime(garageArrivalTime.plusMinutes(commuteTime))
                    .distanceKm(commuteDist)
                    .profitOrCost(-commuteCost)
                    .build());
        }
    }

    private boolean simulateEvent(double chance) {
        return random.nextDouble() < chance;
    }

    public RouteSegment createSegment(VehicleState s, SegmentType type, String startId, String endId,
            LocalDateTime start, long duration, double dist, double cost) {
        return RouteSegment.builder().vehicleId(s.getVehicle().getId()).driverId(s.getDriver().getId()).type(type)
                .startLocationId(startId).endLocationId(endId).startTime(start).endTime(start.plusMinutes(duration))
                .distanceKm(dist).profitOrCost(cost).build();
    }
}