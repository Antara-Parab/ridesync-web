import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { ride_id } = await req.json();

    if (!ride_id) {
      return NextResponse.json({ success: false, error: 'Ride ID is required' }, { status: 400 });
    }

    const idNum = Number(ride_id);

    const rRows = await query<any[]>('SELECT status FROM Rides WHERE ride_id = ?', [idNum]);
    const oldStatus = (rRows && rRows.length > 0) ? rRows[0].status : 'ACTIVE';

    await query('UPDATE Rides SET status = ? WHERE ride_id = ?', ['COMPLETED', idNum]);

    await query(
      'INSERT INTO Ride_Logs (ride_id, old_status, new_status, changed_at) VALUES (?, ?, ?, NOW())',
      [idNum, oldStatus, 'COMPLETED']
    );

    return NextResponse.json({
      success: true,
      message: '🎉 Trip completed successfully! Audit log created in Ride_Logs.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
