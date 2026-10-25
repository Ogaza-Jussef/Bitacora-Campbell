export type Rol = 'admin' | 'soporte';

export type Principal = {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
};
