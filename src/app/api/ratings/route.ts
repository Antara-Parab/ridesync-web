import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Submit rating
export async function POST(req: NextRequest) {
  try {
    const { booking_id, rating_value, review } = await req.json();

    if (!booking_id || !rating_value) {
      return NextResponse.json({ success: false, error: 'Booking ID and rating value (1-5) are required' }, { status: 400 });
    }

    const bId = Number(booking_id);
    const stars = Math.min(5, Math.max(1, Number(rating_value) || 5));
    const feedback = (review || 'Great trip to VESIT campus!').trim();

    const existing = await query<any[]>('SELECT rating_id FROM Ratings WHERE booking_id = ?', [bId]);
    if (existing && existing.length > 0) {
      await query('UPDATE Ratings SET rating_value = ?, review = ?, created_at = NOW() WHERE booking_id = ?', [stars, feedback, bId]);
    } else {
      await query('INSERT INTO Ratings (booking_id, rating_value, review, created_at) VALUES (?, ?, ?, NOW())', [bId, stars, feedback]);
    }

    return NextResponse.json({
      success: true,
      message: '⭐ Feedback submitted successfully! Record saved to Ratings table.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Fetch all ratings
export async function GET() {
  try {
    const rows = await query<any[]>('SELECT * FROM Ratings ORDER BY rating_id DESC');
    return NextResponse.json({ success: true, ratings: rows || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
