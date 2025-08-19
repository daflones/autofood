import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns'

export type DayInfo = {
  date: Date
  dateStr: string // yyyy-MM-dd
  label: string // dd
  weekday: string // Seg, Ter, ...
  count?: number
}

type WeeklyCalendarProps = {
  selectedDay: string // yyyy-MM-dd
  onSelectDay: (dateStr: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  countsByDay?: Record<string, number>
  className?: string
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function WeeklyCalendar({
  selectedDay,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  onToday,
  countsByDay = {},
  className = '',
}: WeeklyCalendarProps) {
  const sel = parseISO(selectedDay)
  const start = startOfWeek(sel, { weekStartsOn: 1 })
  const days: DayInfo[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    return {
      date: d,
      dateStr,
      label: format(d, 'dd'),
      weekday: WEEKDAYS[i],
      count: countsByDay[dateStr] ?? 0,
    }
  })

  return (
    <div className={`rounded-xl bg-white ring-1 ring-gray-200/70 shadow-sm p-3 sm:p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="font-semibold text-gray-800 text-sm sm:text-base">Semana de {format(start, 'dd/MM')}</div>
        <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
          <button className="af-btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 flex-1 sm:flex-none" onClick={onPrevWeek}>◀</button>
          <button className="af-btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 flex-1 sm:flex-none" onClick={onToday}>Hoje</button>
          <button className="af-btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 flex-1 sm:flex-none" onClick={onNextWeek}>▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d) => {
          const isSel = isSameDay(d.date, sel)
          const isTod = isSameDay(d.date, new Date())
          return (
            <button
              key={d.dateStr}
              onClick={() => onSelectDay(d.dateStr)}
              className={[
                'group rounded-lg p-1 sm:p-2 text-center border transition-all min-h-[60px] sm:min-h-[80px]',
                isSel ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100',
              ].join(' ')}
            >
              <div className="text-[9px] sm:text-[11px] text-gray-500 mb-1">{d.weekday}</div>
              <div className="text-sm sm:text-lg font-semibold text-gray-800">
                {d.label}
                {isTod && <span className="ml-1 inline-block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-indigo-500 align-middle" />}
              </div>
              <div className="mt-1 h-4 sm:h-5 flex items-center justify-center">
                {d.count && d.count > 0 ? (
                  <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-1 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-semibold">
                    <span className="inline-block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500" />
                    <span>{d.count}</span>
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[11px] text-gray-400">—</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
