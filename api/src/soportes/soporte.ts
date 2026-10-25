export const TIPOS_SOPORTE = ['Chequeo', 'Instalación', 'Correctivo'] as const;
export type TipoSoporte = (typeof TIPOS_SOPORTE)[number];

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
