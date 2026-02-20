import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserProgress } from '../lib/db'

export const Home = () => {
    const { user } = useAuth()
    const [progress, setProgress] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadProgress = async () => {
            if (user) {
                const data = await getUserProgress(user.id)
                setProgress(data)
            } else {
                // If not logged in, default to 1:1 or local state
                setProgress({ surah_number: 1, ayah_number: 1 })
            }
            setLoading(false)
        }
        loadProgress()
    }, [user])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Welcome to <span className="text-emerald-500">Quran Tracker</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                    Track your daily reading progress and seamlessly continue where you left off.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 w-full max-w-md transition-all">
                <h2 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">
                    Your Progress
                </h2>

                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                        <span className="text-slate-500 dark:text-slate-400">Current Surah</span>
                        <span className="font-medium text-lg text-slate-900 dark:text-white">
                            {progress?.surah_number}
                        </span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                        <span className="text-slate-500 dark:text-slate-400">Current Ayah</span>
                        <span className="font-medium text-lg text-slate-900 dark:text-white">
                            {progress?.ayah_number}
                        </span>
                    </div>
                </div>

                <Link
                    to={`/read?surah=${progress?.surah_number}&ayah=${progress?.ayah_number}`}
                    className="inline-flex w-full justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50 hover:-translate-y-0.5"
                >
                    Continue Reading
                </Link>
            </div>

            {!user && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sign in to save your progress across devices.
                </p>
            )}
        </div>
    )
}
