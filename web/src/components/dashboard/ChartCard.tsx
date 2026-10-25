import type { ReactNode } from 'react';

type ChartCardProps = {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  vacio: boolean;
  children: ReactNode;
  alto?: number;
};

export function ChartCard({ titulo, descripcion, accion, vacio, children, alto = 280 }: ChartCardProps) {
  return (
    <section className="chart-card" aria-label={titulo}>
      <header className="chart-head">
        <div>
          <h2>{titulo}</h2>
          {descripcion ? <p>{descripcion}</p> : null}
        </div>
        {accion}
      </header>
      {vacio ? <p className="sin-datos">Sin datos</p> : <div className="chart-body" style={{ height: alto }}>{children}</div>}
    </section>
  );
}
