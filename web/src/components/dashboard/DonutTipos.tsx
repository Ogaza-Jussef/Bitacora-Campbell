import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { etiquetaTipo, numero, tieneDatos, type Punto } from './format';
import { ChartCard } from './ChartCard';

const COLORES = ['#0f6b3c', '#3d9a62', '#8fceaa', '#52685c', '#1c2b24'];

type DonutTiposProps = {
  puntos: Punto[];
  animar: boolean;
};

export function DonutTipos({ puntos, animar }: DonutTiposProps) {
  const datos = puntos.map((punto) => ({ ...punto, nombre: etiquetaTipo(punto.etiqueta) }));
  return (
    <ChartCard titulo="Por tipo" descripcion="Distribución de los soportes registrados." vacio={!tieneDatos(datos)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datos}
            dataKey="total"
            nameKey="nombre"
            innerRadius={58}
            outerRadius={84}
            paddingAngle={2}
            isAnimationActive={animar}
          >
            {datos.map((punto, indice) => (
              <Cell key={punto.etiqueta} fill={COLORES[indice % COLORES.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${numero.format(Number(value ?? 0))} soportes`, String(name)]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
