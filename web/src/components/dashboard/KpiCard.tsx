import type { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Punto } from './format';
import { fechaCorta, numero, textoVariacion } from './format';

type KpiCardProps = {
  etiqueta: string;
  valor: string;
  detalle: string;
  delta: number | null;
  comparacion: string;
  serie: Punto[];
  icono: ReactNode;
  animar: boolean;
};

export function KpiCard({ etiqueta, valor, detalle, delta, comparacion, serie, icono, animar }: KpiCardProps) {
  const tono = delta === null ? 'neutro' : delta >= 0 ? 'sube' : 'baja';
  const descripcion = `${etiqueta}: ${valor}. ${detalle}. Variación ${textoVariacion(delta)} ${comparacion}.`;
  return (
    <article className="kpi-card" aria-label={descripcion}>
      <div className="kpi-top">
        <span className="kpi-icono" aria-hidden="true">{icono}</span>
        <span className={`kpi-delta ${tono}`}>
          {delta === null ? textoVariacion(delta) : `${delta < 0 ? '▼' : '▲'} ${textoVariacion(delta)} ${comparacion}`}
        </span>
      </div>
      <p className="kpi-etiqueta">{etiqueta}</p>
      <p className="kpi-valor">{valor}</p>
      <p className="kpi-detalle">{detalle}</p>
      <div className="kpi-spark" aria-hidden="true">
        <ResponsiveContainer width="100%" height={36}>
          <AreaChart data={serie}>
            <Tooltip
              formatter={(value) => [`${numero.format(Number(value ?? 0))} soportes`, 'Total']}
              labelFormatter={(label) => fechaCorta(String(label))}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#0f6b3c"
              fill="#0f6b3c"
              fillOpacity={0.16}
              strokeWidth={2}
              isAnimationActive={animar}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
