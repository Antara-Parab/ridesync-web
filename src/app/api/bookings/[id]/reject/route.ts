import { NextRequest, NextResponse } from 'next/server';
import { query, mockDb } from '@/lib/db';

// Reject booking request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookingId = Number(id);

  try {
    const booking = mockDb.bookings.find(b => b.booking_id === bookingId);
    if (booking) {
      booking.booking_status = 'REJECTED';
    }

    await query("UPDATE Bookings SET booking_status = 'REJECTED' WHERE booking_id = ?", [bookingId]);

    return NextResponse.json({
      success: true,
      message: 'Booking request rejected.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
