import mysql from 'mysql2/promise';

// Конфигурация подключения к MySQL с оптимизацией
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin_db',
  password: process.env.DB_PASSWORD || 'admin_db',
  database: process.env.DB_NAME || 'profitech_db',
  waitForConnections: true,
  connectionLimit: 20, // Увеличено для лучшей производительности
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Оптимизация для производительности
  multipleStatements: false,
  typeCast: true,
  dateStrings: false,
  // Таймауты
  connectTimeout: 10000,
};

// Создаем пул соединений
const pool = mysql.createPool(dbConfig);

export default pool;

// Утилита для выполнения запросов с обработкой ошибок
export async function query(sql: string, params?: any[]) {
  try {
    // Убрали лишние логи для производительности (оставляем только ошибки)
    const [results] = await pool.execute(sql, params || []);
    return results;
  } catch (error) {
    console.error('[DB Query] ОШИБКА ЗАПРОСА:');
    console.error('[DB Query] SQL:', sql.replace(/\s+/g, ' ').trim());
    console.error('[DB Query] Params:', params);
    console.error('[DB Query] Error:', error);
    if (error instanceof Error) {
      console.error('[DB Query] Error message:', error.message);
      console.error('[DB Query] Error code:', (error as any).code);
      console.error('[DB Query] Error errno:', (error as any).errno);
    }
    // Если ошибка подключения, пробуем переподключиться
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.error('[DB Query] Database connection refused. Please check your database configuration.');
    }
    throw error;
  }
}

// Проверка подключения к базе данных
export async function testConnection() {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Утилита для получения одного соединения (для транзакций)
export async function getConnection() {
  return await pool.getConnection();
}

