import { useMemo, useState } from 'react';
import type { HandballEvent, HandballTeam } from '@/domain/types';
import { perFormation, hasFormationData, type LineupMode } from '@/domain/formations';
import { cn } from '@/lib/cn';

/**
 * 📊 Panel de análisis por formación (página de análisis del partido).
 * Muestra goles a favor / en contra / eficacia por combinación de jugadores,
 * con toggle entre "solo campo (6)" y "campo + arquero".
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
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-muted-fg border-b border-border">
              <th className="text-left font-medium py-1.5 pr-2">Formación</th>
              {mode === 'fieldGk' && <th className="text-center font-medium py-1.5 px-1">Arq</th>}
              <th className="text-center font-medium py-1.5 px-1.5">GF</th>
              <th className="text-center font-medium py-1.5 px-1.5">GC</th>
              <th className="text-center font-medium py-1.5 px-1.5">Dif</th>
              <th className="text-center font-medium py-1.5 px-1.5">Tiros</th>
              <th className="text-center font-medium py-1.5 px-1.5">%Ef</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const diff = s.goalsFor - s.goalsAgainst;
              const eff = s.shots > 0 ? Math.round((s.goalsFor / s.shots) * 100) : 0;
              return (
                <tr key={s.key} className="border-b border-border/50 last:border-b-0">
                  <td className="py-1.5 pr-2">
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
                  <td className="text-center px-1.5 font-mono font-semibold text-success">{s.goalsFor}</td>
                  <td className="text-center px-1.5 font-mono font-semibold text-danger">{s.goalsAgainst}</td>
                  <td className={cn('text-center px-1.5 font-mono font-semibold', diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-muted-fg')}>
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="text-center px-1.5 font-mono text-muted-fg">{s.shots}</td>
                  <td className="text-center px-1.5 font-mono text-primary">{eff}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[9px] text-muted-fg leading-relaxed">
        <strong>GF</strong> goles a favor · <strong>GC</strong> goles en contra (recibidos mientras esa
        formación estaba en cancha) · <strong>Dif</strong> diferencia · <strong>%Ef</strong> eficacia de tiro.
        El orden es por uso (cuántas jugadas tuvo cada formación).
      </p>
    </section>
  );
};
