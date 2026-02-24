import { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getKhatm } from '../lib/db'
import { Histogram } from '../components/Histogram'
import quranMeta from '../data/quran-meta.json'

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
            }
            setLoading(false)
        }
        loadKhatm()
    }, [user, id, navigate])

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
                {khatm.user_label && (
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        {khatm.user_label}
                    </p>
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
                </div>
            )}

            <div className="w-full">
                {/* Dynamically scope the histogram payload directly to this Khatm ID! */}
                {/* Notice we pass the khatm param so History fetches scoped data */}
                <Histogram khatm={khatm} />
            </div>

        </div>
    )
}
