# CampusPool — VESIT College Carpool Matching System 🚗🎓

A real-world, deployment-ready college carpool web application for VESIT students to share car rides, reduce travel costs, and commute comfortably to campus with dynamic student-shared fares.

## 👩‍💻 Author & Project Details
- **Student**: Antara Parab
- **Institution**: VESIT (Vivekanand Education Society's Institute of Technology)
- **Course**: Database Management Systems (DBMS)
- **Live Database**: TiDB Serverless Cloud MySQL (`ridesync_db`)

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
