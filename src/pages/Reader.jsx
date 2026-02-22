import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
        <div className="flex flex-col h-full w-full bg-[#fffcdd] dark:bg-[#fffcdd] overflow-hidden">

            {/* Top Display Header Portaled to Navbar */}
            {document.getElementById('navbar-center-portal') && createPortal(
                <div className="text-center pointer-events-auto mt-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">Page {currentPage}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                        Surah {currentMapping?.start.surah}:{currentMapping?.start.ayah} - {currentMapping?.end.surah}:{currentMapping?.end.ayah}
                    </div>
                </div>,
                document.getElementById('navbar-center-portal')
            )}

            {/* Reader Container (Scrollable Region) */}
            <div className="flex-1 w-full overflow-y-auto flex justify-center custom-scrollbar relative">
                <img
                    src={imageUrl}
                    alt={`Quran Page ${currentPage}`}
                    className="max-h-full w-full max-w-5xl object-contain pt-4 pb-32"
                    loading="lazy"
                />
            </div>

            {/* Bottom Utility Bar (Sticky) */}
            <div className="fixed bottom-0 left-0 right-0 w-full flex justify-between items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-4 px-4 sm:px-8 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] z-50 border-t border-slate-200/50 dark:border-slate-800/50">
                <button
                    onClick={goToNextPage}
                    disabled={currentPage === 604}
                    className="px-4 py-3 bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0 font-medium"
                >
                    ← Next
                </button>

                <button
                    onClick={saveProgress}
                    disabled={isSaving || !user}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${!user
                        ? 'bg-slate-200/90 text-slate-400 dark:bg-slate-800/90 dark:text-slate-600 cursor-not-allowed'
                        : isSaving
                            ? 'bg-emerald-100/90 text-emerald-600 dark:bg-emerald-900/50'
                            : 'bg-emerald-500/90 text-white hover:bg-emerald-600 shadow-sm'
                        }`}
                    title={!user ? "Sign in to save progress" : "Save current page"}
                >
                    {isSaving ? 'Saved!' : 'Save Progress'}
                </button>

                <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="px-4 py-3 bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0 font-medium"
                >
                    Prev →
                </button>
            </div>

        </div>
    )
}
