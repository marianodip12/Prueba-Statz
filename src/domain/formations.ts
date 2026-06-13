import type { HandballEvent, LineupSnapshot } from './types';

/**
 * 📊 Análisis por formación.
 *
 * Cada evento de mi equipo (team='home') puede llevar un `lineup` con quién
 * estaba en cancha. Acá agregamos esos eventos por combinación de jugadores
 * para responder: "¿cuántos goles hice y recibí con cada formación?".
 *
 * Mariano pidió poder ver DOS modos por separado:
 *   - 'field'    → la formación cuenta solo los 6 de campo (ignora arquero)
 *   - 'fieldGk'  → la formación cuenta los 6 de campo + el arquero
 *
 * Goles a favor  = goles de mi equipo (home) con esa formación en cancha.
 * Goles recibidos = goles del rival (away) mientras esa formación estaba.
 *   ⚠️ Para los goles recibidos necesitamos saber qué formación tenía yo
 *   cuando el rival convirtió. Como el lineup solo se adjunta a MIS eventos,
 *   reconstruimos la formación "vigente" recorriendo los eventos en orden:
 *   la última formación vista en un evento home es la que estaba activa.
 */

export type LineupMode = 'field' | 'fieldGk';

export interface FormationStat {
  /** Clave estable de la formación (números ordenados). */
  key: string;
  /** Números de los jugadores de campo. */
  field: number[];
  /** Arquero (solo en modo 'fieldGk'). */
  goalkeeper: number | null;
  /** Goles convertidos por mi equipo con esta formación. */
  goalsFor: number;
  /** Goles recibidos del rival con esta formación. */
  goalsAgainst: number;
  /** Tiros totales de mi equipo (goal+miss+saved+post). */
  shots: number;
  /** Cantidad de eventos de mi equipo con esta formación (proxy de "uso"). */
  myEvents: number;
}

const SHOT_TYPES = new Set(['goal', 'miss', 'saved', 'post']);

/** Clave canónica de una formación según el modo. */
const lineupKey = (lu: LineupSnapshot, mode: LineupMode): string => {
  const field = [...lu.field].sort((a, b) => a - b).join('-');
  if (mode === 'field') return field;
  return `${field}|gk:${lu.goalkeeper ?? 'vacia'}`;
};

/**
 * Agrega estadísticas por formación.
 * Solo considera eventos que tengan `lineup` (los viejos sin formación se ignoran).
 */
export const perFormation = (
  events: HandballEvent[],
  mode: LineupMode,
): FormationStat[] => {
  const map = new Map<string, FormationStat>();
  // Formación vigente, reconstruida en orden cronológico a partir de mis eventos.
  let current: LineupSnapshot | null = null;

  const ordered = [...events].sort((a, b) => a.min - b.min);

  for (const e of ordered) {
    // Actualizamos la formación vigente con cada evento mío que la traiga.
    if (e.team === 'home' && e.lineup && e.lineup.field.length > 0) {
      current = e.lineup;
    }

    if (e.team === 'home') {
      // Evento de mi equipo: usa su propia formación (o la vigente como respaldo).
      const lu = e.lineup && e.lineup.field.length > 0 ? e.lineup : current;
      if (!lu) continue;
      const key = lineupKey(lu, mode);
      const stat = map.get(key) ?? blank(key, lu, mode);
      stat.myEvents++;
      if (e.type === 'goal') stat.goalsFor++;
      if (SHOT_TYPES.has(e.type)) stat.shots++;
      map.set(key, stat);
    } else if (e.team === 'away' && e.type === 'goal') {
      // Gol del rival: lo imputamos a la formación que YO tenía en ese momento.
      if (!current) continue;
      const key = lineupKey(current, mode);
      const stat = map.get(key) ?? blank(key, current, mode);
      stat.goalsAgainst++;
      map.set(key, stat);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.myEvents - a.myEvents || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst),
  );
};

const blank = (key: string, lu: LineupSnapshot, mode: LineupMode): FormationStat => ({
  key,
  field: [...lu.field].sort((a, b) => a - b),
  goalkeeper: mode === 'fieldGk' ? lu.goalkeeper : null,
  goalsFor: 0,
  goalsAgainst: 0,
  shots: 0,
  myEvents: 0,
});

/** ¿Este partido tiene datos de formación cargados? */
export const hasFormationData = (events: HandballEvent[]): boolean =>
  events.some((e) => e.team === 'home' && e.lineup && e.lineup.field.length > 0);
