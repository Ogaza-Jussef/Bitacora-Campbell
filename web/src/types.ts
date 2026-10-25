export type Rol = 'admin' | 'soporte';

export type SessionUser = {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
};

export type Catalogo = {
  id: number;
  nombre: string;
};

export type TipoSoporte = 'Chequeo' | 'Instalación' | 'Correctivo';

export type Soporte = {
  id: string;
  solicitante: string;
  areaId: number;
  area: string;
  descripcion: string | null;
  tipo: TipoSoporte | null;
  fechaSolicitud: string | null;
  fechaEntrega: string | null;
  tiempoSoporte: string | null;
  tecnicoId: number | null;
  tecnico: string | null;
  actualizadoEn: string | null;
  version: number;
};

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
  limit: number;
  total?: number;
};

export type SoporteInput = {
  solicitante: string;
  areaId: number;
  descripcion: string;
  tipo: TipoSoporte;
  fechaSolicitud: string;
  fechaEntrega?: string;
  tiempoSoporte?: string;
  tecnicoId?: number;
};
