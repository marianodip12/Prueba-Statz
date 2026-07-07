import { useMemo, useState } from 'react';
import type { HandballEvent, HandballTeam } from '@/domain/types';
import { perFormation, hasFormationData, type LineupMode } from '@/domain/formations';
import { cn } from '@/lib/cn';

/**
 * 📊 Panel de análisis por formación — v2.
 *
 * Tabla con una fila por combinación de jugadores, mostrando:
 *   Ataque:  GF · Errados · Atajados · Palos · Tiros · % Ef ataque
 *   Defensa: GC · Atajadas de mi GK · Err rival · Palos rival · Tiros rival · % Ef defensa
 *   Balance: Diferencia de gol · Uso (eventos totales)
 *
 * Toggle entre "solo campo" y "campo + arquero".
 *
 * En mobile la tabla es scrolleable horizontal (13-14 columnas no caben en 400px).
 */
export const FormationAnalysisPanel = ({
  events,
  myTeam,
}: {
  events: HandballEvent[];
  myTeam: HandballTeam | null;
}) => {
  const [mode, setMode] = useState<LineupMode>('field');

  const has = useMemo(() => hasFormationData(events), [events]);
  const stats = useMemo(() => perFormation(events, mode), [events, mode]);

  const nameOf = (num: number) =>
    myTeam?.players.find((p) => p.number === num)?.name ?? `#${num}`;

  if (!has) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-xs font-medium text-fg mb-1.5">📊 Análisis por formación</h3>
        <p className="text-[11px] text-muted-fg leading-relaxed">
          Este partido no tiene datos de formación. Para verlos, durante el partido en vivo
          abrí "🧩 Formación en cancha" y marcá quiénes están jugando. A partir de ahí, cada
          gol queda asociado a la formación que tenías en cancha.
        </p>
      </section>
    );
  }

  const pct = (v: number | null) =>
    v == null ? '—' : `${Math.round(v * 100)}%`;

  return (
    <section className="rounded-lg border border-border bg-surface p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-medium text-fg">📊 Análisis por formación</h3>
        <div className="flex rounded-md border border-border overflow-hidden text-[10px]">
          <button
            type="button"
            onClick={() => setMode('field')}
            className={cn('px-2.5 py-1 transition-colors', mode === 'field' ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg')}
          >
            Solo campo (6)
          </button>
          <button
            type="button"
            onClick={() => setMode('fieldGk')}
            className={cn('px-2.5 py-1 transition-colors border-l border-border', mode === 'fieldGk' ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg')}
          >
            Campo + arquero
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[11px] whitespace-nowrap">
          <thead>
            <tr className="text-muted-fg border-b border-border">
              <th className="text-left font-medium py-1.5 pr-2 sticky left-0 bg-surface">Formación</th>
              {mode === 'fieldGk' && <th className="text-center font-medium py-1.5 px-1">Arq</th>}
              {/* Ataque */}
              <th className="text-center font-medium py-1.5 px-1.5 border-l border-border/40 text-success">GF</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Err</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Ataj</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Palo</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Tiros</th>
              <th className="text-center font-medium py-1.5 px-1.5 text-success">%Ef</th>
              {/* Defensa */}
              <th className="text-center font-medium py-1.5 px-1.5 border-l border-border/40 text-danger">GC</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">AtajGK</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">ErrR</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">PaloR</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">TirosR</th>
              <th className="text-center font-medium py-1.5 px-1.5 text-danger">%Ef</th>
              {/* Balance */}
              <th className="text-center font-medium py-1.5 px-1.5 border-l border-border/40 text-primary">Dif</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Uso</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.key} className="border-b border-border/50 last:border-b-0">
                <td className="py-1.5 pr-2 sticky left-0 bg-surface">
                  <div className="flex flex-wrap gap-1">
                    {s.field.map((num) => (
                      <span
                        key={num}
                        className="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1 py-0.5 text-[10px]"
                        title={nameOf(num)}
                      >
                        <span className="font-semibold text-success">{num}</span>
                        <span className="text-muted-fg truncate max-w-[60px]">{nameOf(num)}</span>
                      </span>
                    ))}
                  </div>
                </td>
                {mode === 'fieldGk' && (
                  <td className="text-center px-1 text-info font-semibold">
                    {s.goalkeeper == null ? '⊘' : s.goalkeeper}
                  </td>
                )}
                {/* Ataque */}
                <td className="text-center px-1.5 font-mono font-semibold text-success border-l border-border/40">{s.goalsFor}</td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.missedShots}</td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.savedShots}</td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.postedShots}</td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.shots}</td>
                <td className="text-center px-1.5 font-mono font-semibold text-success">{pct(s.attackEfficiency)}</td>
                {/* Defensa */}
                <td className="text-center px-1.5 font-mono font-semibold text-danger border-l border-border/40">{s.goalsAgainst}</td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.saves}</td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.opponentMisses}</td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.opponentPosts}</td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.opponentShots}</td>
                <td className="text-center px-1.5 font-mono font-semibold text-danger">{pct(s.defenseEfficiency)}</td>
                {/* Balance */}
                <td className={cn('text-center px-1.5 font-mono font-semibold border-l border-border/40',
                  s.goalDiff > 0 ? 'text-success' : s.goalDiff < 0 ? 'text-danger' : 'text-muted-fg')}>
                  {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                </td>
                <td className="text-center px-1 font-mono text-muted-fg">{s.totalEvents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[9px] text-muted-fg leading-relaxed space-y-0.5">
        <p>
          <strong className="text-success">Ataque:</strong> GF goles a favor · Err errados · Ataj atajados por GK rival · Palo · Tiros totales · %Ef eficacia (goles/tiros).
        </p>
        <p>
          <strong className="text-danger">Defensa:</strong> GC goles en contra · AtajGK atajadas de mi arquero · ErrR errados del rival · PaloR palos del rival · TirosR tiros totales del rival · %Ef eficacia defensiva (1 − GC/TirosR).
        </p>
        <p>
          <strong className="text-primary">Balance:</strong> Dif diferencia de gol · Uso eventos atribuibles a la formación. Ordenado por uso, desempate por diferencia.
        </p>
      </div>
    </section>
  );
};
