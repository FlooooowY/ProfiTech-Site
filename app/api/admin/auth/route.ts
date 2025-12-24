import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenUser } from '../login/route';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const isValid = verifyToken(token);
    if (!isValid) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const user = getTokenUser(token);
    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}

