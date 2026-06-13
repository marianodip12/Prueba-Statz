import { useMemo, useState } from 'react';
import { useMatchStore, selectHomeTeam } from '@/lib/store';
import type { Player } from '@/domain/types';
import { cn } from '@/lib/cn';

/**
 * 🧩 Slidebar de formación (En Vivo).
 *
 * Columna lateral con 3 zonas — Arco / Campo / Banco — para gestionar
 * quién está en cancha durante el partido. La formación actual se
 * adjunta automáticamente a cada evento de mi equipo (ver store.addLiveEvent),
 * lo que después habilita el análisis por formación.
 *
 * Interacción:
 *  - Tocás un jugador del banco → entra al campo (si hay un seleccionado
 *    en campo, lo reemplaza; si no, se agrega).
 *  - Tocás un jugador del campo → queda "seleccionado" para el próximo swap,
 *    o si tocás de nuevo, lo mandás al banco.
 *  - Arco: tocás un suplente arquero para ponerlo, o "Portería vacía".
 */
export const LineupSlidebar = ({ className }: { className?: string }) => {
  const myTeam = useMatchStore(selectHomeTeam);
  const lineup = useMatchStore((s) => s.liveLineup);
  const swapFieldPlayer = useMatchStore((s) => s.swapFieldPlayer);
  const setGoalkeeper = useMatchStore((s) => s.setGoalkeeper);
  const setLiveLineup = useMatchStore((s) => s.setLiveLineup);

  const [selectedField, setSelectedField] = useState<number | null>(null);

  const players = myTeam?.players ?? [];
  const byNumber = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of players) m.set(p.number, p);
    return m;
  }, [players]);

  const nameOf = (num: number) => byNumber.get(num)?.name ?? `#${num}`;

  // Jugadores en cancha y arquero
  const fieldNums = lineup.field;
  const gkNum = lineup.goalkeeper;

  // Banco = todos los del plantel que NO están en campo ni son el arquero actual
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

  const handleBenchClick = (num: number) => {
    // Si el suplente es arquero y el arco está vacío → lo pongo de arquero
    swapFieldPlayer(selectedField, num);
    setSelectedField(null);
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

  if (!myTeam) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border bg-surface p-3', className)}>
        <p className="text-[11px] text-muted-fg text-center">Seleccioná un equipo para gestionar la formación.</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* ── ARCO ── */}
      <Zone title="🥅 ARCO" tone="info">
        {gkNum != null ? (
          <Chip
            label={gkNum}
            sub={nameOf(gkNum)}
            tone="info"
            big
            onClick={() => setGoalkeeper(null)}
          />
        ) : null}
        <button
          type="button"
          onClick={() => setGoalkeeper(null)}
          className={cn(
            'w-full py-1.5 text-center border-t border-border transition-colors',
            gkNum == null ? 'bg-danger/15' : 'hover:bg-surface-2',
          )}
        >
          <div className="text-base leading-none text-warning">⊘</div>
          <div className="text-[8px] text-muted-fg mt-0.5">Vacía</div>
        </button>
        {/* candidatos a arquero desde el banco */}
        {goalkeeperCandidates.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setGoalkeeper(p.number)}
            className="w-full py-1 text-center border-t border-border hover:bg-surface-2 transition-colors opacity-70"
          >
            <div className="text-sm font-semibold leading-none text-info">{p.number}</div>
            <div className="text-[8px] text-muted-fg">{p.name}</div>
          </button>
        ))}
      </Zone>

      {/* ── CAMPO ── */}
      <Zone title={`🟢 CAMPO · ${fieldNums.length}`} tone="success" grow>
        {fieldNums.length === 0 ? (
          <p className="text-[9px] text-muted-fg text-center py-2 px-1">
            Tocá suplentes para poner jugadores en cancha
          </p>
        ) : (
          fieldNums.map((num) => (
            <Chip
              key={num}
              label={num}
              sub={nameOf(num)}
              tone="success"
              selected={selectedField === num}
              onClick={() => handleFieldClick(num)}
            />
          ))
        )}
      </Zone>

      {/* ── BANCO ── */}
      <Zone title="🪑 BANCO" tone="warning">
        {benchPlayers.length === 0 ? (
          <p className="text-[9px] text-muted-fg text-center py-2">Sin suplentes</p>
        ) : (
          benchPlayers.map((p) => (
            <Chip
              key={p.id}
              label={p.number}
              sub={p.name}
              tone="muted"
              onClick={() => handleBenchClick(p.number)}
            />
          ))
        )}
      </Zone>

      {selectedField != null && (
        <p className="text-[9px] text-info text-center px-1">
          {nameOf(selectedField)} seleccionado · tocá un suplente para cambiar, o de nuevo para sacarlo
        </p>
      )}
    </div>
  );
};

// ─── Subcomponentes ───────────────────────────────────────────────────

const ZONE_HEADER: Record<string, string> = {
  info: 'bg-info/20 text-info',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
};

const Zone = ({
  title, tone, grow, children,
}: {
  title: string; tone: keyof typeof ZONE_HEADER; grow?: boolean; children: React.ReactNode;
}) => (
  <div className={cn('rounded-lg border border-border bg-surface overflow-hidden flex flex-col', grow && 'flex-1')}>
    <div className={cn('py-0.5 text-center', ZONE_HEADER[tone])}>
      <span className="text-[9px] font-bold tracking-widest">{title}</span>
    </div>
    <div className={cn('flex flex-col', grow && 'flex-1 overflow-y-auto')}>{children}</div>
  </div>
);

const CHIP_TONE: Record<string, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  muted: 'text-muted-fg',
};

const Chip = ({
  label, sub, tone, big, selected, onClick,
}: {
  label: number | string; sub: string; tone: keyof typeof CHIP_TONE;
  big?: boolean; selected?: boolean; onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full py-1.5 px-1 text-center border-b border-border last:border-b-0 transition-colors',
      selected ? 'bg-primary/25' : 'hover:bg-surface-2',
      tone === 'muted' && 'opacity-70',
    )}
  >
    <div className={cn('font-bold leading-none', big ? 'text-lg' : 'text-base', CHIP_TONE[tone])}>
      {label}
    </div>
    <div className="text-[9px] text-muted-fg mt-0.5 truncate">{sub}</div>
  </button>
);
