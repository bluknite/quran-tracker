import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateUserProgress } from '../lib/db'
import pageMapping from '../data/page-verse-mapping.json'

export const Reader = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const initialSurah = parseInt(searchParams.get('surah')) || 1
    const initialAyah = parseInt(searchParams.get('ayah')) || 1

    // Find the page number that contains this surah/ayah
    const findPageBySurahAyah = useCallback((surah, ayah) => {
        for (const [pageNumStr, data] of Object.entries(pageMapping)) {
            const pageNum = parseInt(pageNumStr)
            // Check if the requested surah/ayah falls within the page's range
            if (
                (surah > data.start.surah || (surah === data.start.surah && ayah >= data.start.ayah)) &&
                (surah < data.end.surah || (surah === data.end.surah && ayah <= data.end.ayah))
            ) {
                return pageNum
            }
        }
        return 1 // Default to page 1 if not found
    }, [])

    const [currentPage, setCurrentPage] = useState(() => findPageBySurahAyah(initialSurah, initialAyah))
    const [isSaving, setIsSaving] = useState(false)

    // Current page data
    const currentMapping = useMemo(() => pageMapping[currentPage], [currentPage])

    // Handlers for navigation
    const goToNextPage = () => {
        if (currentPage < 604) setCurrentPage(p => p + 1)
    }

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1)
    }

    // Save Progress manually or automatically
    const saveProgress = async () => {
        if (!user) return
        setIsSaving(true)
        // We save the START of the current page as the progress point
        await updateUserProgress(user.id, currentMapping.start.surah, currentMapping.start.ayah)

        // Update URL to match new saved state
        navigate(`/read?surah=${currentMapping.start.surah}&ayah=${currentMapping.start.ayah}`, { replace: true })

        setTimeout(() => setIsSaving(false), 1000)
    }

    // Format image URL (e.g. page_001.jpg, page_042.jpg, page_604.jpg)
    // Use import.meta.env.BASE_URL for GitHub Pages compatibility
    const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '')
    const imageUrl = `${basePath}/quran-pages/page_${String(currentPage).padStart(3, '0')}.jpg`

    return (
        <div className="flex flex-col h-full w-full items-center relative gap-4">

            {/* Controls Header */}
            <div className="w-full flex justify-between items-center bg-white dark:bg-slate-900 p-4 px-4 sm:px-8 shadow-sm border-b border-slate-200 dark:border-slate-800">
                <div className="flex gap-2">
                    <button
                        onClick={goToNextPage}
                        disabled={currentPage === 604}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        ← Next Page
                    </button>

                    <button
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        Prev Page →
                    </button>
                </div>

                <div className="text-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Page {currentPage}</span>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Surah {currentMapping?.start.surah}:{currentMapping?.start.ayah} - {currentMapping?.end.surah}:{currentMapping?.end.ayah}
                    </div>
                </div>

                <button
                    onClick={saveProgress}
                    disabled={isSaving || !user}
                    className={`px-4 py-2 rounded-lg font-medium transition ${!user
                        ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                        : isSaving
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                    title={!user ? "Sign in to save progress" : "Save current page"}
                >
                    {isSaving ? 'Saved!' : 'Save Progress'}
                </button>
            </div>

            {/* Reader Container */}
            <div className="flex-1 w-full overflow-y-auto bg-slate-50 dark:bg-slate-950 flex justify-center custom-scrollbar">
                <img
                    src={imageUrl}
                    alt={`Quran Page ${currentPage}`}
                    className="max-h-full w-full max-w-5xl object-contain drop-shadow-md"
                    loading="lazy"
                />
            </div>

        </div>
    )
}
