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

export const Histogram = () => {
    const { user } = useAuth()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadHistory = async () => {
            if (user) {
                const data = await fetchReadingHistory(user.id)
                setHistory(data)
            }
            setLoading(false)
        }
        loadHistory()
    }, [user])

    // Process history data into a daily aggregated bar chart
    const chartData = useMemo(() => {
        const dayLogs = {}

        // Group pages read by date
        history.forEach(entry => {
            const dateStr = entry.read_at.substring(0, 10)
            if (!dayLogs[dateStr]) {
                dayLogs[dateStr] = new Set()
            }
            dayLogs[dateStr].add(entry.page_number)
        })

        // Generate the last 14 days for a clean bar chart view
        const today = new Date()
        const data = []
        for (let i = 13; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(today.getDate() - i)
            const dateStr = date.toISOString().substring(0, 10)

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
    }, [history])

    // Determine the current Khatm cycle (starts from the most recent Page 1)
    const currentCycle = useMemo(() => {
        if (!history || history.length === 0) return []

        let cycleStartIndex = history.findIndex(entry => entry.page_number === 1)

        if (cycleStartIndex === -1) {
            cycleStartIndex = history.length - 1
        }

        return history.slice(0, cycleStartIndex + 1)
    }, [history])

    // Calculate dynamic reading forecast
    const forecast = useMemo(() => {
        if (currentCycle.length === 0) return null

        // 2. Extrapolate metrics
        const startDate = new Date(currentCycle[currentCycle.length - 1].read_at)
        const today = new Date()

        // Calculate days elapsed (minimum 1 to avoid Infinity pace)
        const msPerDay = 1000 * 60 * 60 * 24
        const daysElapsed = Math.max(1, Math.ceil((today - startDate) / msPerDay))

        // Find unique pages read in this cycle to handle re-reading the same page cleanly
        const uniquePages = new Set(currentCycle.map(entry => entry.page_number))
        const pagesRead = uniquePages.size

        // Find furthest page reached
        const maxPage = Math.max(...Array.from(uniquePages))
        const pagesRemaining = 604 - maxPage

        if (pagesRemaining <= 0) return { status: 'completed' }

        // 3. Compute Pace & Completion Date
        const pace = pagesRead / daysElapsed // pages per day
        if (pace === 0) return null

        const daysRemaining = Math.ceil(pagesRemaining / pace)

        const completionDate = new Date()
        completionDate.setDate(today.getDate() + daysRemaining)

        return {
            status: 'active',
            daysRemaining,
            completionDate: completionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            pace: pace.toFixed(1)
        }
    }, [history])

    const totalJuzCompleted = useMemo(() => {
        const dayLogs = {}
        currentCycle.forEach(entry => {
            const dateStr = entry.read_at.substring(0, 10)
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

    if (!user) return null
    if (loading) return (
        <div className="w-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        </div>
    )

    return (
        <div className="w-full mt-10">
            <div className="mb-4 px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    {!forecast ? (
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 text-left">
                            Reading Consistency (Last 14 Days)
                        </h3>
                    ) : forecast.status === 'completed' ? (
                        <>
                            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 text-left">
                                🎉 Khatm Completed!
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Start reading again to track your next milestone.</p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 text-left">
                                Est. Completion: {forecast.completionDate}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {forecast.daysRemaining} days remaining at {forecast.pace} pages/day
                            </p>
                        </>
                    )}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1.5">
                    <div className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {currentCycle.length} Pages Logged
                    </div>
                    {totalJuzCompleted > 0 && (
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md">
                            {totalJuzCompleted} Juz Completed
                        </div>
                    )}
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
                                if (name === 'juzsCompleted' && value > 0) return [`${value} Juz${value > 1 ? 's' : ''}`, 'Completed']
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
