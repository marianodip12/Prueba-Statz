import { useQuery } from '@tanstack/react-query';
import { getMyPersonalStats, hasAnyPersonalData } from '@/lib/personal-profile-api';

export function PlayerHomePage() {
  const dataQ = useQuery({ queryKey: ['personal-has-data'], queryFn: hasAnyPersonalData });
  const statsQ = useQuery({
    queryKey: ['personal-stats'],
    queryFn: getMyPersonalStats,
    enabled: dataQ.data === true,
  });

  if (dataQ.isLoading) {
    return <div className="p-8 text-center text-neutral-500">Cargando…</div>;
  }

  if (!dataQ.data) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Bienvenido</h1>
        <p className="mb-6 text-neutral-500">
          Todavía no registraste ningún partido. Arrancá cargando tu primer partido.
        </p>
        <button
          type="button"
          disabled
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white opacity-60"
        >
          Cargar partido (próximamente)
        </button>
      </div>
    );
  }

  const s = statsQ.data;
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Mis estadísticas</h1>
      {!s ? (
        <p className="text-neutral-500">Cargando stats…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Partidos" value={s.matches_played} />
          <StatCard label="Ganados" value={s.wins} />
          <StatCard label="Perdidos" value={s.losses} />
          <StatCard label="Goles" value={s.goals} />
          <StatCard label="Tiros" value={s.total_shots} />
          <StatCard label="Efectividad" value={fmtPct(s.shot_efficiency)} />
          <StatCard label="Asistencias" value={s.assists} />
          <StatCard label="Pérdidas" value={s.turnovers} />
          <StatCard label="Exclusiones" value={s.exclusions} />
        </div>
      )}
      <p className="mt-8 text-center text-sm text-neutral-500">
        Registro de partidos y análisis detallado — próximamente.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function fmtPct(x: number | null): string {
  return x == null ? '—' : `${(x * 100).toFixed(0)}%`;
}
