import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const MONTH_NAMES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function priorityBadge(count, maxCount) {
  if (maxCount === 0) return null;
  const ratio = count / maxCount;
  if (ratio <= 0.33)
    return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Alta</span>;
  if (ratio <= 0.66)
    return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Media</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Baja</span>;
}

export default function MeetingPointStats() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/meeting-points/stats?year=${year}`),
      api.get(`/meeting-points/stats/monthly?year=${year}`),
    ])
      .then(([statsRes, monthlyRes]) => {
        setStats(statsRes.data);
        setMonthlyStats(monthlyRes.data);
      })
      .catch(() => {
        setStats([]);
        setMonthlyStats([]);
      })
      .finally(() => setLoading(false));
  }, [year]);

  // Summary calculations
  const totalPoints = useMemo(() => stats.reduce((sum, s) => sum + s.count, 0), [stats]);
  const totalConductors = useMemo(() => stats.filter((s) => s.count > 0).length, [stats]);
  const avgPerPerson = useMemo(
    () => (totalConductors > 0 ? (totalPoints / totalConductors).toFixed(1) : "0"),
    [totalPoints, totalConductors]
  );
  const maxCount = useMemo(() => Math.max(...stats.map((s) => s.count), 1), [stats]);

  // Monthly chart data: group by month, get counts per user
  const monthlyChartData = useMemo(() => {
    const months = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      months[key] = { month: key, label: MONTH_NAMES[m], total: 0, conductors: {} };
    }
    monthlyStats.forEach((row) => {
      if (months[row.month]) {
        months[row.month].total += row.count;
        const name = `${row.firstname} ${row.lastname}`;
        months[row.month].conductors[name] = (months[row.month].conductors[name] || 0) + row.count;
      }
    });
    return Object.values(months);
  }, [monthlyStats, year]);

  const monthlyMax = useMemo(() => Math.max(...monthlyChartData.map((m) => m.total), 1), [monthlyChartData]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas de Directores</h1>
        <button
          onClick={() => navigate("/user/meeting-points")}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Volver a Puntos de Encuentro
        </button>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg font-semibold text-gray-800 min-w-[80px] text-center">{year}</span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Total asignaciones</div>
              <div className="text-3xl font-bold text-gray-900">{totalPoints}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Directores activos</div>
              <div className="text-3xl font-bold text-gray-900">{totalConductors}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Promedio por persona</div>
              <div className="text-3xl font-bold text-gray-900">{avgPerPerson}</div>
            </div>
          </div>

          {/* Ranking table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Ranking de Directores</h2>
              <p className="text-sm text-gray-500">Ordenado por prioridad (menos asignaciones = mayor prioridad)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Cantidad</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Última fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Prioridad</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-1/4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No hay datos para este año
                      </td>
                    </tr>
                  )}
                  {stats.map((s, idx) => (
                    <tr key={s.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {s.firstname} {s.lastname}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{s.count}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.last_date
                          ? new Date(s.last_date + "T00:00:00").toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{priorityBadge(s.count, maxCount)}</td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${maxCount > 0 ? (s.count / maxCount) * 100 : 0}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly breakdown chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Desglose Mensual</h2>
            <div className="space-y-3">
              {monthlyChartData.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-10 shrink-0">{m.label}</span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                      {m.total > 0 && (
                        <div
                          className="h-6 rounded-full bg-blue-500 transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(m.total / monthlyMax) * 100}%`, minWidth: "24px" }}
                        >
                          <span className="text-xs text-white font-medium">{m.total}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 w-20 shrink-0 text-right truncate">
                    {Object.keys(m.conductors).length > 0
                      ? `${Object.keys(m.conductors).length} dir.`
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
