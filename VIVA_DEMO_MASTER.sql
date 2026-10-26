USE ridesync_db;

-- Reset Demo Data
DELETE FROM Ratings WHERE booking_id > 5;
DELETE FROM Bookings WHERE booking_id > 5;
UPDATE Rides SET available_seats = 1, status = 'ACTIVE' WHERE ride_id = 1;
UPDATE Rides SET available_seats = 3, status = 'ACTIVE' WHERE ride_id = 2;
UPDATE Rides SET available_seats = 2, status = 'ACTIVE' WHERE ride_id = 3;
UPDATE Rides SET available_seats = 4, status = 'ACTIVE' WHERE ride_id = 4;
UPDATE Rides SET available_seats = 0, status = 'COMPLETED' WHERE ride_id = 5;
UPDATE Bookings SET booking_status = 'PENDING' WHERE booking_id IN (1, 2);
UPDATE Bookings SET booking_status = 'ACCEPTED' WHERE booking_id IN (3, 4, 5);
SELECT 'DATABASE RESET COMPLETE - READY FOR LIVE VIVA DEMO' AS Status;

-- Show Tables
SHOW FULL TABLES;

-- Describe Tables
DESCRIBE Users;
DESCRIBE Vehicles;
DESCRIBE Rides;
DESCRIBE Bookings;

-- ALTER TABLE Demo
ALTER TABLE Users ADD COLUMN emergency_contact VARCHAR(15) NULL;
DESCRIBE Users;
ALTER TABLE Users DROP COLUMN emergency_contact;

-- Temporary Table Demo
CREATE TABLE Test_Demo_Archive (
    archive_id INT PRIMARY KEY,
    note VARCHAR(100)
);
SHOW TABLES LIKE 'Test_Demo%';
DROP TABLE Test_Demo_Archive;

-- INSERT User Demo
INSERT INTO Users (full_name, email, password_hash, phone)
VALUES ('Siddharth Rao', 'siddharth.rao@ves.ac.in', 'hash_sidd_11', '9820990011');
SELECT * FROM Users WHERE email = 'siddharth.rao@ves.ac.in';

-- PROJECTION Demo
SELECT ride_id, source, destination, departure_time, available_seats, cost_per_seat 
FROM Rides;

-- UPDATE Fare Demo
UPDATE Rides 
SET cost_per_seat = 45.00 
WHERE ride_id = 1;
SELECT ride_id, source, destination, cost_per_seat FROM Rides WHERE ride_id = 1;

-- DELETE Demo
DELETE FROM Users WHERE email = 'siddharth.rao@ves.ac.in';

-- WHERE Filter
SELECT ride_id, source, destination, ride_date, departure_time, available_seats, cost_per_seat
FROM Rides
WHERE destination = 'VESIT Campus' AND status = 'ACTIVE' AND available_seats > 0;

-- BETWEEN Range Filter
SELECT ride_id, source, destination, cost_per_seat
FROM Rides
WHERE cost_per_seat BETWEEN 30.00 AND 60.00;

-- LIKE Pattern Matching
SELECT ride_id, source, destination, departure_time
FROM Rides
WHERE source LIKE 'Che%' OR source LIKE 'Tha%';

-- IN Operator
SELECT ride_id, source, destination, available_seats
FROM Rides
WHERE source IN ('Chembur', 'Dadar', 'Kurla');

-- Logical NOT Operator
SELECT ride_id, source, destination, departure_time, available_seats, cost_per_seat
FROM Rides
WHERE status = 'ACTIVE' 
  AND available_seats >= 2 
  AND NOT source = 'Vashi';

-- ORDER BY Sort
SELECT ride_id, source, destination, departure_time, cost_per_seat
FROM Rides
WHERE status = 'ACTIVE'
ORDER BY cost_per_seat ASC, departure_time ASC;

-- Aggregate Functions
SELECT 
    COUNT(*) AS total_rides_offered,
    MIN(cost_per_seat) AS min_student_fare,
    MAX(cost_per_seat) AS max_student_fare,
    ROUND(AVG(cost_per_seat), 2) AS avg_fare_per_seat,
    SUM(available_seats) AS total_empty_seats_available
FROM Rides
WHERE status = 'ACTIVE';

-- GROUP BY Driver
SELECT 
    u.full_name AS driver_name,
    COUNT(r.ride_id) AS total_rides_posted,
    ROUND(AVG(r.cost_per_seat), 2) AS avg_fare
FROM Users u
JOIN Rides r ON u.user_id = r.driver_id
GROUP BY u.user_id, u.full_name;

-- HAVING Filter
SELECT 
    u.full_name AS driver_name,
    COUNT(r.ride_id) AS total_rides_posted
FROM Users u
JOIN Rides r ON u.user_id = r.driver_id
GROUP BY u.user_id, u.full_name
HAVING COUNT(r.ride_id) > 1;

-- INNER JOIN Demo
SELECT 
    r.ride_id,
    u.full_name AS driver_name,
    v.model AS vehicle_model,
    v.vehicle_number,
    r.source,
    r.destination,
    r.departure_time,
    r.cost_per_seat
FROM Rides r
INNER JOIN Users u ON r.driver_id = u.user_id
INNER JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
WHERE r.status = 'ACTIVE';

-- LEFT JOIN Demo
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    COALESCE(v.model, 'No Vehicle Registered (Passenger Only)') AS vehicle_model,
    COALESCE(v.vehicle_number, 'N/A') AS vehicle_plate
FROM Users u
LEFT JOIN Vehicles v ON u.user_id = v.owner_id;

-- Multi-Table JOIN Demo
SELECT 
    b.booking_id,
    p.full_name AS passenger_name,
    p.phone AS passenger_contact,
    d.full_name AS driver_name,
    v.model AS vehicle,
    r.source,
    r.destination,
    b.seats_requested,
    b.booking_status
FROM Bookings b
JOIN Users p ON b.passenger_id = p.user_id
JOIN Rides r ON b.ride_id = r.ride_id
JOIN Users d ON r.driver_id = d.user_id
JOIN Vehicles v ON r.vehicle_id = v.vehicle_id;

-- Subquery: Below Average Fare
SELECT ride_id, source, destination, cost_per_seat
FROM Rides
WHERE cost_per_seat < (SELECT AVG(cost_per_seat) FROM Rides);

-- Subquery: Active Passengers
SELECT user_id, full_name, email, phone
FROM Users
WHERE user_id IN (
    SELECT DISTINCT passenger_id 
    FROM Bookings 
    WHERE booking_status = 'ACCEPTED'
);

-- Subquery: Inactive Users
SELECT user_id, full_name, email
FROM Users
WHERE user_id NOT IN (
    SELECT DISTINCT passenger_id FROM Bookings
);

-- Correlated Subquery: Large Vehicles
SELECT u.user_id, u.full_name, u.phone
FROM Users u
WHERE EXISTS (
    SELECT 1 FROM Vehicles v 
    WHERE v.owner_id = u.user_id AND v.capacity >= 4
);

-- Active Rides View Query
SELECT * FROM vw_AvailableActiveRides;

-- Driver Analytics View Query
SELECT * FROM vw_DriverAnalytics;

-- Calculate Fare Function Test
SELECT 
    40.00 AS original_fare_per_seat,
    2 AS seats_booked,
    fn_CalculateFareWithDiscount(40.00, 2, TRUE) AS final_concession_fare;

-- Driver Ride Report Procedure Test
CALL sp_DriverRideReport(1);

-- Trigger Test: Prevent Self-Booking
INSERT INTO Bookings (ride_id, passenger_id, seats_requested, booking_status)
VALUES (1, 1, 1, 'PENDING');

-- Trigger Test: Ride Status Audit
UPDATE Rides SET status = 'CANCELLED' WHERE ride_id = 2;
SELECT * FROM Ride_Logs ORDER BY log_id DESC LIMIT 3;
UPDATE Rides SET status = 'ACTIVE' WHERE ride_id = 2;

-- User Lifecycle Test
INSERT INTO Users (full_name, email, password_hash, phone)
VALUES ('Tanvi Shah', 'tanvi.shah@ves.ac.in', 'hash_tanvi_45', '9820123456');
SELECT * FROM Users WHERE email = 'tanvi.shah@ves.ac.in';
DELETE FROM Users WHERE email = 'tanvi.shah@ves.ac.in';

-- Constraint Test: Unique Email
INSERT INTO Users (full_name, email, password_hash, phone)
VALUES ('Duplicate Aarav', 'aarav.sharma@ves.ac.in', 'hash_test', '9999999999');

-- Ride Search Test
INSERT INTO Rides (driver_id, vehicle_id, source, destination, ride_date, departure_time, available_seats, cost_per_seat, status)
VALUES (2, 2, 'Mulund', 'VESIT Campus', '2026-10-27', '08:00:00', 3, 55.00, 'ACTIVE');
SELECT * FROM Rides WHERE source = 'Mulund';
DELETE FROM Rides WHERE source = 'Mulund';

SELECT * FROM Rides 
WHERE source = 'Thane' AND destination = 'VESIT Campus' AND available_seats > 0 AND status = 'ACTIVE';

SELECT ride_id, source, destination, available_seats 
FROM Rides 
WHERE available_seats >= 3 AND status = 'ACTIVE';

-- Procedure Test: Successful Booking
INSERT INTO Bookings (ride_id, passenger_id, seats_requested, booking_status)
VALUES (2, 6, 1, 'PENDING');
SELECT * FROM Bookings WHERE ride_id = 2 AND passenger_id = 6;
DELETE FROM Bookings WHERE ride_id = 2 AND passenger_id = 6;

CALL sp_AcceptBooking(1, @result_msg);
SELECT @result_msg AS Result_T07;
SELECT booking_id, booking_status FROM Bookings WHERE booking_id = 1;
SELECT ride_id, available_seats FROM Rides WHERE ride_id = 1;

-- Procedure Test: Prevent Overbooking
CALL sp_AcceptBooking(2, @result_msg_overbook);
SELECT @result_msg_overbook AS Result_T08;
SELECT booking_id, booking_status FROM Bookings WHERE booking_id = 2;
SELECT ride_id, available_seats FROM Rides WHERE ride_id = 1;

-- Constraint Test: Positive Fare Check
INSERT INTO Rides (driver_id, vehicle_id, source, destination, ride_date, departure_time, available_seats, cost_per_seat, status)
VALUES (1, 1, 'Kurla', 'VESIT Campus', '2026-10-27', '08:30:00', 2, -50.00, 'ACTIVE');

-- Foreign Key Violation Test
INSERT INTO Bookings (ride_id, passenger_id, seats_requested, booking_status)
VALUES (9999, 4, 1, 'PENDING');

-- Ratings Query
SELECT 
    r.rating_id,
    p.full_name AS passenger_name,
    d.full_name AS driver_name,
    rd.source,
    rd.destination,
    r.rating_value,
    r.review
FROM Ratings r
JOIN Bookings b ON r.booking_id = b.booking_id
JOIN Users p ON b.passenger_id = p.user_id
JOIN Rides rd ON b.ride_id = rd.ride_id
JOIN Users d ON rd.driver_id = d.user_id;

-- Cancel Booking Demo
UPDATE Bookings SET booking_status = 'CANCELLED' WHERE booking_id = 2;
SELECT booking_id, ride_id, booking_status FROM Bookings WHERE booking_id = 2;

-- ACID Transaction Rollback Demo
START TRANSACTION;
UPDATE Rides SET cost_per_seat = 999.00 WHERE ride_id = 3;
SELECT ride_id, cost_per_seat FROM Rides WHERE ride_id = 3;
ROLLBACK;
SELECT ride_id, cost_per_seat FROM Rides WHERE ride_id = 3;

-- DCL Permissions Check
SHOW GRANTS FOR 'ridesync_operator'@'localhost';

-- Query Execution Plan
EXPLAIN SELECT * FROM Rides 
WHERE source = 'Chembur' AND destination = 'VESIT Campus' AND status = 'ACTIVE';

-- Final Reset
UPDATE Rides SET available_seats = 1, status = 'ACTIVE' WHERE ride_id = 1;
UPDATE Rides SET available_seats = 3, status = 'ACTIVE' WHERE ride_id = 2;
UPDATE Bookings SET booking_status = 'PENDING' WHERE booking_id IN (1, 2);
SELECT 'ALL DEMO DATA RESET FOR NEXT PRESENTATION' AS Status;
