import { NextRequest, NextResponse } from 'next/server';
import { query, mockDb } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookingId = Number(id);

  try {
    const dbBookings = await query<any[]>(
      `SELECT b.*, r.available_seats, COALESCE(p.username, p.full_name) as passenger_name 
       FROM Bookings b 
       JOIN Rides r ON b.ride_id = r.ride_id 
       JOIN Users p ON b.passenger_id = p.user_id 
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    if (dbBookings && Array.isArray(dbBookings) && dbBookings.length > 0) {
      const b = dbBookings[0];
      if (b.available_seats < b.seats_requested) {
        return NextResponse.json({
          success: false,
          error: `Cannot accept: Only ${b.available_seats} seat(s) remaining, but passenger requested ${b.seats_requested}.`,
        }, { status: 400 });
      }

      await query("UPDATE Bookings SET booking_status = 'ACCEPTED' WHERE booking_id = ?", [bookingId]);
      await query("UPDATE Rides SET available_seats = available_seats - ? WHERE ride_id = ?", [b.seats_requested, b.ride_id]);

      const mockB = mockDb.bookings.find(mb => mb.booking_id === bookingId);
      if (mockB) {
        mockB.booking_status = 'ACCEPTED';
        const mockR = mockDb.rides.find(mr => mr.ride_id === mockB.ride_id);
        if (mockR) mockR.available_seats -= b.seats_requested;
      }

      return NextResponse.json({
        success: true,
        message: `Booking accepted! ${b.seats_requested} seat(s) reserved for ${b.passenger_name}.`,
        available_seats_left: b.available_seats - b.seats_requested,
      });
    }

    const booking = mockDb.bookings.find(b => b.booking_id === bookingId);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking request not found' }, { status: 404 });
    }

    const ride = mockDb.rides.find(r => r.ride_id === booking.ride_id);
    if (!ride) {
      return NextResponse.json({ success: false, error: 'Associated ride not found' }, { status: 404 });
    }

    if (ride.available_seats < booking.seats_requested) {
      return NextResponse.json({
        success: false,
        error: `Cannot accept: Only ${ride.available_seats} seat(s) remaining, but passenger requested ${booking.seats_requested}.`,
      }, { status: 400 });
    }

    ride.available_seats -= booking.seats_requested;
    booking.booking_status = 'ACCEPTED';

    return NextResponse.json({
      success: true,
      message: `Booking accepted! ${booking.seats_requested} seat(s) reserved for ${booking.passenger_name}. ${ride.available_seats} seats left in car.`,
      available_seats_left: ride.available_seats,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
