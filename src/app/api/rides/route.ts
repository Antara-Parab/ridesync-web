import { NextRequest, NextResponse } from 'next/server';
import { query, mockDb, MockRide } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const destination = searchParams.get('destination');

    const sqlRides = await query<any[]>(`
      SELECT 
        r.ride_id,
        r.driver_id,
        COALESCE(u.username, u.full_name) AS driver_name,
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
      WHERE r.status = 'ACTIVE' AND r.available_seats > 0
      ORDER BY r.departure_time ASC
    `);

    if (sqlRides !== null && Array.isArray(sqlRides)) {
      let filtered = sqlRides;
      if (source) {
        filtered = filtered.filter(r => r.source.toLowerCase().includes(source.toLowerCase()));
      }
      if (destination) {
        filtered = filtered.filter(r => r.destination.toLowerCase().includes(destination.toLowerCase()));
      }
      return NextResponse.json({ success: true, rides: filtered, source: 'mysql' });
    }

    let rides = (mockDb.rides || []).filter(r => r.status === 'ACTIVE' && r.available_seats > 0);
    if (source) {
      rides = rides.filter(r => r.source.toLowerCase().includes(source.toLowerCase()));
    }
    if (destination) {
      rides = rides.filter(r => r.destination.toLowerCase().includes(destination.toLowerCase()));
    }

    return NextResponse.json({ success: true, rides, source: 'local' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driver_name, driver_phone, vehicle_model, vehicle_number, source, destination, departure_time, available_seats, cost_per_seat } = body;

    if (!driver_name || !source || !destination || !departure_time || !available_seats) {
      return NextResponse.json({ success: false, error: 'Please provide all ride details' }, { status: 400 });
    }

    const fare = cost_per_seat !== undefined && cost_per_seat !== '' ? Number(cost_per_seat) : 0;
    const seats = Number(available_seats) || 3;

    let driverId = 60003;
    let vehicleId = 60002;
    const cleanDriverName = driver_name.trim();
    const cleanPlate = (vehicle_number || 'MH-04-KR-9798').trim().toUpperCase();
    const cleanModel = (vehicle_model || 'Honda Amaze').trim();

    const uRows = await query<any[]>('SELECT user_id FROM Users WHERE LOWER(username) = LOWER(?) OR LOWER(full_name) = LOWER(?)', [cleanDriverName, cleanDriverName]);
    if (uRows && uRows.length > 0) {
      driverId = uRows[0].user_id;
    }

    const vPlateRows = await query<any[]>('SELECT vehicle_id FROM Vehicles WHERE vehicle_number = ?', [cleanPlate]);
    if (vPlateRows && vPlateRows.length > 0) {
      vehicleId = vPlateRows[0].vehicle_id;
    } else {
      const vOwnerRows = await query<any[]>('SELECT vehicle_id FROM Vehicles WHERE owner_id = ?', [driverId]);
      if (vOwnerRows && vOwnerRows.length > 0) {
        vehicleId = vOwnerRows[0].vehicle_id;
        await query('UPDATE Vehicles SET model = ?, vehicle_number = ?, capacity = ? WHERE vehicle_id = ?', [
          cleanModel, cleanPlate, seats + 1, vehicleId
        ]);
      } else {
        const vRes: any = await query(
          'INSERT INTO Vehicles (owner_id, model, vehicle_number, capacity) VALUES (?, ?, ?, ?)',
          [driverId, cleanModel, cleanPlate, seats + 1]
        );
        if (vRes?.insertId) vehicleId = vRes.insertId;
      }
    }

    const dbRes: any = await query(
      `INSERT INTO Rides (driver_id, vehicle_id, source, destination, ride_date, departure_time, available_seats, cost_per_seat, status)
       VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, 'ACTIVE')`,
      [driverId, vehicleId, source, destination, departure_time, seats, fare]
    );

    const newRideId = dbRes?.insertId || (mockDb.rides.length + 1);

    const newRide: MockRide = {
      ride_id: newRideId,
      driver_id: driverId,
      driver_name: cleanDriverName || 'Student Driver',
      driver_phone: driver_phone || '9820112233',
      vehicle_model: cleanModel,
      vehicle_number: cleanPlate,
      source,
      destination,
      ride_date: new Date().toISOString().split('T')[0],
      departure_time,
      available_seats: seats,
      cost_per_seat: fare,
      status: 'ACTIVE',
    };

    mockDb.rides.unshift(newRide);

    return NextResponse.json({
      success: true,
      message: 'Carpool ride published! Other students can now book seats.',
      ride: newRide,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rideId = searchParams.get('id');

    if (!rideId) {
      return NextResponse.json({ success: false, error: 'Ride ID is required' }, { status: 400 });
    }

    const idNum = Number(rideId);

    const rRows = await query<any[]>('SELECT vehicle_id FROM Rides WHERE ride_id = ?', [idNum]);
    const vehicleId = rRows && rRows.length > 0 ? rRows[0].vehicle_id : null;

    if (vehicleId) {
      const otherRides = await query<any[]>('SELECT ride_id FROM Rides WHERE vehicle_id = ? AND ride_id != ? LIMIT 1', [vehicleId, idNum]);
      const canDeleteVehicle = !otherRides || otherRides.length === 0;

      if (canDeleteVehicle) {
        await query('DELETE FROM Vehicles WHERE vehicle_id = ?', [vehicleId]);
      } else {
        await query('DELETE FROM Bookings WHERE ride_id = ?; DELETE FROM Rides WHERE ride_id = ?', [idNum, idNum]);
      }
    } else {
      await query('DELETE FROM Bookings WHERE ride_id = ?; DELETE FROM Rides WHERE ride_id = ?', [idNum, idNum]);
    }

    mockDb.rides = mockDb.rides.filter(r => r.ride_id !== idNum);
    mockDb.bookings = mockDb.bookings.filter(b => b.ride_id !== idNum);

    return NextResponse.json({
      success: true,
      message: 'Carpool ride and associated vehicle deleted successfully!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
