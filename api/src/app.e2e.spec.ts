import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { DatabaseService } from './database/database.service';

describe('contrato HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({
        ping: async () => undefined,
        query: async () => [],
        execute: async () => ({ affectedRows: 0 }),
        transaction: async (work: (connection: unknown) => Promise<unknown>) => work({}),
        onModuleDestroy: async () => undefined,
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde vivo sin consultar la base', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('rechaza un login sin correo ni contraseña', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_error');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('exige sesión para listar soportes', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/soportes');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('unauthenticated');
  });

  it('exige sesión para imprimir y ver el tablero', async () => {
    const pdf = await request(app.getHttpServer()).get('/api/v1/soportes/pdf');
    const tablero = await request(app.getHttpServer()).get('/api/v1/estadisticas');
    expect(pdf.status).toBe(401);
    expect(tablero.status).toBe(401);
    expect(pdf.body.error.code).toBe('unauthenticated');
  });
});
