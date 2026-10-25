import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, downloadCsv } from '../api';
import { useAuth } from '../auth';
import type { Catalogo, Page, Soporte, SoporteInput, TipoSoporte } from '../types';

const TIPOS: { value: TipoSoporte; label: string }[] = [
  { value: 'Chequeo', label: 'Asesoría, visita, chequeo' },
  { value: 'Instalación', label: 'Instalación' },
  { value: 'Correctivo', label: 'Correctivo' },
];

const EMPTY: SoporteInput = {
  solicitante: '',
  areaId: 0,
  descripcion: '',
  tipo: 'Chequeo',
  fechaSolicitud: '',
  fechaEntrega: '',
  tiempoSoporte: '',
};

export function BitacoraPage() {
  const { user, logout } = useAuth();
  const [areas, setAreas] = useState<Catalogo[]>([]);
  const [tecnicos, setTecnicos] = useState<Catalogo[]>([]);
  const [items, setItems] = useState<Soporte[]>([]);
  const [total, setTotal] = useState(0);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [areaId, setAreaId] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [applied, setApplied] = useState({ q: '', areaId: '', tipo: '', desde: '', hasta: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Soporte | null>(null);
  const [form, setForm] = useState<SoporteInput>(EMPTY);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const cursor = cursors[pageIndex] ?? null;

  useEffect(() => {
    Promise.all([
      api<Page<Catalogo>>('/api/v1/areas?limit=100'),
      api<Page<Catalogo>>('/api/v1/tecnicos?limit=100'),
    ]).then(([areaPage, tecnicoPage]) => {
      setAreas(areaPage.items);
      setTecnicos(tecnicoPage.items);
    }).catch((caught) => setError(messageOf(caught)));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Page<Soporte>>(`/api/v1/soportes?${queryString(cursor, applied)}`)
      .then((page) => {
        if (!active) {
          return;
        }
        setItems(page.items);
        setTotal(page.total ?? page.items.length);
        setNextCursor(page.nextCursor);
        setError('');
      })
      .catch((caught) => {
        if (active) {
          setError(messageOf(caught));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [cursor, applied]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setApplied({ q, areaId, tipo, desde, hasta });
    setCursors([null]);
    setPageIndex(0);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setIdempotencyKey(crypto.randomUUID());
    setDialogOpen(true);
  }

  function openEdit(soporte: Soporte) {
    setEditing(soporte);
    setForm({
      solicitante: soporte.solicitante,
      areaId: soporte.areaId,
      descripcion: soporte.descripcion ?? '',
      tipo: soporte.tipo ?? 'Chequeo',
      fechaSolicitud: soporte.fechaSolicitud ?? '',
      fechaEntrega: soporte.fechaEntrega ?? '',
      tiempoSoporte: soporte.tiempoSoporte ?? '',
      tecnicoId: soporte.tecnicoId ?? undefined,
    });
    setDialogOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const body: SoporteInput = {
      ...form,
      areaId: Number(form.areaId),
      tecnicoId: form.tecnicoId ? Number(form.tecnicoId) : undefined,
      fechaEntrega: form.fechaEntrega || undefined,
      tiempoSoporte: form.tiempoSoporte || undefined,
    };
    try {
      if (editing) {
        await api(`/api/v1/soportes/${editing.id}`, {
          method: 'PUT',
          headers: { 'If-Match': `"${editing.version}"` },
          body: JSON.stringify(body),
        });
      } else {
        await api('/api/v1/soportes', {
          method: 'POST',
          headers: { 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(body),
        });
      }
      setDialogOpen(false);
      setCursors([null]);
      setPageIndex(0);
      if (cursor === null && pageIndex === 0) {
        const page = await api<Page<Soporte>>(`/api/v1/soportes?${queryString(null, applied)}`);
        setItems(page.items);
        setTotal(page.total ?? page.items.length);
        setNextCursor(page.nextCursor);
      }
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  async function remove(soporte: Soporte) {
    if (!window.confirm(`¿Eliminar el soporte de ${soporte.solicitante}?`)) {
      return;
    }
    try {
      await api(`/api/v1/soportes/${soporte.id}`, {
        method: 'DELETE',
        headers: { 'If-Match': `"${soporte.version}"` },
      });
      const page = await api<Page<Soporte>>(`/api/v1/soportes?${queryString(cursor, applied)}`);
      setItems(page.items);
      setTotal(page.total ?? page.items.length);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  return (
    <>
      <header className="topbar">
        <img src="/logo-campbell.png" alt="" width={46} height={46} />
        <div>
          <strong>Bitácora de Soportes</strong>
          <span>Fundación Campbell</span>
        </div>
        <p>{user?.nombre}</p>
        <button type="button" className="ghost" onClick={logout}>Salir</button>
      </header>
      <main className="board">
        <form className="filters" onSubmit={applyFilters}>
          <label>Buscar<input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Solicitante o descripción" /></label>
          <label>Área
            <select value={areaId} onChange={(event) => setAreaId(event.target.value)}>
              <option value="">Todas</option>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
            </select>
          </label>
          <label>Tipo
            <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>Desde<input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
          <label>Hasta<input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
          <button type="submit">Filtrar</button>
          <button type="button" onClick={() => downloadCsv(`/api/v1/soportes/export?${queryString(null, applied)}`).catch((caught) => setError(messageOf(caught)))}>Exportar CSV</button>
          <button type="button" className="primary" onClick={openCreate}>Nuevo soporte</button>
        </form>
        {error ? <p className="alert" role="alert">{error}</p> : null}
        <p className="meta">{loading ? 'Cargando registros…' : `${total} soportes`}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Solicitante</th>
                <th>Área</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Solicitud</th>
                <th>Entrega</th>
                <th>Tiempo</th>
                <th>Realizado por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((soporte) => (
                <tr key={soporte.id}>
                  <td>{soporte.solicitante}</td>
                  <td>{soporte.area}</td>
                  <td>{soporte.descripcion}</td>
                  <td>{labelTipo(soporte.tipo)}</td>
                  <td>{soporte.fechaSolicitud}</td>
                  <td>{soporte.fechaEntrega}</td>
                  <td>{soporte.tiempoSoporte}</td>
                  <td>{soporte.tecnico}</td>
                  <td className="actions">
                    <button type="button" onClick={() => openEdit(soporte)}>Editar</button>
                    {user?.rol === 'admin' ? <button type="button" className="danger" onClick={() => remove(soporte)}>Eliminar</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <button type="button" disabled={pageIndex === 0} onClick={() => setPageIndex((index) => index - 1)}>Anterior</button>
          <button
            type="button"
            disabled={!nextCursor}
            onClick={() => {
              if (!nextCursor) return;
              setCursors((stack) => {
                const copy = stack.slice(0, pageIndex + 1);
                copy.push(nextCursor);
                return copy;
              });
              setPageIndex((index) => index + 1);
            }}
          >Siguiente</button>
        </div>
      </main>
      {dialogOpen ? (
        <div className="backdrop" role="presentation">
          <form className="dialog" onSubmit={save} aria-labelledby="form-title">
            <h2 id="form-title">{editing ? 'Editar soporte' : 'Nuevo soporte'}</h2>
            <label>Solicitante<input value={form.solicitante} onChange={(event) => setForm({ ...form, solicitante: event.target.value })} required minLength={2} /></label>
            <label>Área
              <select value={form.areaId || ''} onChange={(event) => setForm({ ...form, areaId: Number(event.target.value) })} required>
                <option value="">Selecciona</option>
                {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
              </select>
            </label>
            <label>Descripción<textarea value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} required rows={3} /></label>
            <label>Tipo de soporte
              <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as TipoSoporte })}>
                {TIPOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <div className="split">
              <label>Fecha de solicitud<input type="date" value={form.fechaSolicitud} onChange={(event) => setForm({ ...form, fechaSolicitud: event.target.value })} required /></label>
              <label>Fecha de entrega<input type="date" value={form.fechaEntrega ?? ''} onChange={(event) => setForm({ ...form, fechaEntrega: event.target.value })} /></label>
            </div>
            <div className="split">
              <label>Tiempo de solución<input value={form.tiempoSoporte ?? ''} onChange={(event) => setForm({ ...form, tiempoSoporte: event.target.value })} /></label>
              <label>Atendido por
                <select value={form.tecnicoId ?? ''} onChange={(event) => setForm({ ...form, tecnicoId: event.target.value ? Number(event.target.value) : undefined })}>
                  <option value="">Sin asignar</option>
                  {tecnicos.map((tecnico) => <option key={tecnico.id} value={tecnico.id}>{tecnico.nombre}</option>)}
                </select>
              </label>
            </div>
            <div className="dialog-actions">
              <button type="button" className="ghost" onClick={() => setDialogOpen(false)}>Cancelar</button>
              <button type="submit" className="primary">Guardar</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function queryString(
  pageCursor: string | null,
  filters: { q: string; areaId: string; tipo: string; desde: string; hasta: string },
): string {
  const params = new URLSearchParams({ limit: '20', sort: 'fecha_solicitud' });
  if (pageCursor) params.set('cursor', pageCursor);
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.areaId) params.set('areaId', filters.areaId);
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.desde) params.set('desde', filters.desde);
  if (filters.hasta) params.set('hasta', filters.hasta);
  return params.toString();
}

function labelTipo(tipo: Soporte['tipo']): string {
  return TIPOS.find((item) => item.value === tipo)?.label ?? '';
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'No se pudo completar la solicitud';
}
