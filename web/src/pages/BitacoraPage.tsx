import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, openPdf } from '../api';
import { Shell } from '../Shell';
import { useAuth } from '../auth';
import { FiltrosBar } from '../components/registros/FiltrosBar';
import { Paginador } from '../components/registros/Paginador';
import { TablaSoportes } from '../components/registros/TablaSoportes';
import { FILTROS_VACIOS, hayFiltros, numero, queryString, TIPOS, type Filtros } from '../components/registros/format';
import type { Catalogo, Page, Soporte, SoporteInput, TipoSoporte } from '../types';

const EMPTY: SoporteInput = {
  solicitante: '',
  areaId: 0,
  descripcion: '',
  tipo: 'Chequeo',
  fechaSolicitud: '',
  fechaEntrega: '',
  tiempoSoporte: '',
};

const LIMITE = 20;

export function BitacoraPage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Catalogo[]>([]);
  const [tecnicos, setTecnicos] = useState<Catalogo[]>([]);
  const [items, setItems] = useState<Soporte[]>([]);
  const [total, setTotal] = useState(0);
  const [totalGeneral, setTotalGeneral] = useState<number | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [valores, setValores] = useState<Filtros>(FILTROS_VACIOS);
  const [applied, setApplied] = useState<Filtros>(FILTROS_VACIOS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Soporte | null>(null);
  const [form, setForm] = useState<SoporteInput>(EMPTY);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarErrores, setMostrarErrores] = useState(false);

  const cursor = cursors[pageIndex] ?? null;

  useEffect(() => {
    api<Page<Soporte>>('/api/v1/soportes?limit=1')
      .then((page) => setTotalGeneral(page.total ?? 0))
      .catch(() => undefined);
  }, []);

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
        if (!active) return;
        const cantidad = page.total ?? page.items.length;
        setItems(page.items);
        setTotal(cantidad);
        setNextCursor(page.nextCursor);
        if (!hayFiltros(applied)) setTotalGeneral(cantidad);
        setError('');
      })
      .catch((caught) => {
        if (active) setError(messageOf(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cursor, applied]);

  useEffect(() => {
    if (!dialogOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setDialogOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen]);

  function aplicar(siguiente: Filtros) {
    setValores(siguiente);
    setApplied(siguiente);
    setCursors([null]);
    setPageIndex(0);
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    aplicar(valores);
  }

  function limpiar() {
    aplicar(FILTROS_VACIOS);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setMostrarErrores(false);
    setIdempotencyKey(crypto.randomUUID());
    setDialogOpen(true);
  }

  function openEdit(soporte: Soporte) {
    setEditing(soporte);
    setMostrarErrores(false);
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
    const invalido = form.solicitante.trim().length < 2 || !form.areaId || !form.descripcion.trim() || !form.fechaSolicitud;
    if (invalido) {
      setMostrarErrores(true);
      return;
    }
    const body: SoporteInput = {
      ...form,
      areaId: Number(form.areaId),
      tecnicoId: form.tecnicoId ? Number(form.tecnicoId) : undefined,
      fechaEntrega: form.fechaEntrega || undefined,
      tiempoSoporte: form.tiempoSoporte || undefined,
    };
    setGuardando(true);
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
      if (!hayFiltros(applied)) {
        const general = await api<Page<Soporte>>('/api/v1/soportes?limit=1');
        setTotalGeneral(general.total ?? 0);
      }
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setGuardando(false);
    }
  }

  async function remove(soporte: Soporte) {
    if (!window.confirm(`¿Eliminar el soporte de ${soporte.solicitante}?`)) return;
    try {
      await api(`/api/v1/soportes/${soporte.id}`, {
        method: 'DELETE',
        headers: { 'If-Match': `"${soporte.version}"` },
      });
      const page = await api<Page<Soporte>>(`/api/v1/soportes?${queryString(cursor, applied)}`);
      setItems(page.items);
      setTotal(page.total ?? page.items.length);
      setNextCursor(page.nextCursor);
      if (!hayFiltros(applied)) setTotalGeneral(page.total ?? page.items.length);
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  const desde = items.length === 0 ? 0 : pageIndex * LIMITE + 1;
  const hasta = items.length === 0 ? 0 : pageIndex * LIMITE + items.length;
  const resumen = hayFiltros(applied)
    ? `${numero.format(total)} de ${numero.format(totalGeneral ?? total)} soportes`
    : `${numero.format(total)} soportes`;

  return (
    <>
      <Shell>
        <main className="board registros">
          <header className="page-head">
            <div>
              <h1>Registros</h1>
              <p className="meta">{loading && items.length === 0 ? 'Cargando registros…' : resumen}</p>
            </div>
            <div className="page-actions">
              <button type="button" onClick={() => openPdf(`/api/v1/soportes/pdf?${queryString(null, applied)}`).catch((caught) => setError(messageOf(caught)))}>Imprimir PDF</button>
              <button type="button" className="primary" onClick={openCreate}>Nuevo soporte</button>
            </div>
          </header>
          <FiltrosBar
            valores={valores}
            aplicados={applied}
            areas={areas}
            onChange={setValores}
            onFiltrar={applyFilters}
            onLimpiar={limpiar}
            onQuitar={aplicar}
          />
          {error ? <p className="alert" role="alert">{error}</p> : null}
          <TablaSoportes
            items={items}
            cargando={loading && items.length === 0}
            esAdmin={user?.rol === 'admin'}
            hayFiltros={hayFiltros(applied)}
            onPdf={(soporte) => openPdf(`/api/v1/soportes/${soporte.id}/pdf`).catch((caught) => setError(messageOf(caught)))}
            onEditar={openEdit}
            onEliminar={remove}
            onLimpiar={limpiar}
          />
          <Paginador
            desde={desde}
            hasta={hasta}
            total={total}
            hayAnterior={pageIndex > 0}
            haySiguiente={Boolean(nextCursor)}
            onAnterior={() => setPageIndex((index) => index - 1)}
            onSiguiente={() => {
              if (!nextCursor) return;
              setCursors((stack) => {
                const copy = stack.slice(0, pageIndex + 1);
                copy.push(nextCursor);
                return copy;
              });
              setPageIndex((index) => index + 1);
            }}
          />
        </main>
      </Shell>
      {dialogOpen ? (
        <div className="backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
          <form className="dialog" onSubmit={save} aria-labelledby="form-title" role="dialog" aria-modal="true">
            <h2 id="form-title">{editing ? 'Editar soporte' : 'Nuevo soporte'}</h2>
            <fieldset>
              <legend>Quién solicita</legend>
              <div className="split">
                <label className={mostrarErrores && form.solicitante.trim().length < 2 ? 'invalido' : ''}>
                  Solicitante
                  <input value={form.solicitante} aria-invalid={mostrarErrores && form.solicitante.trim().length < 2} onChange={(event) => setForm({ ...form, solicitante: event.target.value })} required minLength={2} />
                </label>
                <label className={mostrarErrores && !form.areaId ? 'invalido' : ''}>
                  Área
                  <select value={form.areaId || ''} aria-invalid={mostrarErrores && !form.areaId} onChange={(event) => setForm({ ...form, areaId: Number(event.target.value) })} required>
                    <option value="">Selecciona</option>
                    {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
                  </select>
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend>Qué se hizo</legend>
              <label className={mostrarErrores && !form.descripcion.trim() ? 'invalido' : ''}>
                Descripción
                <textarea value={form.descripcion} aria-invalid={mostrarErrores && !form.descripcion.trim()} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} required rows={3} />
              </label>
              <div className="split">
                <label>
                  Tipo de soporte
                  <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as TipoSoporte })}>
                    {TIPOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>
                  Atendido por
                  <select value={form.tecnicoId ?? ''} onChange={(event) => setForm({ ...form, tecnicoId: event.target.value ? Number(event.target.value) : undefined })}>
                    <option value="">Sin asignar</option>
                    {tecnicos.map((tecnico) => <option key={tecnico.id} value={tecnico.id}>{tecnico.nombre}</option>)}
                  </select>
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend>Cuándo</legend>
              <div className="split">
                <label className={mostrarErrores && !form.fechaSolicitud ? 'invalido' : ''}>
                  Fecha de solicitud
                  <input type="date" value={form.fechaSolicitud} aria-invalid={mostrarErrores && !form.fechaSolicitud} onChange={(event) => setForm({ ...form, fechaSolicitud: event.target.value })} required />
                </label>
                <label>
                  Fecha de entrega
                  <input type="date" value={form.fechaEntrega ?? ''} onChange={(event) => setForm({ ...form, fechaEntrega: event.target.value })} />
                </label>
              </div>
              <label>
                Tiempo de solución
                <input value={form.tiempoSoporte ?? ''} onChange={(event) => setForm({ ...form, tiempoSoporte: event.target.value })} />
              </label>
            </fieldset>
            {mostrarErrores ? <p className="alerta-campo" role="alert">Completa solicitante, área, descripción y fecha de solicitud.</p> : null}
            <div className="dialog-actions">
              <button type="button" className="ghost" onClick={() => setDialogOpen(false)}>Cancelar</button>
              <button type="submit" className="primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'No se pudo completar la solicitud';
}
