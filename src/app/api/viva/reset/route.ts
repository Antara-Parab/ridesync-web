import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Reset database for demonstration
export async function POST() {
  try {
    await query('DELETE FROM Ratings WHERE booking_id > 5');
    await query('DELETE FROM Bookings WHERE booking_id > 5');
    await query("UPDATE Rides SET available_seats = 1, status = 'ACTIVE' WHERE ride_id = 1");
    await query("UPDATE Rides SET available_seats = 3, status = 'ACTIVE' WHERE ride_id = 2");
    await query("UPDATE Rides SET available_seats = 2, status = 'ACTIVE' WHERE ride_id = 3");
    await query("UPDATE Rides SET available_seats = 4, status = 'ACTIVE' WHERE ride_id = 4");
    await query("UPDATE Rides SET available_seats = 0, status = 'COMPLETED' WHERE ride_id = 5");
    await query("UPDATE Bookings SET booking_status = 'PENDING' WHERE booking_id IN (1, 2)");
    await query("UPDATE Bookings SET booking_status = 'ACCEPTED' WHERE booking_id IN (3, 4, 5)");

    return NextResponse.json({
      success: true,
      message: 'DATABASE RESET COMPLETE: Restored clean initial state for Viva presentation!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
