import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { numero, tieneDatos, type Punto } from './format';
import { ChartCard } from './ChartCard';

type ColumnasPeriodoProps = {
  titulo: string;
  descripcion: string;
  puntos: Punto[];
  actual: string;
  formatear: (valor: string) => string;
  animar: boolean;
};

export function ColumnasPeriodo({ titulo, descripcion, puntos, actual, formatear, animar }: ColumnasPeriodoProps) {
  return (
    <ChartCard titulo={titulo} descripcion={descripcion} vacio={!tieneDatos(puntos)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={puntos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e4ece7" vertical={false} />
          <XAxis dataKey="etiqueta" tickFormatter={formatear} tick={{ fill: '#52685c', fontSize: 12 }} interval={0} />
          <YAxis allowDecimals={false} width={36} tick={{ fill: '#52685c', fontSize: 12 }} />
          <Tooltip
            formatter={(value) => [`${numero.format(Number(value ?? 0))} soportes`, 'Total']}
            labelFormatter={(label) => formatear(String(label))}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} isAnimationActive={animar}>
            {puntos.map((punto) => (
              <Cell key={punto.etiqueta} fill={punto.etiqueta.slice(0, actual.length) === actual ? '#0f6b3c' : '#b7d7c4'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
