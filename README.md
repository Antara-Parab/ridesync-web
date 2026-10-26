# CampusPool — VESIT College Carpool Matching System 🚗🎓

A real-world, deployment-ready college carpool web application for VESIT students to share car rides, reduce travel costs, and commute comfortably to campus with dynamic student-shared fares.

## 👩‍💻 Author & Project Details
- **Student**: Antara Parab
- **Institution**: VESIT (Vivekanand Education Society's Institute of Technology)
- **Course**: Database Management Systems (DBMS)
- **Live Database**: TiDB Serverless Cloud MySQL (`ridesync_db`)

---

## 🛠️ Tech Stack & System Architecture

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | Modern React framework with Server Components & Turbopack build engine |
| **UI Library** | **React 19** | Component-driven declarative user interface |
| **Styling** | **Tailwind CSS v4** | Next-gen utility-first responsive styling |
| **Icons** | **Lucide React** | Clean, lightweight modern icons |
| **Backend & APIs** | **Next.js Serverless Routes** | RESTful endpoints (`/api/rides`, `/api/bookings`, `/api/ratings`, `/api/admin/tables`) |
| **Primary Database** | **TiDB Cloud (Serverless MySQL)** | Distributed, MySQL 8.0+ wire-compatible cloud database hosted on AWS |
| **Database Driver** | **mysql2/promise** | High-performance MySQL client with connection pooling and SSL/TLS encryption |
| **Cloud Deployment** | **Vercel** | Automated continuous deployment tracking GitHub `main` branch |
| **Version Control** | **Git & GitHub** | Distributed version control repository |

### 🗄️ Database & SQL Architecture (DBMS Focus)
- **Relational Schema Design**: 6 normalized tables (`Users`, `Vehicles`, `Rides`, `Bookings`, `Ratings`, `Ride_Logs`) maintaining 3NF data integrity.
- **Constraints**: Enforces foreign keys with `ON DELETE CASCADE` and `ON UPDATE CASCADE`, along with business check constraints (`capacity > 0`, `cost_per_seat >= 0`, `seats_requested > 0`, `rating_value BETWEEN 1 AND 5`).
- **Database Views**: Pre-compiled SQL views for active carpool discovery (`vw_AvailableActiveRides`) and driver performance reporting (`vw_DriverAnalytics`).
- **Stored Procedures & ACID Transactions**: Transactional seat reservation using row-level locking (`SELECT ... FOR UPDATE`) to prevent race conditions and overbooking (`sp_AcceptBooking`), plus driver manifest generation with SQL Cursors (`sp_DriverRideReport`).
- **Triggers**: Automated integrity enforcement (`trg_prevent_self_booking`) and audit tracking (`trg_ride_status_audit` logging all status transitions into `Ride_Logs`).
- **Performance Indexes**: Composite indexes on search filters (`source`, `destination`, `ride_date`, `status`) and foreign key relationships for sub-millisecond query execution.

---

## 🌟 The Core Flow

1. **Find & Book Rides (Passenger Flow)**:
   - Students search for carpool routes traveling to/from VESIT Campus (Chembur, Dadar, Thane, Vashi, Kurla, etc.).
   - View car details (driver name, car model, plate number, departure time, and remaining empty seats).
   - **Student ID Discount (Arithmetic Calculation)**:
     - Driver-Set Rent: Cost per seat configured by the student driver
     - Base Rent: `Seats Requested × Rent per Seat`
     - VESIT Student Subsidy: `-10% Discount`
     - Final Payable: `Base Rent - 10% Discount`
   - Instant booking request sent directly to the student driver.

2. **Offer a Ride (Driver Flow)**:
   - Students driving to college can list their empty seats in 60 seconds.
   - Enter pickup point (Point A), drop point (Point B), departure time, car model, seats available, and custom rent per seat.
   - Classmates can immediately discover and apply for the ride.

3. **My Rides & Driver Approvals**:
   - Drivers review incoming ride requests and click **Accept** or **Decline**.
   - When a booking is accepted, the car's available seats automatically decrement in real-time.
   - Passengers can track their booking status (`Confirmed`, `Pending Approval`, or `Declined`).

4. **Live Database Table Viewer (Admin Portal)**:
   - Log in with username `admin` and password `123`.
   - Real-time live inspection of all 6 TiDB database tables (`Users`, `Vehicles`, `Rides`, `Bookings`, `Ratings`, `Ride_Logs`).
   - One-click **Refresh Tables** button to fetch the latest state directly from the database.

---

## 🚀 Instant Deployment on Vercel

1. Open [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** ➔ **"Project"**.
3. Import **`Antara-Parab/ridesync-web`**.
4. Click **Deploy**!
*(The app features a zero-config resilient engine that runs immediately out-of-the-box on Vercel, and seamlessly binds to cloud MySQL if credentials are added).*

---

## 💻 Running Locally

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
