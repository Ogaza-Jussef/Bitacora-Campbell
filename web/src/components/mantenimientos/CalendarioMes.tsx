type Item = { id: string; fechaProgramacion: string; equipo: string; estado: string; area: string };

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarioMes({ anio, mes, items, onRealizar }: {
  anio: number;
  mes: number;
  items: Item[];
  onRealizar: (item: Item) => void;
}) {
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const inicio = (primero.getUTCDay() + 6) % 7;
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const celdas = Array.from({ length: inicio + dias }, (_, indice) => indice < inicio ? null : indice - inicio + 1);
  return (
    <div className="card calendario" aria-label={`Calendario ${mes}/${anio}`}>
      <div className="calendario-dias">{DIAS.map((dia) => <span key={dia}>{dia}</span>)}</div>
      <div className="calendario-grid">
        {celdas.map((dia, indice) => {
          const clave = dia ? `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : `vacio-${indice}`;
          const delDia = dia ? items.filter((item) => item.fechaProgramacion.slice(0, 10) === clave) : [];
          return (
            <div key={clave} className="dia">
              {dia ? <strong>{dia}</strong> : null}
              {delDia.map((item) => (
                <article key={item.id}>
                  <span>{item.equipo}</span>
                  <small>{item.estado}</small>
                  {item.estado === 'Programado' ? <button type="button" onClick={() => onRealizar(item)}>Marcar como realizado</button> : null}
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
