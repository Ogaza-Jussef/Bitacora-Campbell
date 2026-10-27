import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api';
import { Shell } from '../Shell';
import { useAuth } from '../auth';
import { BadgeEstado } from '../components/mantenimientos/BadgeEstado';
import { CalendarioMes } from '../components/mantenimientos/CalendarioMes';
import { EquipoCampo } from '../components/mantenimientos/EquipoCampo';
import { FILTROS_MANT_VACIOS, FiltrosMantenimiento, hayFiltrosMant } from '../components/mantenimientos/FiltrosMantenimiento';
import { fechaVisible, numero } from '../components/registros/format';
import type { Catalogo, Page } from '../types';

type Preventivo = {
  id: string;
  fechaProgramacion: string;
  areaId: number;
  area: string;
  equipoId: number;
  equipo: string;
  estado: 'Programado' | 'Realizado' | 'No realizado';
  observaciones: string | null;
  version: number;
};

const ESTADOS = ['Programado', 'Realizado', 'No realizado'] as const;
const VACIO = { fechaProgramacion: '', areaId: 0, equipoId: 0, equipo: '', estado: 'Programado' as Preventivo['estado'], observaciones: '' };

export function PreventivosPage() {
  const { user } = useAuth();
  const hoy = new Date();
  const [areas, setAreas] = useState<Catalogo[]>([]);
  const [items, setItems] = useState<Preventivo[]>([]);
  const [mesItems, setMesItems] = useState<Preventivo[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [anterior, setAnterior] = useState<(string | null)[]>([null]);
  const [indice, setIndice] = useState(0);
  const [valores, setValores] = useState(FILTROS_MANT_VACIOS);
  const [filtros, setFiltros] = useState(FILTROS_MANT_VACIOS);
  const [vista, setVista] = useState<'tabla' | 'calendario'>('tabla');
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Preventivo | null>(null);
  const [form, setForm] = useState(VACIO);
  const [clave, setClave] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [siguiente, setSiguiente] = useState<string | null>(null);

  useEffect(() => {
    api<Page<Catalogo>>('/api/v1/areas?limit=100').then((page) => setAreas(page.items)).catch((caught) => setError(texto(caught)));
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    if (filtros.areaId) params.set('areaId', filtros.areaId);
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    if (filtros.q) params.set('q', filtros.q);
    api<Page<Preventivo>>(`/api/v1/mantenimientos/preventivos?${params}`)
      .then((page) => {
        if (!activo) return;
        setItems(page.items);
        setTotal(page.total ?? page.items.length);
        setAnterior((pila) => pila);
        setError('');
        (page as Page<Preventivo> & { nextCursor: string | null });
        setSiguiente(page.nextCursor);
      })
      .catch((caught) => { if (activo) setError(texto(caught)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [cursor, filtros]);

  useEffect(() => {
    const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const finDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const fin = `${anio}-${String(mes).padStart(2, '0')}-${String(finDia).padStart(2, '0')}`;
    api<Page<Preventivo>>(`/api/v1/mantenimientos/preventivos?limit=100&desde=${inicio}&hasta=${fin}`)
      .then((page) => setMesItems(page.items))
      .catch(() => setMesItems([]));
  }, [anio, mes, filtros, items]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (event: KeyboardEvent) => { if (event.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [abierto]);

  function aplicar(siguiente: typeof FILTROS_MANT_VACIOS) {
    setValores(siguiente);
    setFiltros(siguiente);
    setCursor(null);
    setIndice(0);
    setAnterior([null]);
  }

  function filtrar(event: FormEvent) {
    event.preventDefault();
    aplicar(valores);
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!form.fechaProgramacion || !form.areaId || !form.equipoId) {
      setError('Completa fecha, área y equipo.');
      return;
    }
    setGuardando(true);
    const body = {
      fechaProgramacion: form.fechaProgramacion,
      areaId: form.areaId,
      equipoId: form.equipoId,
      estado: form.estado,
      observaciones: form.observaciones || undefined,
    };
    try {
      if (editando) {
        await api(`/api/v1/mantenimientos/preventivos/${editando.id}`, { method: 'PUT', headers: { 'If-Match': `"${editando.version}"` }, body: JSON.stringify(body) });
      } else {
        await api('/api/v1/mantenimientos/preventivos', { method: 'POST', headers: { 'Idempotency-Key': clave }, body: JSON.stringify(body) });
      }
      setAbierto(false);
      setCursor(null);
      setFiltros({ ...filtros });
    } catch (caught) {
      setError(texto(caught));
    } finally {
      setGuardando(false);
    }
  }

  async function realizar(item: Preventivo) {
    await api(`/api/v1/mantenimientos/preventivos/${item.id}`, {
      method: 'PUT',
      headers: { 'If-Match': `"${item.version}"` },
      body: JSON.stringify({ fechaProgramacion: item.fechaProgramacion, areaId: item.areaId, equipoId: item.equipoId, estado: 'Realizado', observaciones: item.observaciones ?? undefined }),
    });
    setFiltros({ ...filtros });
  }

  async function eliminar(item: Preventivo) {
    if (!window.confirm(`¿Eliminar el preventivo de ${item.equipo}?`)) return;
    await api(`/api/v1/mantenimientos/preventivos/${item.id}`, { method: 'DELETE', headers: { 'If-Match': `"${item.version}"` } });
    setFiltros({ ...filtros });
  }

  function moverMes(delta: number) {
    const fecha = new Date(Date.UTC(anio, mes - 1 + delta, 1));
    setAnio(fecha.getUTCFullYear());
    setMes(fecha.getUTCMonth() + 1);
  }

  const desdePagina = items.length === 0 ? 0 : indice * 20 + 1;
  const hastaPagina = items.length === 0 ? 0 : indice * 20 + items.length;

  return (
    <Shell>
      <main className="board">
        <header className="page-head">
          <div>
            <h1>Mantenimiento preventivo</h1>
            <p className="meta">{numero.format(total)} programaciones</p>
          </div>
          <div className="page-actions">
            <button type="button" onClick={() => setVista(vista === 'tabla' ? 'calendario' : 'tabla')}>{vista === 'tabla' ? 'Ver calendario' : 'Ver tabla'}</button>
            <button type="button" className="primary" onClick={() => { setEditando(null); setForm(VACIO); setClave(crypto.randomUUID()); setAbierto(true); }}>Nuevo preventivo</button>
          </div>
        </header>
        <FiltrosMantenimiento
          valores={valores}
          aplicados={filtros}
          areas={areas}
          estados={ESTADOS}
          placeholder="Equipo u observación"
          etiqueta="Filtros de preventivos"
          onChange={setValores}
          onFiltrar={filtrar}
          onLimpiar={() => aplicar(FILTROS_MANT_VACIOS)}
          onQuitar={aplicar}
        />
        {vista === 'calendario' ? (
          <div>
            <div className="page-actions">
              <button type="button" onClick={() => moverMes(-1)}>Mes anterior</button>
              <strong>{String(mes).padStart(2, '0')}/{anio}</strong>
              <button type="button" onClick={() => moverMes(1)}>Mes siguiente</button>
            </div>
            <CalendarioMes anio={anio} mes={mes} items={mesItems} onRealizar={(item) => realizar(item as Preventivo).catch((caught) => setError(texto(caught)))} />
          </div>
        ) : null}
        {error ? <p className="alert" role="alert">{error}</p> : null}
        {cargando ? <div className="card"><div className="fila-skeleton" /></div> : null}
        {!cargando && items.length === 0 ? (
          <div className="card vacio-registros">
            <p>Sin resultados</p>
            {hayFiltrosMant(filtros) ? <button type="button" onClick={() => aplicar(FILTROS_MANT_VACIOS)}>Limpiar filtros</button> : null}
          </div>
        ) : null}
        {!cargando && items.length > 0 && vista === 'tabla' ? (
          <div className="card table-wrap">
            <table className="registros-table">
              <thead><tr><th>Fecha</th><th>Área</th><th>Equipo</th><th>Estado</th><th>Observaciones</th><th>Acciones</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="fecha" data-label="Fecha">{fechaVisible(item.fechaProgramacion)}</td>
                    <td data-label="Área">{item.area}</td>
                    <td data-label="Equipo">{item.equipo}</td>
                    <td data-label="Estado"><BadgeEstado estado={item.estado} /></td>
                    <td data-label="Observaciones">{item.observaciones}</td>
                    <td className="acciones-fila" data-label="Acciones">
                      {item.estado === 'Programado' ? <button type="button" aria-label="Marcar como realizado" onClick={() => realizar(item).catch((caught) => setError(texto(caught)))}>Realizado</button> : null}
                      <button type="button" aria-label="Editar preventivo" onClick={() => { setEditando(item); setForm({ fechaProgramacion: item.fechaProgramacion, areaId: item.areaId, equipoId: item.equipoId, equipo: item.equipo, estado: item.estado, observaciones: item.observaciones ?? '' }); setAbierto(true); }}>Editar</button>
                      {user?.rol === 'admin' ? <button type="button" className="danger" aria-label="Eliminar preventivo" onClick={() => eliminar(item).catch((caught) => setError(texto(caught)))}>Eliminar</button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="paginador">
          <p>{total === 0 ? 'Mostrando 0 de 0' : `Mostrando ${numero.format(desdePagina)}–${numero.format(hastaPagina)} de ${numero.format(total)}`}</p>
          <div>
            <button type="button" disabled={indice === 0} onClick={() => { setIndice((valor) => valor - 1); setCursor(anterior[indice - 1] ?? null); }}>Anterior</button>
            <button type="button" disabled={!siguiente} onClick={() => { if (!siguiente) return; setAnterior((pila) => { const copia = pila.slice(0, indice + 1); copia.push(siguiente); return copia; }); setIndice((valor) => valor + 1); setCursor(siguiente); }}>Siguiente</button>
          </div>
        </div>
        {abierto ? (
          <div className="backdrop" role="presentation">
            <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="titulo-preventivo" onSubmit={guardar}>
              <h2 id="titulo-preventivo">{editando ? 'Editar preventivo' : 'Nuevo preventivo'}</h2>
              <div className="split">
                <label>Fecha de programación<input type="date" value={form.fechaProgramacion} required onChange={(event) => setForm({ ...form, fechaProgramacion: event.target.value })} /></label>
                <label>Área<select value={form.areaId || ''} required aria-label="Área del preventivo" onChange={(event) => setForm({ ...form, areaId: Number(event.target.value), equipoId: 0, equipo: '' })}><option value="">Selecciona</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}</select></label>
              </div>
              <EquipoCampo areaId={form.areaId} equipoId={form.equipoId} etiquetaInicial={form.equipo} onChange={(equipo) => setForm({ ...form, equipoId: equipo?.id ?? 0, equipo: equipo?.descripcion ?? '' })} />
              <label>Estado<select value={form.estado} aria-label="Estado del preventivo" onChange={(event) => setForm({ ...form, estado: event.target.value as typeof form.estado })}>{ESTADOS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Observaciones<textarea value={form.observaciones} rows={3} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} /></label>
              <div className="dialog-actions">
                <button type="button" className="ghost" onClick={() => setAbierto(false)}>Cancelar</button>
                <button type="submit" className="primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </Shell>
  );
}

function texto(error: unknown): string {
  return error instanceof ApiError ? error.message : 'No se pudo completar la solicitud';
}
