import { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getKhatm, updateKhatmLabel, logManualPageRangeRead, updateKhatmProgress, fetchReadingHistory } from '../lib/db'
import { Histogram } from '../components/Histogram'
import quranMeta from '../data/quran-meta.json'
import pageMapping from '../data/page-verse-mapping.json'

// Helper to get Surah name dynamically, looping every 114
const getKhatmName = (khatmNumber) => {
    // 1-based index mapping. 115 becomes 1 again.
    const surahIndex = ((khatmNumber - 1) % 114) + 1
    // The meta JSON is usually indexed so surahs[0] is Al-Fatihah
    const surah = quranMeta.data.surahs.references.find(s => s.number === surahIndex)
    return surah ? surah.englishName : `Khatm ${khatmNumber}`
}

export const KhatmProgress = () => {
    const { id } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [khatm, setKhatm] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isEditingLabel, setIsEditingLabel] = useState(false)
    const [editLabelValue, setEditLabelValue] = useState('')
    const [savingLabel, setSavingLabel] = useState(false)

    // Manual Log State
    const [showManualEntry, setShowManualEntry] = useState(false)
    const [manualStart, setManualStart] = useState('')
    const [manualEnd, setManualEnd] = useState('')
    const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0])
    const [manualLogLoading, setManualLogLoading] = useState(false)
    const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)

    useEffect(() => {
        const loadKhatm = async () => {
            if (user && id) {
                const data = await getKhatm(id)
                // Security check - if Khatm doesn't exist or isn't theirs, boot them.
                if (!data || data.user_id !== user.id) {
                    navigate('/')
                    return
                }
                setKhatm(data)
                setEditLabelValue(data.user_label || '')
            }
            setLoading(false)
        }
        loadKhatm()
    }, [user, id, navigate])

    const handleSaveLabel = async () => {
        setSavingLabel(true)
        try {
            const trimmedLabel = editLabelValue.trim() || null
            await updateKhatmLabel(khatm.id, trimmedLabel)
            setKhatm({ ...khatm, user_label: trimmedLabel })
            setIsEditingLabel(false)
        } catch (error) {
            console.error(error)
        } finally {
            setSavingLabel(false)
        }
    }

    const handleManualSubmit = async (e) => {
        e.preventDefault()
        setManualLogLoading(true)
        try {
            const start = parseInt(manualStart)
            const end = parseInt(manualEnd)
            if (start > 0 && end > 0 && start <= 604 && end <= 604) {
                // Parse date into full ISO format for Supabase
                const [year, month, day] = manualDate.split('-')
                const isoDate = new Date(year, month - 1, day, 12, 0, 0).toISOString()

                await logManualPageRangeRead(user.id, khatm.id, start, end, isoDate)

                // Fetch the updated history timeline to find the true chronologically latest page they have read
                const historyData = await fetchReadingHistory(khatm.id)
                if (historyData && historyData.length > 0) {
                    // Because fetchReadingHistory orders by read_at DESC, the 0-index is the latest physical date (and highest page on that date)
                    const latestPage = historyData[0].page_number
                    const nextPage = Math.min(latestPage + 1, 604)
                    const nextMapping = pageMapping[nextPage]

                    if (nextMapping) {
                        await updateKhatmProgress(khatm.id, nextMapping.start.surah, nextMapping.start.ayah)
                        // Trigger a local UI re-render so "Current Progress" updates immediately
                        setKhatm(prev => ({
                            ...prev,
                            surah_number: nextMapping.start.surah,
                            ayah_number: nextMapping.start.ayah
                        }))
                    }
                }

                setHistoryRefreshTrigger(prev => prev + 1)

                // Keep accordion open but reset inputs for rapid entry
                setManualStart('')
                setManualEnd('')
            }
        } catch (err) {
            console.error("Failed to log manually", err)
        } finally {
            setManualLogLoading(false)
        }
    }

    const currentJuz = useMemo(() => {
        if (!khatm) return null

        const { surah_number, ayah_number } = khatm
        const juzRefs = quranMeta.data.juzs.references

        // Find the last Juz whose starting verse is before or exactly at our current verse
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
    }, [khatm])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3"></div>
                Loading Progress...
            </div>
        )
    }

    if (!khatm) return null // Caught by the redirect hook, just rendering fallback

    const isCompleted = khatm.status === 'completed'
    const surahName = getKhatmName(khatm.khatm_number)

    return (
        <div className="flex flex-col items-center justify-start h-full max-w-2xl mx-auto space-y-8 pb-16 px-4 sm:px-0">
            {/* Header Back Button */}
            <div className="w-full pt-6 flex justify-start">
                <Link to="/" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center">
                    ← Back to Dashboard
                </Link>
            </div>

            {/* Title Section */}
            <div className="text-center w-full">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 mb-2">
                    <span className="text-xl sm:text-2xl font-normal text-slate-400 dark:text-slate-500">{khatm.khatm_number}</span>
                    <span>{surahName}</span>
                </h1>
                {isEditingLabel ? (
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <input
                            type="text"
                            value={editLabelValue}
                            onChange={(e) => setEditLabelValue(e.target.value)}
                            placeholder="Add a label..."
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveLabel()
                                if (e.key === 'Escape') {
                                    setIsEditingLabel(false)
                                    setEditLabelValue(khatm.user_label || '')
                                }
                            }}
                        />
                        <button
                            onClick={handleSaveLabel}
                            disabled={savingLabel}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Save label"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                            onClick={() => {
                                setIsEditingLabel(false)
                                setEditLabelValue(khatm.user_label || '')
                            }}
                            disabled={savingLabel}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                            title="Cancel"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 mt-2 group relative">
                        <p className={`text-lg transition-colors ${khatm.user_label ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                            {khatm.user_label || 'Add a label...'}
                        </p>
                        <button
                            onClick={() => setIsEditingLabel(true)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 rounded-lg translate-y-[2px]"
                            title="Edit label"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                    </div>
                )}
            </div>

            {isCompleted && (
                <div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-6 text-center shadow-lg shadow-amber-500/5 dark:shadow-none animate-fade-in flex flex-col items-center gap-2">
                    <span className="text-4xl mb-2 flex items-center justify-center">🎉</span>
                    <h2 className="text-xl font-bold text-amber-800 dark:text-amber-400">Khatm Completed!</h2>
                    <p className="text-sm text-amber-700/80 dark:text-amber-300/80 font-medium">
                        Finished on {new Date(khatm.completed_at).toLocaleDateString()}
                    </p>
                </div>
            )}

            {!isCompleted && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 w-full transition-all text-center">
                    <h2 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">
                        Current Progress
                    </h2>

                    <div className="flex flex-col gap-4 mb-8">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                            <span className="text-slate-500 dark:text-slate-400">Current Juz</span>
                            <span className="font-medium text-lg text-slate-900 dark:text-white">
                                {currentJuz}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                            <span className="text-slate-500 dark:text-slate-400">Current Surah</span>
                            <span className="font-medium text-lg text-slate-900 dark:text-white">
                                {khatm.surah_number}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                            <span className="text-slate-500 dark:text-slate-400">Current Ayah</span>
                            <span className="font-medium text-lg text-slate-900 dark:text-white">
                                {khatm.ayah_number}
                            </span>
                        </div>
                    </div>

                    <Link
                        to={`/read?khatmId=${khatm.id}&surah=${khatm.surah_number}&ayah=${khatm.ayah_number}`}
                        className="inline-flex w-full justify-center items-center px-6 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50 hover:-translate-y-0.5"
                    >
                        Continue Reading
                    </Link>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                        <button
                            onClick={() => setShowManualEntry(!showManualEntry)}
                            className="text-sm font-medium text-slate-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors flex items-center justify-center gap-1 w-full"
                        >
                            <svg className={`w-4 h-4 transition-transform ${showManualEntry ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            Log Previous Reading
                        </button>

                        {showManualEntry && (
                            <form onSubmit={handleManualSubmit} className="mt-4 flex flex-col gap-3 text-left animate-fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Page</label>
                                        <input type="number" min="1" max="604" required value={manualStart} onChange={e => setManualStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="1" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Page</label>
                                        <input type="number" min="1" max="604" required value={manualEnd} onChange={e => setManualEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="10" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date Read</label>
                                    <input type="date" required value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <button type="submit" disabled={manualLogLoading} className="w-full py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 rounded-lg text-sm font-medium transition-colors mt-1 disabled:opacity-50">
                                    {manualLogLoading ? 'Saving...' : 'Save Manual Entry'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <div className="w-full">
                {/* Dynamically scope the histogram payload directly to this Khatm ID! */}
                {/* Notice we pass the khatm param so History fetches scoped data */}
                <Histogram khatm={khatm} refreshTrigger={historyRefreshTrigger} />
            </div>

        </div>
    )
}
