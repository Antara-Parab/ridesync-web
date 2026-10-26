import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let isDbAvailable: boolean | null = null;

export interface MockRide {
  ride_id: number;
  driver_id: number;
  driver_name: string;
  driver_phone: string;
  vehicle_model: string;
  vehicle_number: string;
  source: string;
  destination: string;
  ride_date: string;
  departure_time: string;
  available_seats: number;
  cost_per_seat: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface MockBooking {
  booking_id: number;
  ride_id: number;
  driver_name: string;
  passenger_id: number;
  passenger_name: string;
  passenger_phone: string;
  source: string;
  destination: string;
  departure_time: string;
  cost_per_seat: number;
  seats_requested: number;
  has_student_discount: boolean;
  total_fare: number;
  discounted_fare: number;
  booking_status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  booked_at: string;
}

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

export const mockDb = {
  rides: [] as MockRide[],
  bookings: [] as MockBooking[],
};

export function getDbPool(): mysql.Pool | null {
  if (process.env.MYSQL_HOST) {
    if (!globalThis._mysqlPool) {
      try {
        const host = process.env.MYSQL_HOST;
        const port = Number(process.env.MYSQL_PORT) || 3306;
        const user = process.env.MYSQL_USER || 'root';
        const password = process.env.MYSQL_PASSWORD ?? '';
        const database = process.env.MYSQL_DATABASE || 'ridesync_db';
        const sslRequired = process.env.MYSQL_SSL === 'true' || process.env.MYSQL_SSL === '1';

        globalThis._mysqlPool = mysql.createPool({
          host,
          port,
          user,
          password,
          database,
          waitForConnections: true,
          connectionLimit: 10,
          maxIdle: 10,
          idleTimeout: 60000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
          queueLimit: 0,
          multipleStatements: true,
          dateStrings: true,
          ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
        });
      } catch (err) {
        console.warn('MySQL pool initialization error:', err);
        return null;
      }
    }
    return globalThis._mysqlPool;
  }
  return null;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const p = getDbPool();
  if (!p) return null;
  try {
    const [rows] = await p.query(sql, params);
    return rows as T;
  } catch (err) {
    console.warn('MySQL query error, using fallback:', err);
    return null;
  }
}
