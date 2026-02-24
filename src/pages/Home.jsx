import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchKhatms, createKhatm } from '../lib/db'
import quranMeta from '../data/quran-meta.json'

// Helper to get Surah name dynamically, looping every 114
const getKhatmName = (khatmNumber) => {
    // 1-based index mapping. 115 becomes 1 again.
    const surahIndex = ((khatmNumber - 1) % 114) + 1
    // The meta JSON is usually indexed so surahs[0] is Al-Fatihah
    const surah = quranMeta.data.surahs.references.find(s => s.number === surahIndex)
    return surah ? surah.englishName : `Khatm ${khatmNumber}`
}

// Helper to determine Juz from current Surah and Ayah
const getJuzNumber = (surah_number, ayah_number) => {
    const juzRefs = quranMeta.data.juzs.references
    let juz = 1
    for (let i = 0; i < juzRefs.length; i++) {
        const ref = juzRefs[i]
        if (
            surah_number > ref.surah ||
            (surah_number === ref.surah && ayah_number >= ref.ayah)
        ) {
            juz = i + 1
        } else {
            break
        }
    }
    return juz
}

export const Home = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [activeKhatms, setActiveKhatms] = useState([])
    const [completedKhatms, setCompletedKhatms] = useState([])
    const [loading, setLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [newLabel, setNewLabel] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)

    useEffect(() => {
        const loadKhatms = async () => {
            if (user) {
                const data = await fetchKhatms(user.id)
                setActiveKhatms(data.filter(k => k.status === 'active'))
                setCompletedKhatms(data.filter(k => k.status === 'completed'))
            }
            setLoading(false)
        }
        loadKhatms()
    }, [user])

    const handleCreateKhatm = async (e) => {
        e.preventDefault()
        if (!user) return
        setIsCreating(true)
        try {
            const newKhatm = await createKhatm(user.id, newLabel.trim() || null)
            navigate(`/khatm/${newKhatm.id}`)
        } catch (err) {
            console.error(err)
            setIsCreating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3"></div>
                Loading your Khatms...
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-8">
                <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Welcome to <span className="text-emerald-500">Quran Tracker</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Sign in to track your reading progress across multiple devices.
                    </p>
                </div>
            </div>
        )
    }

    // Helper to render a Khatm card
    const renderKhatmCard = (khatm) => {
        const surahName = getKhatmName(khatm.khatm_number)
        return (
            <Link
                key={khatm.id}
                to={`/khatm/${khatm.id}`}
                className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 relative overflow-hidden group"
            >
                {/* Visual Flair */}
                <div className={`absolute top-0 left-0 w-1 h-full ${khatm.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>

                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                        <span className="text-sm font-normal text-slate-400 dark:text-slate-500">{khatm.khatm_number}</span>
                        <span>{surahName}</span>
                    </h3>
                    {khatm.status === 'active' ? (
                        <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-md font-medium border border-emerald-200 dark:border-emerald-500/20">Active</span>
                    ) : (
                        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-md font-medium border border-slate-200 dark:border-slate-700">Completed</span>
                    )}
                </div>

                {khatm.user_label && (
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                        ({khatm.user_label})
                    </p>
                )}
                {!khatm.user_label && <div className="mb-4"></div>}

                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    {khatm.status === 'active' ? (
                        <>
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Current Progress</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">Surah {khatm.surah_number}:{khatm.ayah_number}</span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Juz {getJuzNumber(khatm.surah_number, khatm.ayah_number)}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Last Read</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(khatm.last_read_at || khatm.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="w-full text-xs text-slate-400 flex justify-between">
                            <span>Started: {new Date(khatm.created_at).toLocaleDateString()}</span>
                            <span>Finished: {new Date(khatm.completed_at).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </Link>
        )
    }

    return (
        <div className="flex flex-col items-center h-full max-w-4xl mx-auto space-y-12 pb-16 px-4 sm:px-0">
            {/* Header Area */}
            <div className="text-center space-y-4 pt-8 w-full max-w-2xl">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    <span className="text-emerald-500">Khatm</span> Tracker
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                    Select a reading plan below or create a new one to begin your journey.
                </p>
            </div>

            {/* Active Khatms Grid */}
            {activeKhatms.length > 0 && (
                <div className="w-full mb-8">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center font-bold">
                            {activeKhatms.length}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Active Khatms</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeKhatms.map(renderKhatmCard)}
                    </div>
                </div>
            )}

            {/* Create New Khatm Section */}
            <div className="w-full flex justify-center">
                {!showCreateForm ? (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-8 py-3.5 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-500 font-medium rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Start New Khatm
                    </button>
                ) : (
                    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-6 md:p-8 relative overflow-hidden animate-fade-in">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Start a New Khatm</h2>
                            <button
                                onClick={() => {
                                    setShowCreateForm(false)
                                    setNewLabel('')
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateKhatm} className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="Optional label (e.g. Ramadan 2025, Memorization)"
                                className="flex-1 px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                            />
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow-sm shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto flex justify-center items-center"
                            >
                                {isCreating ? 'Creating...' : 'Start Reading →'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Completed Khatms Grid */}
            {completedKhatms.length > 0 && (
                <div className="w-full pt-8 border-t border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold mb-6 text-slate-400 dark:text-slate-500 tracking-tight px-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Completed Khatms
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                        {completedKhatms.map(renderKhatmCard)}
                    </div>
                </div>
            )}
        </div>
    )
}
