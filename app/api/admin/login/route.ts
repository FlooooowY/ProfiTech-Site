import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// В продакшене это должно быть в переменных окружения
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

// Простая система токенов (в продакшене использовать JWT)
const tokens = new Map<string, { username: string; expiresAt: number }>();

// Очистка истекших токенов каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokens.entries()) {
    if (data.expiresAt < now) {
      tokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Логин и пароль обязательны' },
        { status: 400 }
      );
    }

    // Проверяем учетные данные
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return NextResponse.json(
        { success: false, message: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Генерируем токен
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 часа

    tokens.set(token, {
      username,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        username,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// Экспортируем функцию для проверки токена
export function verifyToken(token: string): boolean {
  const tokenData = tokens.get(token);
  if (!tokenData) {
    return false;
  }

  if (tokenData.expiresAt < Date.now()) {
    tokens.delete(token);
    return false;
  }

  return true;
}

// Экспортируем функцию для получения данных пользователя
export function getTokenUser(token: string): { username: string } | null {
  const tokenData = tokens.get(token);
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    return null;
  }
  return { username: tokenData.username };
}

