import React, { useState, useMemo } from 'react';
import { UpcomingDividend } from '../types/portfolio';
import { formatEUR, formatNumber, getAvailableFiscalYears } from '../utils/formatters';
import { Calendar, Filter, ChevronLeft, ChevronRight, DollarSign, CheckCircle2 } from 'lucide-react';

interface DividendCalendarViewProps {
  upcomingDividends: UpcomingDividend[];
}

export function DividendCalendarView({ upcomingDividends }: DividendCalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(15);

  // Años dinámicos que se expanden automáticamente para 2027 y futuros
  const availableYears = useMemo(
    () => getAvailableFiscalYears(upcomingDividends.map(d => {
      const parts = d.date.split(/[/-]/);
      return parts.length === 3 ? parseInt(parts[2], 10) : undefined;
    })),
    [upcomingDividends]
  );

  const [selectedYear, setSelectedYear] = useState<string>(() => String(availableYears[0] || '2026'));

  // Month days layout for Septiembre 2026 (starts on Tuesday = index 1)
  // Septiembre 2026 has 30 days
  const calendarDays = [
    { day: 1, hasDividend: false },
    { day: 2, hasDividend: false },
    { day: 3, hasDividend: false },
    { day: 4, hasDividend: false },
    { day: 5, hasDividend: false },
    { day: 6, hasDividend: false },
    { day: 7, hasDividend: false },
    { day: 8, hasDividend: false },
    { day: 9, hasDividend: false },
    { day: 10, hasDividend: false },
    { day: 11, hasDividend: false },
    { day: 12, hasDividend: false },
    { day: 13, hasDividend: false },
    { day: 14, hasDividend: false },
    { day: 15, hasDividend: true, symbol: 'MSFT', amount: '0,83 €' },
    { day: 16, hasDividend: false },
    { day: 17, hasDividend: false },
    { day: 18, hasDividend: false },
    { day: 19, hasDividend: false },
    { day: 20, hasDividend: false },
    { day: 21, hasDividend: false },
    { day: 22, hasDividend: false },
    { day: 23, hasDividend: false },
    { day: 24, hasDividend: false },
    { day: 25, hasDividend: false },
    { day: 26, hasDividend: false },
    { day: 27, hasDividend: false },
    { day: 28, hasDividend: false },
    { day: 29, hasDividend: false },
    { day: 30, hasDividend: true, symbol: 'AAPL', amount: '0,24 €' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Filter Bar - Screen 10 */}
      <div className="bg-[#12233f] border border-slate-700/70 p-4 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Calendario y previsión de dividendos
          </h2>
          <p className="text-xs text-slate-400">
            Fechas de corte (ex-dividend) y pagos confirmados a cuenta
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:border-blue-500"
          >
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>
                Año: {yr}
              </option>
            ))}
          </select>

          <button className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* 2 Column Layout - Screen 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Próximos dividendos (Table) */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 mb-3">
              Próximos dividendos
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Empresa</th>
                    <th className="py-2.5 px-3">Símbolo</th>
                    <th className="py-2.5 px-3 text-right">Dividendo (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {upcomingDividends.map(div => (
                    <tr
                      key={div.id}
                      onClick={() => {
                        const day = parseInt(div.date.split('/')[0], 10);
                        if (!isNaN(day)) setSelectedDay(day);
                      }}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-300 font-mono">{div.date}</td>
                      <td className="py-3 px-3 text-white font-medium">{div.company}</td>
                      <td className="py-3 px-3 font-bold text-blue-400 font-mono">{div.symbol}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono">
                        {formatNumber(div.dividendPerShareEUR)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Estimación anual bruta prevista:</span>
            <span className="text-emerald-400 font-bold font-mono text-sm">4.892,30 €</span>
          </div>
        </div>

        {/* Right: Calendario interactivo (Septiembre 2026) */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-white">Septiembre 2026</h3>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
            <div>L</div>
            <div>M</div>
            <div>X</div>
            <div>J</div>
            <div>V</div>
            <div>S</div>
            <div>D</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {/* Blank offset for Monday start */}
            <div className="p-2 text-slate-600">31</div>

            {calendarDays.map(item => {
              const isSelected = selectedDay === item.day;
              return (
                <button
                  key={item.day}
                  onClick={() => setSelectedDay(item.day)}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                    item.hasDividend
                      ? isSelected
                        ? 'bg-emerald-500 text-white font-extrabold shadow-lg shadow-emerald-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 hover:bg-emerald-500/30'
                      : isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{item.day}</span>
                  {item.hasDividend && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Day selection detail card */}
          {selectedDay && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Día {selectedDay} de Septiembre:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {selectedDay === 15
                    ? 'Microsoft (MSFT) · Dividendo de 0,83 €/acción'
                    : selectedDay === 30
                    ? 'Apple (AAPL) · Dividendo de 0,24 €/acción'
                    : 'Sin pagos programados'}
                </p>
              </div>
              {(selectedDay === 15 || selectedDay === 30) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  Confirmado
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
