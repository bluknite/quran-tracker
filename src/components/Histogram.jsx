import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchReadingHistory } from '../lib/db'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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
        const dayCounts = {}

        // Populate historical read counts
        history.forEach(entry => {
            const dateStr = entry.read_at.substring(0, 10)
            if (!dayCounts[dateStr]) {
                dayCounts[dateStr] = 0
            }
            dayCounts[dateStr] += 1
        })

        // Generate the last 14 days for a clean bar chart view
        const today = new Date()
        const data = []
        for (let i = 13; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(today.getDate() - i)
            const dateStr = date.toISOString().substring(0, 10)

            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                pages: dayCounts[dateStr] || 0
            })
        }

        return data
    }, [history])

    if (!user) return null
    if (loading) return (
        <div className="w-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        </div>
    )

    return (
        <div className="w-full mt-10">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 px-2 text-left flex justify-between items-center">
                <span>Reading Consistency (Last 14 Days)</span>
                <span className="text-xs">{history.length} Pages Logged</span>
            </h3>

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
                            formatter={(value) => [`${value} Pages`, 'Read']}
                        />
                        <Bar
                            dataKey="pages"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
