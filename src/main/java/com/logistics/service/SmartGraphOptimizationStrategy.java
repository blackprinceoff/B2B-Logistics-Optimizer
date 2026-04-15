package com.logistics.service;

import com.logistics.model.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Strategic Profit-Oriented Heuristic with Look-Ahead.
 */
@Service
@Primary
@RequiredArgsConstructor
public class SmartGraphOptimizationStrategy implements OptimizationStrategy {

    private final DistanceService distanceService;
    private final CsvDataLoaderService dataLoader;

    // КОНФІГУРАЦІЯ
    private static final double BREAKDOWN_CHANCE = 0.01;
    private static final double NO_SHOW_CHANCE = 0.03;
    private static final long MAX_WORK_TIME_MINUTES = 240;
    private static final long REQUIRED_BREAK_MINUTES = 45;
    private static final long TIME_TOLERANCE_MINUTES = 20;
    
    // Commute
    private static final double PUBLIC_TRANSPORT_COST = 15.0;
    private static final double OWN_CAR_COST_PER_KM = 4.0;
    private static final double PUBLIC_TRANSPORT_TIME_FACTOR = 2.2;

    @Setter
    private int lookAheadMinutes = 120;
    private final Random random = new Random(12345);

    @Override
    public List<RouteSegment> optimize(List<Order> orders, List<Vehicle> vehicles, List<Driver> drivers, Set<String> brokenVehicleIds) {
        List<RouteSegment> schedule = new ArrayList<>();
        Map<String, Location> locationMap = dataLoader.getLocations().stream()
                .collect(Collectors.toMap(Location::getId, loc -> loc));

        List<Order> sortedOrders = new ArrayList<>(orders);
        sortedOrders.sort(Comparator.comparing(Order::getPickupTime));

        // 1. Ініціалізація
        List<VehicleState> fleet = initializeFleet(vehicles, drivers, brokenVehicleIds, schedule, locationMap);

        System.out.println("\n--- ЗАПУСК: STRATEGIC OPTIMIZATION (Full Core) ---");

        // 2. Розподіл замовлень
        for (int i = 0; i < sortedOrders.size(); i++) {
            Order currentOrder = sortedOrders.get(i);
            List<Order> futureOrders = sortedOrders.subList(Math.min(i + 1, sortedOrders.size()), sortedOrders.size());

            boolean assigned = tryAssignOrder(currentOrder, futureOrders, fleet, schedule, brokenVehicleIds, locationMap);

            if (!assigned) {
                System.out.printf("Замовлення #%s: СКАСОВАНО (Немає ресурсів або невигідно)\n", currentOrder.getId());
            }
        }

        // 3. Повернення в депо + Додому
        returnFleetToDepotAndHome(fleet, schedule, locationMap);

        // 4. Очищення зайвих водіїв (які не працювали)
        cleanupUnusedDrivers(schedule);

        return schedule;
    }

    private void cleanupUnusedDrivers(List<RouteSegment> schedule) {
        // Знаходимо водіїв, які виконали хоча б одне замовлення
        Set<String> activeDrivers = schedule.stream()
                .filter(s -> s.getType() == SegmentType.ORDER)
                .map(RouteSegment::getDriverId)
                .collect(Collectors.toSet());

        // Видаляємо сегменти водіїв, яких немає в списку активних
        // (тобто видаляємо їхній приїзд на роботу і від'їзд, якщо вони нічого не робили)
        schedule.removeIf(s -> !activeDrivers.contains(s.getDriverId()));
        
        System.out.println("Очищення: Видалено водіїв, які не отримали замовлень.");
    }

    private boolean tryAssignOrder(Order order, List<Order> futureOrders, List<VehicleState> fleet, List<RouteSegment> schedule, Set<String> brokenVehicleIds, Map<String, Location> locMap) {
        int attempts = 0;
        while (attempts < 3 && !fleet.isEmpty()) {
            attempts++;
            OptimizationCandidate bestCandidate = findBestCandidate(order, futureOrders, fleet, brokenVehicleIds, locMap);

            if (bestCandidate == null) return false;

            VehicleState state = bestCandidate.vehicleState;

            if (simulateEvent(BREAKDOWN_CHANCE)) {
                handleBreakdown(state, order, schedule, fleet, brokenVehicleIds);
                continue; 
            }

            if (simulateEvent(NO_SHOW_CHANCE)) {
                handleNoShow(bestCandidate, schedule, order);
                return true; 
            }

            commitAssignment(bestCandidate, schedule, order);
            
            String strategicNote = bestCandidate.opportunityCost > 0
                    ? String.format(" [Risk: %.2f]", bestCandidate.opportunityCost) : "";
            System.out.printf("Замовлення #%s -> %s (Profit: %.2f)%s\n",
                    order.getId(), state.vehicle.getId(), bestCandidate.netProfit, strategicNote);

            return true;
        }
        return false;
    }

    private OptimizationCandidate findBestCandidate(Order order, List<Order> futureOrders, List<VehicleState> fleet, Set<String> brokenIds, Map<String, Location> locMap) {
        OptimizationCandidate best = null;
        // Змінено: дозволяємо невеликий мінус, якщо це допомагає виконати замовлення
        // Раніше було -Double.MAX_VALUE, але ми фільтрували по strategicScore > maxScore
        // Тепер ми хочемо брати навіть якщо profit < 0, але не катастрофічно
        double maxScore = -1000.0; // Дозволяємо збиток до 1000 грн заради виконання замовлення

        for (VehicleState state : fleet) {
            if (brokenIds.contains(state.vehicle.getId())) continue;
            if (state.vehicle.getCapacityKg() < order.getWeightKg()) continue;

            CalculationResult calc = calculateLogistics(state, order, locMap);
            if (!calc.isValid) continue;

            double currentProfit = calculateNetProfit(order, state, calc, locMap);
            double opportunityCost = calculateOpportunityCost(state, calc, futureOrders);
            double strategicScore = currentProfit - opportunityCost;

            if (strategicScore > maxScore) {
                maxScore = strategicScore;
                best = OptimizationCandidate.builder()
                        .vehicleState(state).calculation(calc)
                        .netProfit(currentProfit).opportunityCost(opportunityCost).build();
            }
        }
        // Якщо найкращий варіант все одно дуже збитковий (гірше ніж -1000), то не беремо
        if (maxScore <= -1000.0) return null;
        return best;
    }

    private double calculateOpportunityCost(VehicleState state, CalculationResult currentCalc, List<Order> futureOrders) {
        LocalDateTime finishTime = currentCalc.endTime;
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

    private CalculationResult calculateLogistics(VehicleState state, Order order, Map<String, Location> locMap) {
        Location vehLoc = locMap.get(state.currentLocationId);
        Location pickupLoc = locMap.get(order.getPickupLocationId());

        boolean needsBreak = state.workedMinutesWithoutBreak >= MAX_WORK_TIME_MINUTES;
        long breakDuration = needsBreak ? REQUIRED_BREAK_MINUTES : 0;
        LocalDateTime availabilityTime = state.availableFrom.plusMinutes(breakDuration);

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

    private double calculateNetProfit(Order order, VehicleState state, CalculationResult calc, Map<String, Location> locMap) {
        Location vehLoc = locMap.get(state.currentLocationId);
        Location pickupLoc = locMap.get(order.getPickupLocationId());
        Location dropoffLoc = locMap.get(order.getDropoffLocationId());
        Location depotLoc = locMap.get(state.vehicle.getStartLocationId());

        double fuelFactorTransfer = distanceService.getFuelConsumptionFactor(vehLoc);
        double fuelFactorOrder = distanceService.getFuelConsumptionFactor(pickupLoc);

        double costFuel = (calc.transferDist * state.vehicle.getCostPerKm() * fuelFactorTransfer) +
                (calc.orderDist * state.vehicle.getCostPerKm() * fuelFactorOrder);

        double distToHome = distanceService.getDistanceKm(dropoffLoc, depotLoc);
        costFuel += (distToHome * state.vehicle.getCostPerKm() * 0.5);

        long totalMinutes = calc.idleTime + calc.transferTime + calc.orderTime + calc.breakTime;
        double costSalary = (totalMinutes / 60.0) * state.driver.getHourlyRate();
        double penalty = calc.timeDeviation * 10.0;

        return order.getPrice() - (costFuel + costSalary + penalty);
    }

    // --- EXECUTION & EVENTS ---

    private void commitAssignment(OptimizationCandidate candidate, List<RouteSegment> schedule, Order order) {
        VehicleState state = candidate.vehicleState;
        CalculationResult calc = candidate.calculation;

        addSupportSegments(state, calc, schedule, order.getPickupLocationId());

        double salary = (calc.orderTime / 60.0) * state.driver.getHourlyRate();
        double fuel = calc.orderDist * state.vehicle.getCostPerKm() * 1.2;

        schedule.add(RouteSegment.builder()
                .vehicleId(state.vehicle.getId()).driverId(state.driver.getId())
                .type(SegmentType.ORDER).orderId(order.getId())
                .startLocationId(order.getPickupLocationId()).endLocationId(order.getDropoffLocationId())
                .startTime(calc.startTime).endTime(calc.endTime)
                .distanceKm(calc.orderDist).profitOrCost(order.getPrice() - (salary + fuel))
                .build());

        state.currentLocationId = order.getDropoffLocationId();
        state.availableFrom = calc.endTime;
        state.workedMinutesWithoutBreak += calc.orderTime;
    }

    private void handleNoShow(OptimizationCandidate candidate, List<RouteSegment> schedule, Order order) {
        System.out.println("️NO-SHOW! Клієнт не з'явився на замовлення " + order.getId());
        VehicleState state = candidate.vehicleState;
        CalculationResult calc = candidate.calculation;
        addSupportSegments(state, calc, schedule, order.getPickupLocationId());

        long waitTime = 15;
        double waitCost = (waitTime / 60.0) * state.driver.getHourlyRate();
        
        schedule.add(createSegment(state, SegmentType.WAITING, 
                order.getPickupLocationId(), order.getPickupLocationId(),
                calc.startTime, waitTime, 0, -waitCost));

        state.currentLocationId = order.getPickupLocationId();
        state.availableFrom = calc.startTime.plusMinutes(waitTime);
    }

    private void addSupportSegments(VehicleState state, CalculationResult calc, List<RouteSegment> schedule, String destId) {
        if (calc.breakTime > 0) {
            schedule.add(createSegment(state, SegmentType.WAITING, state.currentLocationId, state.currentLocationId,
                    state.availableFrom, calc.breakTime, 0, 0));
            state.availableFrom = state.availableFrom.plusMinutes(calc.breakTime);
            state.workedMinutesWithoutBreak = 0;
        }
        if (calc.idleTime > 0) {
            double cost = (calc.idleTime / 60.0) * state.driver.getHourlyRate();
            schedule.add(createSegment(state, SegmentType.WAITING, state.currentLocationId, state.currentLocationId,
                    state.availableFrom, calc.idleTime, 0, -cost));
            state.availableFrom = state.availableFrom.plusMinutes(calc.idleTime);
        }
        if (calc.transferDist > 0.01) {
            double salary = (calc.transferTime / 60.0) * state.driver.getHourlyRate();
            double fuel = calc.transferDist * state.vehicle.getCostPerKm() * 1.2;
            schedule.add(createSegment(state, SegmentType.TRANSFER, state.currentLocationId, destId,
                    state.availableFrom, calc.transferTime, calc.transferDist, -(salary + fuel)));
            state.workedMinutesWithoutBreak += calc.transferTime;
        }
    }

    private List<VehicleState> initializeFleet(List<Vehicle> vehicles, List<Driver> drivers, Set<String> brokenIds, List<RouteSegment> schedule, Map<String, Location> locMap) {
        List<VehicleState> fleet = new ArrayList<>();
        
        Map<String, List<Driver>> carpoolGroups = new HashMap<>();
        for (Driver d : drivers) {
            String key = d.getStartLocationId() + "_" + d.getShiftStart().getHour();
            carpoolGroups.computeIfAbsent(key, k -> new ArrayList<>()).add(d);
        }

        int driverIndex = 0;
        for (Vehicle v : vehicles) {
            if (brokenIds.contains(v.getId())) continue;
            Driver driver = (driverIndex < drivers.size()) ? drivers.get(driverIndex) : drivers.get(0);
            driverIndex++;

            Location driverHome = locMap.get(driver.getStartLocationId());
            Location vehicleGarage = locMap.get(v.getStartLocationId());
            LocalDateTime shiftStart = LocalDateTime.of(2025, 6, 20, driver.getShiftStart().getHour(), driver.getShiftStart().getMinute());

            double commuteDist = distanceService.getDistanceKm(driverHome, vehicleGarage);
            double ownCarTimeDouble = distanceService.getTravelTimeMinutes(driverHome, vehicleGarage, shiftStart.minusMinutes(60));
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
                System.out.println("Carpooling: Водій " + driver.getName() + " їде пасажиром.");
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
            
            // ВИПРАВЛЕНО: Використовуємо "COMMUTE" або "PUBLIC_TRANSPORT" замість ID машини
            schedule.add(RouteSegment.builder()
                    .vehicleId("COMMUTE") // Спеціальний маркер для фронтенду
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

    private void returnFleetToDepotAndHome(List<VehicleState> fleet, List<RouteSegment> schedule, Map<String, Location> locMap) {
        System.out.println("--- ЗАВЕРШЕННЯ ЗМІНИ ---");
        for (VehicleState state : fleet) {
            // 1. Повернення машини в гараж
            Location current = locMap.get(state.currentLocationId);
            Location garage = locMap.get(state.vehicle.getStartLocationId());
            double dist = distanceService.getDistanceKm(current, garage);
            LocalDateTime garageArrivalTime = state.availableFrom;

            if (dist > 0.1) {
                long time = (long) Math.ceil(distanceService.getTravelTimeMinutes(current, garage, state.availableFrom));
                double salary = (time / 60.0) * state.driver.getHourlyRate();
                double fuel = dist * state.vehicle.getCostPerKm() * 1.1;
                schedule.add(createSegment(state, SegmentType.TRANSFER, state.currentLocationId, state.vehicle.getStartLocationId(),
                        state.availableFrom, time, dist, -(salary + fuel)));
                garageArrivalTime = state.availableFrom.plusMinutes(time);
            }

            // 2. Добирання водія додому (Return Commute)
            Location home = locMap.get(state.driver.getStartLocationId());
            double commuteDist = distanceService.getDistanceKm(garage, home);
            
            // Використовуємо ту ж логіку, що і при поїздці на роботу (спрощено)
            // Припускаємо, що додому їдуть так само (авто або маршрутка)
            double commuteCost;
            long commuteTime;
            
            if (commuteDist < 1.0) {
                commuteCost = 0.0;
                commuteTime = (long) (commuteDist * 12.0);
            } else {
                // Якщо на роботу їхав машиною (дорого), то і назад машиною
                // Тут можна ускладнити, але для диплому достатньо симетрії
                commuteCost = PUBLIC_TRANSPORT_COST; 
                commuteTime = (long) (distanceService.getTravelTimeMinutes(garage, home, garageArrivalTime) * PUBLIC_TRANSPORT_TIME_FACTOR);
            }

            // ВИПРАВЛЕНО: Використовуємо "COMMUTE" або "PUBLIC_TRANSPORT" замість ID машини
            schedule.add(RouteSegment.builder()
                    .vehicleId("COMMUTE") // Спеціальний маркер для фронтенду
                    .driverId(state.driver.getId())
                    .type(SegmentType.TRANSFER)
                    .startLocationId(state.vehicle.getStartLocationId())
                    .endLocationId(state.driver.getStartLocationId())
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

    private void handleBreakdown(VehicleState state, Order order, List<RouteSegment> schedule, List<VehicleState> fleet, Set<String> brokenIds) {
        System.out.println("АВАРІЯ! Машина " + state.vehicle.getId());
        brokenIds.add(state.vehicle.getId());
        fleet.remove(state);
        schedule.add(RouteSegment.builder()
                .vehicleId(state.vehicle.getId()).type(SegmentType.BREAKDOWN)
                .startTime(order.getPickupTime()).endTime(order.getPickupTime().plusMinutes(60))
                .startLocationId(state.currentLocationId).endLocationId(state.currentLocationId)
                .profitOrCost(-500.0).build());
    }

    private RouteSegment createSegment(VehicleState s, SegmentType type, String startId, String endId, LocalDateTime start, long duration, double dist, double cost) {
        return RouteSegment.builder().vehicleId(s.vehicle.getId()).driverId(s.driver.getId()).type(type).startLocationId(startId).endLocationId(endId).startTime(start).endTime(start.plusMinutes(duration)).distanceKm(dist).profitOrCost(cost).build();
    }

    @Data
    private static class VehicleState {
        Vehicle vehicle; Driver driver; String currentLocationId; LocalDateTime availableFrom; long workedMinutesWithoutBreak = 0;
        public VehicleState(Vehicle v, Driver d, String loc, LocalDateTime time) {
            this.vehicle = v; this.driver = d; this.currentLocationId = loc; this.availableFrom = time;
        }
    }

    @Builder
    private record OptimizationCandidate(VehicleState vehicleState, CalculationResult calculation, double netProfit, double opportunityCost) {}

    @Builder
    private record CalculationResult(boolean isValid, double transferDist, long transferTime, double orderDist, long orderTime, long idleTime, long breakTime, long timeDeviation, LocalDateTime startTime, LocalDateTime endTime) {
        static CalculationResult invalid() { return new CalculationResult(false, 0, 0, 0, 0, 0, 0, 0, null, null); }
    }
}