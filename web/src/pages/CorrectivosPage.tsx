import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api';
import { Shell } from '../Shell';
import { useAuth } from '../auth';
import { BadgeEstado } from '../components/mantenimientos/BadgeEstado';
import { EquipoCampo } from '../components/mantenimientos/EquipoCampo';
import { FILTROS_MANT_VACIOS, FiltrosMantenimiento, hayFiltrosMant } from '../components/mantenimientos/FiltrosMantenimiento';
import { SelectorSoporte } from '../components/mantenimientos/SelectorSoporte';
import { fechaVisible, numero } from '../components/registros/format';
import type { Catalogo, Page } from '../types';

type Correctivo = {
  id: string;
  areaId: number;
  area: string;
  equipoId: number;
  equipo: string;
  soporteId: string | null;
  soporteSolicitante: string | null;
  soporteDescripcion: string | null;
  estado: 'Pendiente' | 'En proceso' | 'Resuelto';
  fecha: string;
  observaciones: string | null;
  version: number;
};

const ESTADOS = ['Pendiente', 'En proceso', 'Resuelto'] as const;
const VACIO = { areaId: 0, equipoId: 0, equipo: '', soporteId: '', soporteNombre: '', estado: 'Pendiente' as Correctivo['estado'], fecha: '', observaciones: '' };

export function CorrectivosPage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Catalogo[]>([]);
  const [items, setItems] = useState<Correctivo[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pila, setPila] = useState<(string | null)[]>([null]);
  const [indice, setIndice] = useState(0);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [valores, setValores] = useState(FILTROS_MANT_VACIOS);
  const [filtros, setFiltros] = useState(FILTROS_MANT_VACIOS);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Correctivo | null>(null);
  const [form, setForm] = useState(VACIO);
  const [clave, setClave] = useState('');
  const [guardando, setGuardando] = useState(false);

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
    api<Page<Correctivo>>(`/api/v1/mantenimientos/correctivos?${params}`)
      .then((page) => {
        if (!activo) return;
        setItems(page.items);
        setTotal(page.total ?? page.items.length);
        setSiguiente(page.nextCursor);
        setError('');
      })
      .catch((caught) => { if (activo) setError(texto(caught)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [cursor, filtros]);

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
    setPila([null]);
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!form.fecha || !form.areaId || !form.equipoId) {
      setError('Completa fecha, área y equipo.');
      return;
    }
    const body = {
      areaId: form.areaId,
      equipoId: form.equipoId,
      soporteId: form.soporteId || undefined,
      estado: form.estado,
      fecha: form.fecha,
      observaciones: form.observaciones || undefined,
    };
    setGuardando(true);
    try {
      if (editando) {
        await api(`/api/v1/mantenimientos/correctivos/${editando.id}`, { method: 'PUT', headers: { 'If-Match': `"${editando.version}"` }, body: JSON.stringify(body) });
      } else {
        await api('/api/v1/mantenimientos/correctivos', { method: 'POST', headers: { 'Idempotency-Key': clave }, body: JSON.stringify(body) });
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

  async function eliminar(item: Correctivo) {
    if (!window.confirm(`¿Eliminar el correctivo de ${item.equipo}?`)) return;
    await api(`/api/v1/mantenimientos/correctivos/${item.id}`, { method: 'DELETE', headers: { 'If-Match': `"${item.version}"` } });
    setFiltros({ ...filtros });
  }

  const desdePagina = items.length === 0 ? 0 : indice * 20 + 1;
  const hastaPagina = items.length === 0 ? 0 : indice * 20 + items.length;

  return (
    <Shell>
      <main className="board">
        <header className="page-head">
          <div>
            <h1>Mantenimiento correctivo</h1>
            <p className="meta">{numero.format(total)} correctivos</p>
          </div>
          <button type="button" className="primary" onClick={() => { setEditando(null); setForm(VACIO); setClave(crypto.randomUUID()); setAbierto(true); }}>Nuevo correctivo</button>
        </header>
        <FiltrosMantenimiento
          valores={valores}
          aplicados={filtros}
          areas={areas}
          estados={ESTADOS}
          placeholder="Equipo, observación o soporte"
          etiqueta="Filtros de correctivos"
          onChange={setValores}
          onFiltrar={(event: FormEvent) => { event.preventDefault(); aplicar(valores); }}
          onLimpiar={() => aplicar(FILTROS_MANT_VACIOS)}
          onQuitar={aplicar}
        />
        {error ? <p className="alert" role="alert">{error}</p> : null}
        {cargando ? <div className="card"><div className="fila-skeleton" /></div> : null}
        {!cargando && items.length === 0 ? (
          <div className="card vacio-registros">
            <p>Sin resultados</p>
            {hayFiltrosMant(filtros) ? <button type="button" onClick={() => aplicar(FILTROS_MANT_VACIOS)}>Limpiar filtros</button> : null}
          </div>
        ) : null}
        {!cargando && items.length > 0 ? (
          <div className="card table-wrap">
            <table className="registros-table">
              <thead><tr><th>Fecha</th><th>Área</th><th>Equipo</th><th>Solicitud</th><th>Estado</th><th>Observaciones</th><th>Acciones</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="fecha" data-label="Fecha">{fechaVisible(item.fecha)}</td>
                    <td data-label="Área">{item.area}</td>
                    <td data-label="Equipo">{item.equipo}</td>
                    <td data-label="Solicitud">{item.soporteSolicitante ?? item.soporteId ?? ''}</td>
                    <td data-label="Estado"><BadgeEstado estado={item.estado} /></td>
                    <td data-label="Observaciones">{item.observaciones}</td>
                    <td className="acciones-fila" data-label="Acciones">
                      <button type="button" aria-label="Editar correctivo" onClick={() => { setEditando(item); setForm({ areaId: item.areaId, equipoId: item.equipoId, equipo: item.equipo, soporteId: item.soporteId ?? '', soporteNombre: item.soporteSolicitante ?? '', estado: item.estado, fecha: item.fecha, observaciones: item.observaciones ?? '' }); setAbierto(true); }}>Editar</button>
                      {user?.rol === 'admin' ? <button type="button" className="danger" aria-label="Eliminar correctivo" onClick={() => eliminar(item).catch((caught) => setError(texto(caught)))}>Eliminar</button> : null}
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
            <button type="button" disabled={indice === 0} onClick={() => { setIndice((valor) => valor - 1); setCursor(pila[indice - 1] ?? null); }}>Anterior</button>
            <button type="button" disabled={!siguiente} onClick={() => { if (!siguiente) return; setPila((base) => { const copia = base.slice(0, indice + 1); copia.push(siguiente); return copia; }); setIndice((valor) => valor + 1); setCursor(siguiente); }}>Siguiente</button>
          </div>
        </div>
        {abierto ? (
          <div className="backdrop" role="presentation">
            <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="titulo-correctivo" onSubmit={guardar}>
              <h2 id="titulo-correctivo">{editando ? 'Editar correctivo' : 'Nuevo correctivo'}</h2>
              <div className="split">
                <label>Fecha<input type="date" required value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} /></label>
                <label>Área<select required aria-label="Área del correctivo" value={form.areaId || ''} onChange={(event) => setForm({ ...form, areaId: Number(event.target.value), equipoId: 0, equipo: '' })}><option value="">Selecciona</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}</select></label>
              </div>
              <EquipoCampo areaId={form.areaId} equipoId={form.equipoId} etiquetaInicial={form.equipo} onChange={(equipo) => setForm({ ...form, equipoId: equipo?.id ?? 0, equipo: equipo?.descripcion ?? '' })} />
              <SelectorSoporte soporteId={form.soporteId} solicitante={form.soporteNombre} onChange={(soporte) => setForm({ ...form, soporteId: soporte?.id ?? '', soporteNombre: soporte?.solicitante ?? '' })} />
              <label>Estado<select aria-label="Estado del correctivo" value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value as typeof form.estado })}>{ESTADOS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Observaciones<textarea rows={3} value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} /></label>
              <div className="dialog-actions">
                <button type="button" className="ghost" onClick={() => setAbierto(false)}>Cancelar</button>
                <button className="primary" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
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
