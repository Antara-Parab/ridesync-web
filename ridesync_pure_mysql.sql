DROP DATABASE IF EXISTS ridesync_db;
CREATE DATABASE ridesync_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ridesync_db;

SET GLOBAL log_bin_trust_function_creators = 1;

-- Users Table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Vehicles Table
CREATE TABLE Vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL UNIQUE,
    model VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_owner FOREIGN KEY (owner_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_vehicle_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

-- Rides Table
CREATE TABLE Rides (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    ride_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    available_seats INT NOT NULL,
    cost_per_seat DECIMAL(8, 2) NOT NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ride_driver FOREIGN KEY (driver_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ride_vehicle FOREIGN KEY (vehicle_id) 
        REFERENCES Vehicles(vehicle_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_available_seats CHECK (available_seats >= 0),
    CONSTRAINT chk_cost_per_seat CHECK (cost_per_seat >= 0)
) ENGINE=InnoDB;

-- Bookings Table
CREATE TABLE Bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    passenger_id INT NOT NULL,
    seats_requested INT NOT NULL DEFAULT 1,
    booking_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_fare DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    discounted_fare DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_booking_ride FOREIGN KEY (ride_id) 
        REFERENCES Rides(ride_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_booking_passenger FOREIGN KEY (passenger_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_seats_requested CHECK (seats_requested > 0)
) ENGINE=InnoDB;

-- Ratings Table
CREATE TABLE Ratings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    rating_value INT NOT NULL,
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rating_booking FOREIGN KEY (booking_id) 
        REFERENCES Bookings(booking_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_rating_range CHECK (rating_value BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- Ride Logs Table
CREATE TABLE Ride_Logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Performance Indexes
CREATE INDEX idx_rides_search ON Rides(source, destination, ride_date, status);
CREATE INDEX idx_bookings_status ON Bookings(ride_id, booking_status);

-- Active Rides View
CREATE OR REPLACE VIEW vw_AvailableActiveRides AS
SELECT 
    r.ride_id,
    u.full_name AS driver_name,
    u.phone AS driver_phone,
    v.model AS vehicle_model,
    v.vehicle_number,
    r.source,
    r.destination,
    r.ride_date,
    r.departure_time,
    r.available_seats,
    r.cost_per_seat,
    r.status
FROM Rides r
JOIN Users u ON r.driver_id = u.user_id
JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
WHERE r.status = 'ACTIVE' AND r.available_seats > 0;

-- Driver Analytics View
CREATE OR REPLACE VIEW vw_DriverAnalytics AS
SELECT 
    u.user_id AS driver_id,
    u.full_name AS driver_name,
    COUNT(r.ride_id) AS total_rides_offered,
    COALESCE(AVG(r.cost_per_seat), 0) AS avg_seat_cost,
    COALESCE(SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_rides
FROM Users u
LEFT JOIN Rides r ON u.user_id = r.driver_id
GROUP BY u.user_id, u.full_name;

DELIMITER $$

-- Prevent Self-Booking Trigger
DROP TRIGGER IF EXISTS trg_prevent_self_booking$$
CREATE TRIGGER trg_prevent_self_booking
BEFORE INSERT ON Bookings
FOR EACH ROW
BEGIN
    DECLARE v_driver_id INT;
    SELECT driver_id INTO v_driver_id FROM Rides WHERE ride_id = NEW.ride_id;
    IF NEW.passenger_id = v_driver_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Integrity Violation: Driver cannot book seats on their own ride!';
    END IF;
END$$

-- Ride Status Audit Trigger
DROP TRIGGER IF EXISTS trg_ride_status_audit$$
CREATE TRIGGER trg_ride_status_audit
AFTER UPDATE ON Rides
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO Ride_Logs (ride_id, old_status, new_status, changed_at)
        VALUES (NEW.ride_id, OLD.status, NEW.status, NOW());
    END IF;
END$$

-- Fare Calculation Function
DROP FUNCTION IF EXISTS fn_CalculateFareWithDiscount$$
CREATE FUNCTION fn_CalculateFareWithDiscount(
    p_cost_per_seat DECIMAL(8,2),
    p_seats INT,
    p_is_college_student BOOLEAN
)
RETURNS DECIMAL(8,2)
DETERMINISTIC
BEGIN
    DECLARE v_total DECIMAL(8,2);
    SET v_total = p_cost_per_seat * p_seats;
    IF p_is_college_student THEN
        SET v_total = v_total * 0.90;
    END IF;
    RETURN ROUND(v_total, 2);
END$$

-- Accept Booking Procedure
DROP PROCEDURE IF EXISTS sp_AcceptBooking$$
CREATE PROCEDURE sp_AcceptBooking(
    IN p_booking_id INT,
    OUT p_status_msg VARCHAR(150)
)
proc_label: BEGIN
    DECLARE v_ride_id INT;
    DECLARE v_seats_req INT;
    DECLARE v_avail_seats INT;
    DECLARE v_current_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_msg = 'ERROR: Transaction rolled back due to SQL Exception';
    END;

    START TRANSACTION;

    SELECT ride_id, seats_requested, booking_status 
    INTO v_ride_id, v_seats_req, v_current_status
    FROM Bookings 
    WHERE booking_id = p_booking_id;

    IF v_ride_id IS NULL THEN
        ROLLBACK;
        SET p_status_msg = 'FAILED: Booking record not found';
        LEAVE proc_label;
    END IF;

    IF v_current_status <> 'PENDING' THEN
        ROLLBACK;
        SET p_status_msg = CONCAT('FAILED: Booking is already ', v_current_status);
        LEAVE proc_label;
    END IF;

    SELECT available_seats INTO v_avail_seats
    FROM Rides
    WHERE ride_id = v_ride_id
    FOR UPDATE;

    IF v_avail_seats >= v_seats_req THEN
        UPDATE Bookings 
        SET booking_status = 'ACCEPTED' 
        WHERE booking_id = p_booking_id;

        UPDATE Rides 
        SET available_seats = available_seats - v_seats_req 
        WHERE ride_id = v_ride_id;

        COMMIT;
        SET p_status_msg = CONCAT('SUCCESS: Booking accepted! ', v_seats_req, ' seat(s) confirmed.');
    ELSE
        ROLLBACK;
        SET p_status_msg = CONCAT('FAILED: Insufficient seats! Requested: ', v_seats_req, ', Available: ', v_avail_seats);
    END IF;
END$$

-- Driver Ride Manifest Cursor Procedure
DROP PROCEDURE IF EXISTS sp_DriverRideReport$$
CREATE PROCEDURE sp_DriverRideReport(
    IN p_driver_id INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_ride_id INT;
    DECLARE v_src VARCHAR(100);
    DECLARE v_dest VARCHAR(100);
    DECLARE v_seats INT;
    DECLARE v_fare DECIMAL(8,2);

    DECLARE cur_rides CURSOR FOR 
        SELECT ride_id, source, destination, available_seats, cost_per_seat 
        FROM Rides 
        WHERE driver_id = p_driver_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    DROP TEMPORARY TABLE IF EXISTS temp_manifest;
    CREATE TEMPORARY TABLE temp_manifest (
        ride_id INT,
        route VARCHAR(220),
        seats_left INT,
        seat_fare DECIMAL(8,2)
    );

    OPEN cur_rides;

    read_loop: LOOP
        FETCH cur_rides INTO v_ride_id, v_src, v_dest, v_seats, v_fare;
        IF done THEN
            LEAVE read_loop;
        END IF;
        INSERT INTO temp_manifest VALUES (v_ride_id, CONCAT(v_src, ' -> ', v_dest), v_seats, v_fare);
    END LOOP;

    CLOSE cur_rides;

    SELECT * FROM temp_manifest;
    DROP TEMPORARY TABLE IF EXISTS temp_manifest;
END$$

DELIMITER ;

-- Seed Data: Users
INSERT INTO Users (user_id, full_name, email, password_hash, phone) VALUES
(1, 'Aarav Sharma',   'aarav.sharma@ves.ac.in',   'hash_aarav_99',   '9820112233'),
(2, 'Priya Patel',    'priya.patel@ves.ac.in',    'hash_priya_88',   '9820223344'),
(3, 'Rohan Mehta',    'rohan.mehta@ves.ac.in',    'hash_rohan_77',   '9820334455'),
(4, 'Ananya Iyer',    'ananya.iyer@ves.ac.in',    'hash_ananya_66',  '9820445566'),
(5, 'Kabir Verma',    'kabir.verma@ves.ac.in',    'hash_kabir_55',   '9820556677'),
(6, 'Neha Kulkarni',  'neha.kulkarni@ves.ac.in',  'hash_neha_44',    '9820667788'),
(7, 'Devansh Joshi',  'devansh.joshi@ves.ac.in',  'hash_devansh_33', '9820778899'),
(8, 'Isha Deshmukh',  'isha.deshmukh@ves.ac.in',  'hash_isha_22',    '9820889900');

-- Seed Data: Vehicles
INSERT INTO Vehicles (vehicle_id, owner_id, vehicle_number, model, capacity) VALUES
(1, 1, 'MH-01-AB-1234', 'Hyundai i20',      4),
(2, 2, 'MH-02-CD-5678', 'Honda City',       4),
(3, 3, 'MH-03-EF-9012', 'Maruti Baleno',    3),
(4, 5, 'MH-04-GH-3456', 'Tata Nexon EV',    4);

-- Seed Data: Rides
INSERT INTO Rides (ride_id, driver_id, vehicle_id, source, destination, ride_date, departure_time, available_seats, cost_per_seat, status) VALUES
(1, 1, 1, 'Chembur',   'VESIT Campus', '2026-10-26', '08:15:00', 1, 40.00,  'ACTIVE'),
(2, 2, 2, 'Thane',     'VESIT Campus', '2026-10-26', '07:45:00', 3, 75.00,  'ACTIVE'),
(3, 3, 3, 'Dadar',     'VESIT Campus', '2026-10-26', '08:30:00', 2, 50.00,  'ACTIVE'),
(4, 5, 4, 'Vashi',     'VESIT Campus', '2026-10-26', '08:00:00', 4, 60.00,  'ACTIVE'),
(5, 1, 1, 'Ghatkopar', 'VESIT Campus', '2026-10-25', '08:30:00', 0, 35.00,  'COMPLETED');

-- Seed Data: Bookings
INSERT INTO Bookings (booking_id, ride_id, passenger_id, seats_requested, booking_status, booked_at) VALUES
(1, 1, 4, 1, 'PENDING',  '2026-10-25 18:00:00'),
(2, 1, 6, 2, 'PENDING',  '2026-10-25 18:30:00'),
(3, 2, 7, 1, 'ACCEPTED', '2026-10-25 19:00:00'),
(4, 3, 8, 1, 'ACCEPTED', '2026-10-25 19:30:00'),
(5, 5, 4, 1, 'ACCEPTED', '2026-10-24 20:00:00');

-- Seed Data: Ratings
INSERT INTO Ratings (rating_id, booking_id, rating_value, review) VALUES
(1, 5, 5, 'Punctual driver, smooth ride to morning lecture!');

-- Seed Data: Ride Logs
INSERT INTO Ride_Logs (ride_id, old_status, new_status, changed_at) VALUES
(5, 'ACTIVE', 'COMPLETED', '2026-10-25 09:30:00');

-- User Permissions
DROP USER IF EXISTS 'ridesync_operator'@'localhost';
CREATE USER 'ridesync_operator'@'localhost' IDENTIFIED BY 'Operator@123';
GRANT SELECT ON ridesync_db.Bookings TO 'ridesync_operator'@'localhost';
GRANT SELECT ON ridesync_db.vw_AvailableActiveRides TO 'ridesync_operator'@'localhost';
FLUSH PRIVILEGES;
