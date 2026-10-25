import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fechaCorta, numero, tieneDatos, type Punto } from './format';
import { ChartCard } from './ChartCard';

type SerieTemporalProps = {
  titulo: string;
  descripcion: string;
  puntos: Punto[];
  animar: boolean;
};

export function SerieTemporal({ titulo, descripcion, puntos, animar }: SerieTemporalProps) {
  return (
    <ChartCard titulo={titulo} descripcion={descripcion} vacio={!tieneDatos(puntos)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={puntos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e4ece7" vertical={false} />
          <XAxis dataKey="etiqueta" tickFormatter={fechaCorta} minTickGap={28} tick={{ fill: '#52685c', fontSize: 12 }} />
          <YAxis allowDecimals={false} width={36} tick={{ fill: '#52685c', fontSize: 12 }} />
          <Tooltip
            formatter={(value) => [`${numero.format(Number(value ?? 0))} soportes`, 'Total']}
            labelFormatter={(label) => fechaCorta(String(label))}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Soportes"
            stroke="#0f6b3c"
            fill="#0f6b3c"
            fillOpacity={0.16}
            strokeWidth={2}
            isAnimationActive={animar}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
