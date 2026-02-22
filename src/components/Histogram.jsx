import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchReadingHistory } from '../lib/db'

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

    // Process history data into a daily heatmap (pages read per day)
    const heatmapData = useMemo(() => {
        const dayCounts = {}

        // Populate historical read counts
        history.forEach(entry => {
            // Extract just the YYYY-MM-DD from the timestamp
            const dateStr = entry.read_at.substring(0, 10)
            if (!dayCounts[dateStr]) {
                dayCounts[dateStr] = 0
            }
            dayCounts[dateStr] += 1
        })

        // Generate the last 90 days grid
        const today = new Date()
        const grid = []
        for (let i = 89; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(today.getDate() - i)
            const dateStr = date.toISOString().substring(0, 10)

            grid.push({
                date: dateStr,
                count: dayCounts[dateStr] || 0
            })
        }

        return grid
    }, [history])

    if (!user) return null
    if (loading) return (
        <div className="w-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        </div>
    )

    // Tailwind dynamic color intensity based on read count
    const getColorClass = (count) => {
        if (count === 0) return 'bg-slate-100 dark:bg-slate-800'
        if (count <= 2) return 'bg-emerald-200 dark:bg-emerald-900/40'
        if (count <= 5) return 'bg-emerald-300 dark:bg-emerald-800/60'
        if (count <= 10) return 'bg-emerald-400 dark:bg-emerald-600/80'
        return 'bg-emerald-500 dark:bg-emerald-500'
    }

    return (
        <div className="w-full mt-10">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 text-left flex justify-between items-center">
                <span>Reading Consistency</span>
                <span className="text-xs">{history.length} Pages Logged</span>
            </h3>

            <div className="flex justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                    {/* CSS Grid for the Histogram - visually grouped by columns like GitHub */}
                    <div
                        className="grid gap-[3px]"
                        style={{
                            gridTemplateColumns: `repeat(${Math.ceil(heatmapData.length / 7)}, minmax(0, 1fr))`,
                            gridAutoRows: '1fr',
                            gridTemplateRows: 'repeat(7, 1fr)',
                            gridAutoFlow: 'column',
                            height: '100px',
                            minWidth: '500px'
                        }}
                    >
                        {heatmapData.map((day, idx) => (
                            <div
                                key={idx}
                                title={`${day.date}: ${day.count} page${day.count !== 1 ? 's' : ''}`}
                                className={`rounded-sm transition-colors hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-500 ${getColorClass(day.count)}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" title="0 pages"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/40" title="1-2 pages"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-800/60" title="3-5 pages"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600/80" title="6-10 pages"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500" title="11+ pages"></div>
                </div>
                <span>More</span>
            </div>
        </div>
    )
}
