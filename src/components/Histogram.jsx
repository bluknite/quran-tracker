import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchReadingHistory } from '../lib/db'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import juzEndPages from '../data/juz-end-pages.json'

// Custom shape renderer for the Juz Completion bubbles
// This is drawn as a transparent overlay bar over normal bars
const CustomJuzBubble = (props) => {
    const { x, y, width, index, payload } = props;
    const { juzsCompleted } = payload;

    if (!juzsCompleted || juzsCompleted === 0) return null;

    // We want the bubbles to float right above the bar. 
    // Recharts passes `y` as the top of the green bar.
    const bubbleWidth = 16;
    const bubbleHeight = 8;
    const spacing = 4;

    // Center the bubble horizontally over the bar
    const cx = x + (width / 2);

    // Generate an array of bubbles for multiple completions in a single day
    const bubbles = [];
    for (let i = 0; i < juzsCompleted; i++) {
        // Stack them upwards
        const rectY = y - spacing - bubbleHeight - (i * (bubbleHeight + spacing));
        const rectX = cx - (bubbleWidth / 2);

        bubbles.push(
            <g key={`bubble-${index}-${i}`}>
                <rect x={rectX} y={rectY} width={bubbleWidth} height={bubbleHeight} rx={4} fill="#fbbf24" />
            </g>
        );
    }

    return <g>{bubbles}</g>;
};

export const Histogram = ({ khatm, refreshTrigger = 0 }) => {
    const { user } = useAuth()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadHistory = async () => {
            if (user && khatm?.id) {
                const data = await fetchReadingHistory(khatm.id)
                setHistory(data)
            }
            setLoading(false)
        }
        loadHistory()
    }, [user, khatm?.id, refreshTrigger])

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (dateInput) => {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
        // Adjust for timezone offset to prevent late-night reads from bleeding
        const offsetMs = d.getTimezoneOffset() * 60 * 1000;
        const localDate = new Date(d.getTime() - offsetMs);
        return localDate.toISOString().substring(0, 10);
    }

    // Process history data into a daily aggregated bar chart
    const chartData = useMemo(() => {
        const dayLogs = {}

        // Group pages read by date using local time
        history.forEach(entry => {
            const dateStr = getLocalDateString(entry.read_at)
            if (!dayLogs[dateStr]) {
                dayLogs[dateStr] = new Set()
            }
            dayLogs[dateStr].add(entry.page_number)
        })

        // Generate the last 14 days for a clean bar chart view
        // 1. If completed, freeze the chart relative to the completion date
        // 2. If active but history exists, anchor it to the most recent read date OR today, whichever is more recent contextually.
        //    Actually, we want to show the last read date as the very end of the chart so it never looks blank.
        // 3. Fallback to today.

        let anchorDate = new Date()

        if (khatm?.completed_at) {
            anchorDate = new Date(khatm.completed_at)
        } else if (history && history.length > 0) {
            // Find the most recent date someone actually read a page in this Khatm.
            // History is already sorted descending by read_at from fetchReadingHistory.
            const mostRecentLogDate = new Date(history[0].read_at)

            // If the latest read is more than 14 days ago, pull the anchor back to that day.
            // That way they always see at least the last time they read.
            // If they read recently, we still anchor to 'today' so the chart aligns to current time natively.
            const ms14days = 14 * 24 * 60 * 60 * 1000
            if (new Date() - mostRecentLogDate > ms14days) {
                anchorDate = mostRecentLogDate
            }
        }

        const data = []
        for (let i = 13; i >= 0; i--) {
            const date = new Date(anchorDate)
            date.setDate(anchorDate.getDate() - i)
            const dateStr = getLocalDateString(date)

            const pagesReadToday = dayLogs[dateStr] ? dayLogs[dateStr].size : 0

            // Calculate how many Juz boundaries were crossed today
            let juzsCompleted = 0
            if (dayLogs[dateStr]) {
                dayLogs[dateStr].forEach(page => {
                    if (juzEndPages.includes(page)) {
                        juzsCompleted += 1
                    }
                })
            }

            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                pages: pagesReadToday,
                juzsCompleted: juzsCompleted
            })
        }

        return data
    }, [history, khatm?.completed_at])

    // Dynamic reading forecast
    const forecast = useMemo(() => {
        // Only run forecaster for active khatms
        if (!khatm || khatm.status === 'completed') return null
        if (!history || history.length === 0) return null

        // 1. Extrapolate metrics
        let startDateStr = khatm.created_at
        if (history && history.length > 0) {
            const oldestLogDate = history[history.length - 1].read_at
            if (new Date(oldestLogDate) < new Date(startDateStr)) {
                startDateStr = oldestLogDate
            }
        }
        const startDate = new Date(startDateStr)
        const today = new Date()

        // Calculate days elapsed using local midnight boundaries to prevent time-of-day pace skew
        const startLocal = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const msPerDay = 1000 * 60 * 60 * 24
        const daysElapsed = Math.max(1, Math.floor((todayLocal - startLocal) / msPerDay) + 1)

        // Find unique pages read in this cycle to handle re-reading the same page cleanly
        const uniquePages = new Set(history.map(entry => entry.page_number))
        const pagesRead = uniquePages.size

        // Find furthest page reached
        const maxPage = Math.max(...Array.from(uniquePages))
        const pagesRemaining = 604 - maxPage

        if (pagesRemaining <= 0) return { status: 'completed' }

        // 3. Compute Standard Pace & Completion Date
        const pace = daysElapsed > 0 ? pagesRead / daysElapsed : 0 // pages per day
        let daysRemaining = pace > 0 ? Math.ceil(pagesRemaining / pace) : 0
        let completionDate = null
        if (pace > 0) {
            completionDate = new Date()
            completionDate.setDate(today.getDate() + daysRemaining)
        }

        // 4. Compute Experimental Paces
        // Map history to local days and count pages read per day
        const dayCounts = {}
        history.forEach(entry => {
            const date = new Date(entry.read_at)
            const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
            // Assuming each entry in history is a unique page read on that day
            dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1
        })

        const activeDaysArray = Object.values(dayCounts).sort((a, b) => a - b)
        const uniqueActiveDays = activeDaysArray.length

        // --- Average Active Pace ---
        const experimentalPace = uniqueActiveDays > 0 ? pagesRead / uniqueActiveDays : 0
        let experimentalDaysRemaining = experimentalPace > 0 ? Math.ceil(pagesRemaining / experimentalPace) : 0
        let experimentalCompletionDate = null
        if (experimentalPace > 0) {
            experimentalCompletionDate = new Date()
            experimentalCompletionDate.setDate(today.getDate() + experimentalDaysRemaining)
        }

        // --- Median Active Pace ---
        let medianActivePace = 0
        if (uniqueActiveDays > 0) {
            const mid = Math.floor(uniqueActiveDays / 2)
            medianActivePace = uniqueActiveDays % 2 !== 0 ? activeDaysArray[mid] : (activeDaysArray[mid - 1] + activeDaysArray[mid]) / 2
        }

        let medianActiveDaysRemaining = medianActivePace > 0 ? Math.ceil(pagesRemaining / medianActivePace) : 0
        let medianActiveCompletionDate = null
        if (medianActivePace > 0) {
            medianActiveCompletionDate = new Date()
            medianActiveCompletionDate.setDate(today.getDate() + medianActiveDaysRemaining)
        }

        // --- Median All Pace ---
        const allDaysArray = [...activeDaysArray]
        const zeroDaysCount = Math.max(0, daysElapsed - uniqueActiveDays)
        for (let i = 0; i < zeroDaysCount; i++) {
            allDaysArray.push(0)
        }
        allDaysArray.sort((a, b) => a - b)

        let medianAllPace = 0
        if (allDaysArray.length > 0) {
            const mid = Math.floor(allDaysArray.length / 2)
            medianAllPace = allDaysArray.length % 2 !== 0 ? allDaysArray[mid] : (allDaysArray[mid - 1] + allDaysArray[mid]) / 2
        }

        let medianAllDaysRemaining = medianAllPace > 0 ? Math.ceil(pagesRemaining / medianAllPace) : 0
        let medianAllCompletionDate = null
        if (medianAllPace > 0) {
            medianAllCompletionDate = new Date()
            medianAllCompletionDate.setDate(today.getDate() + medianAllDaysRemaining)
        }

        return {
            status: 'active',
            daysRemaining,
            completionDate: completionDate ? completionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
            pace: pace.toFixed(1),
            // Average Active
            experimentalPace: experimentalPace.toFixed(1),
            experimentalDaysRemaining,
            experimentalCompletionDate: experimentalCompletionDate ? experimentalCompletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
            // Median Active
            medianActivePace: medianActivePace.toFixed(1),
            medianActiveDaysRemaining,
            medianActiveCompletionDate: medianActiveCompletionDate ? medianActiveCompletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
            // Median All
            medianAllPace: medianAllPace.toFixed(1),
            medianAllDaysRemaining,
            medianAllCompletionDate: medianAllCompletionDate ? medianAllCompletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
        }
    }, [history, khatm])

    const totalJuzCompleted = useMemo(() => {
        const dayLogs = {}
        history.forEach(entry => {
            const dateStr = getLocalDateString(entry.read_at)
            if (!dayLogs[dateStr]) {
                dayLogs[dateStr] = new Set()
            }
            dayLogs[dateStr].add(entry.page_number)
        })

        let count = 0
        Object.values(dayLogs).forEach(pages => {
            pages.forEach(page => {
                if (juzEndPages.includes(page)) count++
            })
        })
        return count
    }, [history])

    if (!user || !khatm) return null
    if (loading) return (
        <div className="w-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        </div>
    )

    return (
        <div className="w-full mt-10">
            <div className="mb-4 px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    {khatm.status === 'completed' ? (
                        <>
                            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 text-left">
                                Final 14 Days Reading Activity
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Completed {totalJuzCompleted} Juz during this cycle.
                            </p>
                        </>
                    ) : !forecast ? (
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 text-left">
                            Reading Consistency (Last 14 Days)
                        </h3>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 text-left">
                                    Est. Completion: {forecast.completionDate}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {forecast.daysRemaining} days remaining at {forecast.pace} pages/day
                                </p>
                            </div>

                            <div className="flex flex-col border-l-2 border-rose-500/30 pl-3">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[9px] font-bold tracking-wider text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                        EXP
                                    </span>
                                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 text-left leading-none">
                                        Avg. Active Pace: {forecast.experimentalCompletionDate}
                                    </h4>
                                </div>
                                <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80">
                                    {forecast.experimentalDaysRemaining} days remaining at {forecast.experimentalPace} pages/day
                                </p>
                            </div>

                            <div className="flex flex-col border-l-2 border-rose-500/30 pl-3">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[9px] font-bold tracking-wider text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                        EXP
                                    </span>
                                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 text-left leading-none">
                                        Median Active Pace: {forecast.medianActiveCompletionDate}
                                    </h4>
                                </div>
                                <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80">
                                    {forecast.medianActiveDaysRemaining} days remaining at {forecast.medianActivePace} pages/day
                                </p>
                            </div>

                            <div className="flex flex-col border-l-2 border-rose-500/30 pl-3">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[9px] font-bold tracking-wider text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                        EXP
                                    </span>
                                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 text-left leading-none">
                                        Median Pace (All Days): {forecast.medianAllCompletionDate}
                                    </h4>
                                </div>
                                <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80">
                                    {forecast.medianAllDaysRemaining} days remaining at {forecast.medianAllPace} pages/day
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1.5">
                    {totalJuzCompleted > 0 && (
                        <div className="text-xs font-medium text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10 px-2 flex items-center gap-1.5 py-1 rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></div>
                            {totalJuzCompleted} Juz Completed
                        </div>
                    )}
                    <div className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {history.length} Pages Logged
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: '#ffffff',
                                color: '#0f172a'
                            }}
                            formatter={(value, name) => {
                                if (name === 'pages') return [`${value} Pages`, 'Read']
                                if (name === 'juzsCompleted' && value > 0) return [`${value} Juz`, 'Completed']
                                return null
                            }}
                        />
                        {/* Main Reading Bar */}
                        <Bar
                            dataKey="pages"
                            stackId="a"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                        {/* overlay invisible bar just to render customized SVG shape on top */}
                        <Bar
                            dataKey="juzsCompleted"
                            stackId="a"
                            fill="#fbbf24"
                            shape={<CustomJuzBubble />}
                            isAnimationActive={false}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
