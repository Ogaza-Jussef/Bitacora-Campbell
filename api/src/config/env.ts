export type AppEnv = {
  databaseUrl: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtExpiresSeconds: number;
  corsOrigin: string;
  port: number;
};

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cached) {
    return cached;
  }

  const databaseUrl = required('DATABASE_URL');
  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL debe usar el protocolo mysql:');
  }

  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }

  cached = {
    databaseUrl,
    dbHost: parsed.hostname,
    dbPort: Number(parsed.port || 3306),
    dbUser: decodeURIComponent(parsed.username),
    dbPassword: decodeURIComponent(parsed.password),
    dbName: parsed.pathname.replace(/^\//, ''),
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '8h',
    jwtExpiresSeconds: expiresInSeconds(process.env.JWT_EXPIRES_IN?.trim() || '8h'),
    corsOrigin: required('CORS_ORIGIN'),
    port: Number(process.env.PORT || 3000),
  };
  return cached;
}

function expiresInSeconds(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 8 * 60 * 60;
  }
  const amount = Number(match[1]);
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return amount * factor;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}
