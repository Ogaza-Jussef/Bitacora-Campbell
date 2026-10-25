import type { ReactNode } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { numero, tieneDatos, type Punto } from './format';
import { ChartCard } from './ChartCard';

type RankingBarrasProps = {
  titulo: string;
  descripcion: string;
  puntos: Punto[];
  total: number;
  animar: boolean;
  accion?: ReactNode;
  mostrarPorcentaje?: boolean;
};

export function RankingBarras({ titulo, descripcion, puntos, total, animar, accion, mostrarPorcentaje = false }: RankingBarrasProps) {
  const filas = puntos.map((punto) => ({
    ...punto,
    porcentaje: total > 0 ? Math.round((punto.total / total) * 100) : 0,
  }));
  const alto = Math.max(220, filas.length * 32);
  return (
    <ChartCard titulo={titulo} descripcion={descripcion} vacio={!tieneDatos(filas)} accion={accion} alto={alto}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: mostrarPorcentaje ? 72 : 28, left: 8, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="etiqueta" width={128} tick={{ fill: '#1c2b24', fontSize: 12 }} />
          <Tooltip
            formatter={(value, _name, item) => {
              const porcentaje = (item.payload as { porcentaje?: number }).porcentaje ?? 0;
              const cantidad = `${numero.format(Number(value ?? 0))} soportes`;
              return [mostrarPorcentaje ? `${cantidad} (${numero.format(porcentaje)}%)` : cantidad, 'Total'];
            }}
          />
          <Bar dataKey="total" fill="#0f6b3c" radius={[0, 6, 6, 0]} barSize={14} isAnimationActive={animar}>
            <LabelList
              dataKey="total"
              position="right"
              formatter={(value) => {
                const cantidad = Number(value ?? 0);
                if (!mostrarPorcentaje || total <= 0) {
                  return numero.format(cantidad);
                }
                return `${numero.format(cantidad)} · ${numero.format(Math.round((cantidad / total) * 100))}%`;
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
