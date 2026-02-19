import { useEffect, useState } from "react";
import api from "../../api";

export default function Stats() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/stats/overview?year=${year}`);
        setRows(res.data || []);
      } catch (err) {
        const msg = err?.response?.data?.detail || "Failed to load stats";
        setError(typeof msg === "string" ? msg : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  const totalMeetingPoints = rows.reduce((sum, r) => sum + (r.meeting_points_count || 0), 0);
  const totalCartSessions = rows.reduce((sum, r) => sum + (r.cart_sessions_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Statistics</h1>
          <p className="text-sm text-gray-500">Resumen anual por publicador.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Year</span>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[0, 1, 2, 3].map((offset) => {
              const y = currentYear - offset;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-gray-500">Meeting Points</div>
          <div className="text-2xl font-semibold text-gray-900">{totalMeetingPoints}</div>
        </div>
        <div className="border border-gray-200 rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-gray-500">Carros</div>
          <div className="text-2xl font-semibold text-gray-900">{totalCartSessions}</div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">By User</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Meeting Points</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last MP</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Carros</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Carro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={5}>
                    No data yet.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.user_id}>
                    <td className="p-4 text-gray-900">
                      {row.firstname} {row.lastname}
                    </td>
                    <td className="p-4 text-gray-700">{row.meeting_points_count}</td>
                    <td className="p-4 text-gray-500">{row.meeting_points_last_date || "-"}</td>
                    <td className="p-4 text-gray-700">{row.cart_sessions_count}</td>
                    <td className="p-4 text-gray-500">{row.cart_sessions_last_date || "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
