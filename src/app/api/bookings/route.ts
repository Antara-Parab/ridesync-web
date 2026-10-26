import { NextRequest, NextResponse } from 'next/server';
import { query, mockDb, MockBooking } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rideId = searchParams.get('ride_id');

    const sqlBookings = await query<any[]>(`
      SELECT 
        b.booking_id,
        b.ride_id,
        b.passenger_id,
        COALESCE(p.username, p.full_name) AS passenger_name,
        p.phone AS passenger_phone,
        COALESCE(d.username, d.full_name) AS driver_name,
        r.source,
        r.destination,
        r.departure_time,
        r.cost_per_seat,
        b.seats_requested,
        COALESCE(b.total_fare, (b.seats_requested * r.cost_per_seat)) AS total_fare,
        COALESCE(b.discounted_fare, ROUND((b.seats_requested * r.cost_per_seat * 0.90), 2)) AS discounted_fare,
        b.booking_status,
        b.booked_at
      FROM Bookings b
      JOIN Rides r ON b.ride_id = r.ride_id
      JOIN Users p ON b.passenger_id = p.user_id
      JOIN Users d ON r.driver_id = d.user_id
      ORDER BY b.booking_id DESC
    `);

    if (sqlBookings !== null && Array.isArray(sqlBookings)) {
      let result = sqlBookings;
      if (rideId) {
        result = result.filter(b => b.ride_id === Number(rideId));
      }
      return NextResponse.json({ success: true, bookings: result, source: 'mysql' });
    }

    let bookings = mockDb.bookings;
    if (rideId) {
      bookings = bookings.filter(b => b.ride_id === Number(rideId));
    }
    return NextResponse.json({ success: true, bookings, source: 'local' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await query('DELETE FROM Bookings');
    await query('UPDATE Rides SET available_seats = 3 WHERE available_seats < 3');
    mockDb.bookings = [];
    return NextResponse.json({ success: true, message: 'All bookings cleared from database.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      ride_id, 
      passenger_name, 
      passenger_phone, 
      seats_requested, 
      apply_student_discount 
    } = body;

    const rideId = Number(ride_id);
    const seatsReq = Number(seats_requested) || 1;
    const hasDiscount = Boolean(apply_student_discount);

    let driverName = 'Aarav Sharma';
    let unitPrice = 0;
    let rideSource = 'Chembur';
    let rideDestination = 'VESIT Campus';
    let rideDepartureTime = '08:15 AM';
    let availableSeats = 3;

    const dbRide = await query<any[]>('SELECT r.*, COALESCE(u.username, u.full_name) as driver_name FROM Rides r JOIN Users u ON r.driver_id = u.user_id WHERE r.ride_id = ?', [rideId]);
    if (dbRide && dbRide.length > 0) {
      driverName = dbRide[0].driver_name;
      unitPrice = Number(dbRide[0].cost_per_seat) || 0;
      rideSource = dbRide[0].source || 'Chembur';
      rideDestination = dbRide[0].destination || 'VESIT Campus';
      rideDepartureTime = dbRide[0].departure_time || '08:15 AM';
      availableSeats = Number(dbRide[0].available_seats) || 0;
    } else {
      const mockRide = mockDb.rides.find(r => r.ride_id === rideId);
      if (mockRide) {
        driverName = mockRide.driver_name;
        unitPrice = Number(mockRide.cost_per_seat) || 0;
        rideSource = mockRide.source || 'Chembur';
        rideDestination = mockRide.destination || 'VESIT Campus';
        rideDepartureTime = mockRide.departure_time || '08:15 AM';
        availableSeats = Number(mockRide.available_seats) || 0;
      }
    }

    if (seatsReq > availableSeats) {
      return NextResponse.json({
        success: false,
        error: `Only ${availableSeats} seat(s) available on this ride! You requested ${seatsReq}.`,
      }, { status: 400 });
    }

    const cleanPassenger = (passenger_name || '').trim().toLowerCase();
    const cleanDriver = (driverName || '').trim().toLowerCase();
    if (cleanPassenger && cleanDriver && cleanPassenger === cleanDriver) {
      return NextResponse.json({
        success: false,
        error: 'You cannot book a seat on your own ride! You are the driver.',
      }, { status: 400 });
    }

    const baseFare = Number((seatsReq * unitPrice).toFixed(2));
    const discountAmount = hasDiscount ? Number((baseFare * 0.10).toFixed(2)) : 0;
    const finalFare = Number((baseFare - discountAmount).toFixed(2));

    let passengerId = 4;
    const pRows = await query<any[]>('SELECT user_id FROM Users WHERE LOWER(username) = LOWER(?) OR LOWER(full_name) = LOWER(?)', [passenger_name, passenger_name]);
    if (pRows && pRows.length > 0) {
      passengerId = pRows[0].user_id;
    }

    const existingBooking = await query<any[]>(
      'SELECT booking_id FROM Bookings WHERE ride_id = ? AND passenger_id = ? AND booking_status IN ("PENDING", "ACCEPTED")',
      [rideId, passengerId]
    );
    if (existingBooking && existingBooking.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'You have already applied or booked a seat for this carpool ride!',
      }, { status: 400 });
    }

    await query(
      `INSERT INTO Bookings (ride_id, passenger_id, seats_requested, total_fare, discounted_fare, booking_status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [rideId, passengerId, seatsReq, baseFare, finalFare]
    );

    const newBooking: MockBooking = {
      booking_id: mockDb.bookings.length + 1,
      ride_id: rideId,
      driver_name: driverName,
      passenger_id: passengerId,
      passenger_name: passenger_name || 'VESIT Student',
      passenger_phone: passenger_phone || '9820445566',
      source: rideSource,
      destination: rideDestination,
      departure_time: rideDepartureTime,
      cost_per_seat: unitPrice,
      seats_requested: seatsReq,
      has_student_discount: hasDiscount,
      total_fare: baseFare,
      discounted_fare: finalFare,
      booking_status: 'PENDING',
      booked_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    mockDb.bookings.unshift(newBooking);

    return NextResponse.json({
      success: true,
      message: `Booking request sent to driver ${driverName}! Total fare: ₹${finalFare}.`,
      booking: newBooking,
      arithmetic: {
        seats: seatsReq,
        price_per_seat: unitPrice,
        base_fare: baseFare,
        discount_rate: hasDiscount ? '10%' : '0%',
        discount_amount: discountAmount,
        final_payable: finalFare,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
