import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import { AppError } from '../common/app-error';
import { getEnv } from '../config/env';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor() {
    const env = getEnv();
    this.pool = createPool({
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 5000,
      dateStrings: true,
      charset: 'utf8mb4',
      multipleStatements: false,
    });
    this.pool.on('connection', (connection) => {
      connection.query("SET time_zone = '-05:00'");
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async ping(): Promise<void> {
    await this.query('SELECT 1 AS ok');
  }

  async query<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const [rows] = await this.pool.query<T[]>(sql, params);
      return rows;
    } catch (error) {
      throw this.wrap(error);
    }
  }

  async execute(sql: string, params: unknown[] = [], connection?: PoolConnection): Promise<ResultSetHeader> {
    try {
      const [result] = await (connection ?? this.pool).query<ResultSetHeader>(sql, params);
      return result;
    } catch (error) {
      throw this.wrap(error);
    }
  }

  async transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error instanceof AppError ? error : this.wrap(error);
    } finally {
      connection.release();
    }
  }

  private wrap(error: unknown): Error {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
    this.logger.error(JSON.stringify({ msg: 'db_error', dependency: 'mysql', code }));
    if (code === 'ER_DUP_ENTRY') {
      return new AppError('conflict', 409, 'El registro ya existe');
    }
    if (
      code === 'ECONNREFUSED' ||
      code === 'PROTOCOL_CONNECTION_LOST' ||
      code === 'ETIMEDOUT' ||
      code === 'ER_ACCESS_DENIED_ERROR' ||
      code === 'ER_BAD_DB_ERROR' ||
      code === 'ENOTFOUND'
    ) {
      return new AppError('unavailable', 503, 'La base de datos no está disponible');
    }
    return error instanceof Error ? error : new Error('Error de base de datos');
  }
}
