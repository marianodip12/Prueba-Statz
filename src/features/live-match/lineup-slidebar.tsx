import { useMemo, useState } from 'react';
import { useMatchStore, selectHomeTeam } from '@/lib/store';
import type { Player } from '@/domain/types';
import { cn } from '@/lib/cn';

/**
 * 🧩 Slidebar de formación (En Vivo) — v2 (rediseño lateral).
 *
 * Columna vertical compacta con 3 sectores:
 *   • ARCO   → 1 chip (arquero puesto) + botón dedicado si el arco está vacío.
 *   • CAMPO  → 6 o 7 chips (6 con arquero, 7 con arco vacío).
 *   • BANCO  → resto del plantel, paginado con ▲▼ si son muchos.
 *
 * Interacción v1: tap con selección.
 *   1. Tap en jugador del CAMPO → queda seleccionado (borde primary).
 *      • Segundo tap en el mismo → sale al banco.
 *      • Tap en un suplente del BANCO → swap (sale el seleccionado, entra el suplente).
 *   2. Tap en un suplente del BANCO sin selección previa → intenta agregar al campo
 *      respetando el máximo (6 con arquero, 7 sin arquero). Si está lleno, no hace nada.
 *   3. Tap en el chip del ARCO → saca al arquero (arco vacío).
 *      Con arco vacío, los suplentes del banco que son arqueros muestran badge para meterlos.
 *   4. Botón "Portería vacía" sticky abajo → fuerza arco vacío (útil para la regla de handball
 *      moderno donde se saca el arquero para meter un 7mo jugador de campo).
 *
 * La formación actual se adjunta a cada evento del equipo local en el store
 * (ver `addLiveEvent`), habilitando el análisis por formación post-partido.
 *
 * v2 (pendiente): drag & drop + reglas de exclusión (2min / roja).
 */

const MAX_FIELD_WITH_GK = 6;
const MAX_FIELD_NO_GK = 7;

const maxFieldFor = (gkNum: number | null) => (gkNum == null ? MAX_FIELD_NO_GK : MAX_FIELD_WITH_GK);

export const LineupSlidebar = ({ className }: { className?: string }) => {
  const myTeam = useMatchStore(selectHomeTeam);
  const lineup = useMatchStore((s) => s.liveLineup);
  const swapFieldPlayer = useMatchStore((s) => s.swapFieldPlayer);
  const setGoalkeeper = useMatchStore((s) => s.setGoalkeeper);
  const setLiveLineup = useMatchStore((s) => s.setLiveLineup);

  const [selectedField, setSelectedField] = useState<number | null>(null);
  const [benchPage, setBenchPage] = useState(0);

  const players = myTeam?.players ?? [];
  const byNumber = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of players) m.set(p.number, p);
    return m;
  }, [players]);

  const nameOf = (num: number) => byNumber.get(num)?.name ?? `#${num}`;

  const fieldNums = lineup.field;
  const gkNum = lineup.goalkeeper;
  const maxField = maxFieldFor(gkNum);
  const isFieldFull = fieldNums.length >= maxField;

  // Banco = plantel que no está en campo ni es el arquero actual
  const benchPlayers = useMemo(
    () =>
      players
        .filter((p) => !fieldNums.includes(p.number) && p.number !== gkNum)
        .sort((a, b) => a.number - b.number),
    [players, fieldNums, gkNum],
  );

  const goalkeeperCandidates = useMemo(
    () => benchPlayers.filter((p) => /arq|gk|portero|golero/i.test(p.position)),
    [benchPlayers],
  );

  // Paginación del banco: 4 por página cuando no cabe todo
  const BENCH_PER_PAGE = 4;
  const totalBenchPages = Math.max(1, Math.ceil(benchPlayers.length / BENCH_PER_PAGE));
  const clampedPage = Math.min(benchPage, totalBenchPages - 1);
  const benchNeedsPaging = benchPlayers.length > BENCH_PER_PAGE;
  const benchVisible = benchNeedsPaging
    ? benchPlayers.slice(clampedPage * BENCH_PER_PAGE, clampedPage * BENCH_PER_PAGE + BENCH_PER_PAGE)
    : benchPlayers;

  const handleBenchClick = (num: number) => {
    // Si el suplente es arquero y el arco está vacío → lo pongo de arquero
    const p = byNumber.get(num);
    if (p && gkNum == null && /arq|gk|portero|golero/i.test(p.position) && selectedField == null) {
      setGoalkeeper(num);
      return;
    }
    // Si hay uno seleccionado en campo → swap
    if (selectedField != null) {
      swapFieldPlayer(selectedField, num);
      setSelectedField(null);
      return;
    }
    // Sin selección: agregar al campo si hay lugar
    if (isFieldFull) return; // ignorar tap si está lleno
    swapFieldPlayer(null, num);
  };

  const handleFieldClick = (num: number) => {
    if (selectedField === num) {
      // Segundo tap → al banco
      setLiveLineup({
        field: fieldNums.filter((n) => n !== num),
        goalkeeper: gkNum,
      });
      setSelectedField(null);
    } else {
      setSelectedField(num);
    }
  };

  const handleClearGoalkeeper = () => setGoalkeeper(null);

  if (!myTeam) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border bg-surface p-3', className)}>
        <p className="text-[10px] text-muted-fg text-center leading-tight">
          Elegí tu equipo para gestionar la formación.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5 h-full', className)}>
      {/* ── ARCO ─────────────────────────────────────────────────── */}
      <Sector label="ARCO" tone="info">
        {gkNum != null ? (
          <PlayerChip
            number={gkNum}
            name={nameOf(gkNum)}
            tone="info"
            onClick={handleClearGoalkeeper}
            title="Tocar para sacar al arquero"
          />
        ) : (
          <div className="px-1 py-2 text-center">
            <div className="text-base leading-none text-warning">⊘</div>
            <div className="text-[8px] text-muted-fg mt-1 leading-tight">Sin arquero</div>
          </div>
        )}
        {/* Candidatos a arquero visibles solo con arco vacío */}
        {gkNum == null && goalkeeperCandidates.length > 0 && (
          <div className="border-t border-border">
            {goalkeeperCandidates.slice(0, 2).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setGoalkeeper(p.number)}
                className="w-full py-1 text-center hover:bg-surface-2 transition-colors opacity-80 border-b border-border last:border-b-0"
                title="Poner de arquero"
              >
                <div className="text-sm font-semibold leading-none text-info">{p.number}</div>
                <div className="text-[8px] text-muted-fg mt-0.5 truncate px-0.5">{p.name}</div>
              </button>
            ))}
          </div>
        )}
      </Sector>

      {/* ── CAMPO ────────────────────────────────────────────────── */}
      <Sector label="CAMPO" tone="success" count={`${fieldNums.length}/${maxField}`}>
        {fieldNums.length === 0 ? (
          <p className="text-[9px] text-muted-fg text-center py-2 px-1 leading-tight">
            Tocá suplentes para poner en cancha
          </p>
        ) : (
          fieldNums.map((num) => (
            <PlayerChip
              key={num}
              number={num}
              name={nameOf(num)}
              tone="success"
              selected={selectedField === num}
              onClick={() => handleFieldClick(num)}
            />
          ))
        )}
        {isFieldFull && (
          <div className="text-[8px] text-warning text-center px-1 py-1 border-t border-border leading-tight">
            Cancha llena
          </div>
        )}
      </Sector>

      {/* ── BANCO ────────────────────────────────────────────────── */}
      <Sector label="BANCO" tone="muted" grow>
        {benchNeedsPaging && (
          <button
            type="button"
            onClick={() => setBenchPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
            className="w-full py-0.5 text-muted-fg text-xs hover:bg-surface-2 disabled:opacity-30 transition-colors"
            aria-label="Anterior"
          >
            ▲
          </button>
        )}
        {benchVisible.length === 0 ? (
          <p className="text-[9px] text-muted-fg text-center py-2 leading-tight">Sin suplentes</p>
        ) : (
          benchVisible.map((p) => (
            <PlayerChip
              key={p.id}
              number={p.number}
              name={p.name}
              tone="muted"
              onClick={() => handleBenchClick(p.number)}
              disabled={isFieldFull && selectedField == null && !(gkNum == null && /arq|gk|portero|golero/i.test(p.position))}
            />
          ))
        )}
        {benchNeedsPaging && (
          <button
            type="button"
            onClick={() => setBenchPage((p) => Math.min(totalBenchPages - 1, p + 1))}
            disabled={clampedPage === totalBenchPages - 1}
            className="w-full py-0.5 text-muted-fg text-xs hover:bg-surface-2 disabled:opacity-30 transition-colors"
            aria-label="Siguiente"
          >
            ▼
          </button>
        )}
      </Sector>

      {/* ── Portería vacía sticky ─────────────────────────────────── */}
      {gkNum != null && (
        <button
          type="button"
          onClick={handleClearGoalkeeper}
          className="rounded-lg border border-warning/40 bg-warning/10 hover:bg-warning/20 transition-colors py-2 px-1 text-center"
          title="Sacar arquero para poder meter 7mo de campo"
        >
          <div className="text-lg leading-none text-warning">⊘</div>
          <div className="text-[8px] text-warning mt-1 leading-tight">Portería<br />vacía</div>
        </button>
      )}

      {selectedField != null && (
        <p className="text-[9px] text-info text-center px-1 leading-tight">
          #{selectedField} seleccionado. Tocá suplente para cambiar, o de nuevo para sacar.
        </p>
      )}
    </div>
  );
};

// ─── Subcomponentes ────────────────────────────────────────────────

const SECTOR_HEADER: Record<string, string> = {
  info: 'bg-info/20 text-info',
  success: 'bg-success/20 text-success',
  muted: 'bg-surface-2 text-muted-fg',
};

const SECTOR_BORDER: Record<string, string> = {
  info: 'border-info/30',
  success: 'border-success/30',
  muted: 'border-border',
};

const Sector = ({
  label, tone, count, grow, children,
}: {
  label: string;
  tone: keyof typeof SECTOR_HEADER;
  count?: string;
  grow?: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      'rounded-lg border bg-surface overflow-hidden flex flex-col',
      SECTOR_BORDER[tone],
      grow && 'flex-1 min-h-0',
    )}
  >
    <div className={cn('px-1.5 py-0.5 flex items-center justify-between', SECTOR_HEADER[tone])}>
      <span className="text-[8px] font-bold tracking-widest">{label}</span>
      {count && <span className="text-[8px] opacity-80">{count}</span>}
    </div>
    <div className={cn('flex flex-col', grow && 'flex-1 overflow-y-auto')}>{children}</div>
  </div>
);

const CHIP_TONE: Record<string, string> = {
  info: 'text-info',
  success: 'text-success',
  muted: 'text-fg',
};

const PlayerChip = ({
  number, name, tone, selected, onClick, disabled, title,
}: {
  number: number;
  name: string;
  tone: keyof typeof CHIP_TONE;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'w-full py-1 px-0.5 text-center border-b border-border last:border-b-0 transition-colors',
      selected ? 'bg-primary/25 ring-1 ring-primary/60' : 'hover:bg-surface-2',
      tone === 'muted' && !selected && 'opacity-75',
      disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
    )}
  >
    <div className={cn('text-lg font-bold leading-none', CHIP_TONE[tone])}>{number}</div>
    <div className="text-[8px] text-muted-fg mt-0.5 truncate leading-tight">{name}</div>
  </button>
);
