'use client';

// Проверка аутентификации на клиенте
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('adminToken');
  return !!token;
}

// Получение токена
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

// Выход
export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = '/admin/login';
}

// Получение данных пользователя
export function getUser(): { username: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('adminUser');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

