import { NextRequest, NextResponse } from 'next/server';
import { query, mockDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanUsername.length < 3) {
      return NextResponse.json({ success: false, error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    const existing = await query<any[]>('SELECT user_id FROM Users WHERE username = ? OR email = ?', [
      cleanUsername,
      `${cleanUsername}@ves.ac.in`
    ]);

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: false, error: 'Username already taken. Please choose another or login.' }, { status: 400 });
    }

    const insertRes: any = await query(
      `INSERT INTO Users (username, full_name, email, password_hash, phone) 
       VALUES (?, ?, ?, ?, '9820000000')`,
      [cleanUsername, cleanUsername, `${cleanUsername}@ves.ac.in`, cleanPassword]
    );

    const newUserId = insertRes?.insertId || (mockDb.rides.length + 10);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You are now logged in.',
      user: {
        user_id: newUserId,
        username: cleanUsername,
        full_name: cleanUsername,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
