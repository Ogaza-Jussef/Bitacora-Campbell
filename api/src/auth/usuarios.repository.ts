import { Inject, Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import type { Rol } from '../common/principal';
import { DatabaseService } from '../database/database.service';

export type UsuarioRow = RowDataPacket & {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: Rol;
  activo: number;
};

@Injectable()
export class UsuariosRepository {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  buscarPorEmail(email: string): Promise<UsuarioRow | undefined> {
    return this.one(
      `SELECT id, nombre, email, password_hash, rol, activo
       FROM usuarios
       WHERE email = ?
       LIMIT 1`,
      [email],
    );
  }

  buscarPorId(id: number): Promise<UsuarioRow | undefined> {
    return this.one(
      `SELECT id, nombre, email, password_hash, rol, activo
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
  }

  private async one(sql: string, params: unknown[]): Promise<UsuarioRow | undefined> {
    const rows = await this.db.query<UsuarioRow>(sql, params);
    return rows[0];
  }
}
