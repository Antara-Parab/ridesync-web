export const INITIALIZE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Vehicles (
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

CREATE TABLE IF NOT EXISTS Rides (
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

CREATE TABLE IF NOT EXISTS Bookings (
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

CREATE TABLE IF NOT EXISTS Ratings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    rating_value INT NOT NULL,
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rating_booking FOREIGN KEY (booking_id) 
        REFERENCES Bookings(booking_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_rating_range CHECK (rating_value BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Ride_Logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_AvailableActiveRides AS
SELECT 
    r.ride_id,
    r.driver_id,
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
`;

export const SEED_DATA_SQL = `
INSERT IGNORE INTO Users (user_id, full_name, email, password_hash, phone) VALUES
(1, 'Aarav Sharma',   'aarav.sharma@ves.ac.in',   'hash_aarav_99',   '9820112233'),
(2, 'Priya Patel',    'priya.patel@ves.ac.in',    'hash_priya_88',   '9820223344'),
(3, 'Rohan Mehta',    'rohan.mehta@ves.ac.in',    'hash_rohan_77',   '9820334455'),
(4, 'Ananya Iyer',    'ananya.iyer@ves.ac.in',    'hash_ananya_66',  '9820445566'),
(5, 'Kabir Verma',    'kabir.verma@ves.ac.in',    'hash_kabir_55',   '9820556677'),
(6, 'Neha Kulkarni',  'neha.kulkarni@ves.ac.in',  'hash_neha_44',    '9820667788'),
(7, 'Devansh Joshi',  'devansh.joshi@ves.ac.in',  'hash_devansh_33', '9820778899'),
(8, 'Isha Deshmukh',  'isha.deshmukh@ves.ac.in',  'hash_isha_22',    '9820889900');

INSERT IGNORE INTO Vehicles (vehicle_id, owner_id, vehicle_number, model, capacity) VALUES
(1, 1, 'MH-01-AB-1234', 'Hyundai i20',      4),
(2, 2, 'MH-02-CD-5678', 'Honda City',       4),
(3, 3, 'MH-03-EF-9012', 'Maruti Baleno',    3),
(4, 5, 'MH-04-GH-3456', 'Tata Nexon EV',    4);

INSERT IGNORE INTO Rides (ride_id, driver_id, vehicle_id, source, destination, ride_date, departure_time, available_seats, cost_per_seat, status) VALUES
(1, 1, 1, 'Chembur',   'VESIT Campus', '2026-10-26', '08:15:00', 1, 40.00,  'ACTIVE'),
(2, 2, 2, 'Thane',     'VESIT Campus', '2026-10-26', '07:45:00', 3, 75.00,  'ACTIVE'),
(3, 3, 3, 'Dadar',     'VESIT Campus', '2026-10-26', '08:30:00', 2, 50.00,  'ACTIVE'),
(4, 5, 4, 'Vashi',     'VESIT Campus', '2026-10-26', '08:00:00', 4, 60.00,  'ACTIVE'),
(5, 1, 1, 'Ghatkopar', 'VESIT Campus', '2026-10-25', '08:30:00', 0, 35.00,  'COMPLETED');

INSERT IGNORE INTO Bookings (booking_id, ride_id, passenger_id, seats_requested, booking_status, booked_at) VALUES
(1, 1, 4, 1, 'PENDING',  '2026-10-25 18:00:00'),
(2, 1, 6, 2, 'PENDING',  '2026-10-25 18:30:00'),
(3, 2, 7, 1, 'ACCEPTED', '2026-10-25 19:00:00'),
(4, 3, 8, 1, 'ACCEPTED', '2026-10-25 19:30:00'),
(5, 5, 4, 1, 'ACCEPTED', '2026-10-24 20:00:00');

INSERT IGNORE INTO Ratings (rating_id, booking_id, rating_value, review) VALUES
(1, 5, 5, 'Punctual driver, smooth ride to morning lecture!');

INSERT IGNORE INTO Ride_Logs (ride_id, old_status, new_status, changed_at) VALUES
(5, 'ACTIVE', 'COMPLETED', '2026-10-25 09:30:00');
`;
