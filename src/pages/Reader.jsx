import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateKhatmProgress, logPageRangeRead, finishKhatm, fetchReadingHistory, undoHighestReadPage } from '../lib/db'
import pageMapping from '../data/page-verse-mapping.json'

export const Reader = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const khatmId = searchParams.get('khatmId')
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
    const [isUndoing, setIsUndoing] = useState(false)
    const [highestPageRead, setHighestPageRead] = useState(null)
    const lastSavedPageRef = useRef(currentPage)

    // Load highest page read to conditionally determine if we are at the edge
    useEffect(() => {
        if (!khatmId || !user) return

        let isMounted = true
        fetchReadingHistory(khatmId).then(history => {
            if (!isMounted) return
            if (history && history.length > 0) {
                setHighestPageRead(Math.max(...history.map(h => h.page_number)))
            } else {
                setHighestPageRead(null)
            }
        })
        return () => { isMounted = false }
    }, [khatmId, user])

    // Scroll to top whenever the page changes
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [currentPage])

    const [isSwipeEnabled, setIsSwipeEnabled] = useState(() => {
        return localStorage.getItem('quran_swipe_enabled') === 'true'
    })

    const [isTouchDevice, setIsTouchDevice] = useState(false)

    useEffect(() => {
        localStorage.setItem('quran_swipe_enabled', isSwipeEnabled)
    }, [isSwipeEnabled])

    useEffect(() => {
        // Detect if the user is on a touch-capable mobile/tablet device
        const checkTouch = () => {
            return (
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                navigator.msMaxTouchPoints > 0 ||
                window.matchMedia("(pointer: coarse)").matches
            )
        }
        setIsTouchDevice(checkTouch())
    }, [])

    // Touch gesture tracking refs
    const touchStartX = useRef(null)
    const touchEndX = useRef(null)

    // Current page data
    const currentMapping = useMemo(() => pageMapping[currentPage], [currentPage])

    // Handlers for navigation
    const goToNextPage = () => {
        if (currentPage < 604) setCurrentPage(p => p + 1)
    }

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1)
    }

    const handleTouchStart = (e) => {
        touchEndX.current = null // Reset end position on new touch
        touchStartX.current = e.targetTouches[0].clientX
    }

    const handleTouchMove = (e) => {
        touchEndX.current = e.targetTouches[0].clientX
    }

    const handleTouchEnd = () => {
        if (!isSwipeEnabled) return
        if (!touchStartX.current || !touchEndX.current) return

        const deltaX = touchStartX.current - touchEndX.current
        const SWIPE_THRESHOLD = 50 // Minimum distance in pixels to trigger a swipe

        if (deltaX > SWIPE_THRESHOLD) {
            // Swiped left -> Go to Prev Page (Follows right button)
            goToPrevPage()
        } else if (deltaX < -SWIPE_THRESHOLD) {
            // Swiped right -> Go to Next Page (Follows left button)
            goToNextPage()
        }
    }

    const saveProgress = async () => {
        if (!user || !khatmId) return
        setIsSaving(true)

        // We save the START of the current page as the progress bookmark.
        // So next time they load the app, they start exactly on this page.
        await updateKhatmProgress(khatmId, currentMapping.start.surah, currentMapping.start.ayah)

        // Log all pages historically read since the last save point.
        // We exclude the current page because they are technically still reading it.
        // We only log if they moved forward (backwards means already read).
        if (currentPage > lastSavedPageRef.current) {
            const endPage = currentPage - 1
            await logPageRangeRead(user.id, khatmId, lastSavedPageRef.current, endPage)
            setHighestPageRead(prev => Math.max(prev || 0, endPage))
        }

        // Update the reference point for the next bulk save.
        // Now, this current unread page becomes the start of the next range!
        lastSavedPageRef.current = currentPage

        // Update URL to match new saved state
        navigate(`/read?khatmId=${khatmId}&surah=${currentMapping.start.surah}&ayah=${currentMapping.start.ayah}`, { replace: true })

        setTimeout(() => setIsSaving(false), 1000)
    }

    const handleFinishKhatm = async () => {
        if (!user || !khatmId) return
        setIsSaving(true)

        // Log the final remaining block, specifically INCLUDING page 604.
        if (currentPage >= lastSavedPageRef.current) {
            await logPageRangeRead(user.id, khatmId, lastSavedPageRef.current, 604)
        }

        // Reset user progress back to Surah 1, Ayah 1
        await updateKhatmProgress(khatmId, 1, 1)

        // Mark Khatm as completed
        await finishKhatm(khatmId)

        // Send the user to the Dashboard to see their updated histogram
        navigate(`/khatm/${khatmId}`)
    }

    const handleUndo = async () => {
        if (!user || !khatmId || isUndoing || isSaving) return

        setIsUndoing(true)
        const success = await undoHighestReadPage(khatmId)

        if (success) {
            // Re-fetch highest page to update state and hide button
            const history = await fetchReadingHistory(khatmId)
            let newHighest = null
            if (history && history.length > 0) {
                newHighest = Math.max(...history.map(h => h.page_number))
            }
            setHighestPageRead(newHighest)

            // Adjust the save ref tracker so we don't accidentally re-log the deleted block
            lastSavedPageRef.current = newHighest ? newHighest + 1 : 1
        }

        setIsUndoing(false)
    }

    // Format image URL (e.g. page_001.jpg, page_042.jpg, page_604.jpg)
    // Use import.meta.env.BASE_URL for GitHub Pages compatibility
    const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '')
    const imageUrl = `${basePath}/quran-pages/page_${String(currentPage).padStart(3, '0')}.jpg`

    return (
        <div className="flex flex-col h-full w-full bg-[#fffcdd] dark:bg-[#fffcdd] overflow-hidden">

            {/* Top Display Header Portaled to Navbar */}
            {document.getElementById('navbar-center-portal') && createPortal(
                <div className="text-center pointer-events-auto mt-1 flex flex-col items-center">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight flex items-center justify-center gap-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Page</span>
                        <select
                            value={currentPage}
                            onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                            className="bg-transparent text-emerald-600 dark:text-emerald-400 font-bold border-none p-0 pr-4 m-0 outline-none focus:ring-0 cursor-pointer text-center appearance-none hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1 transition-colors"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2310b981' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0rem center', backgroundSize: '1.2em 1.2em', backgroundRepeat: 'no-repeat' }}
                        >
                            {Array.from({ length: 604 }, (_, i) => i + 1).map(p => (
                                <option key={p} value={p} className="text-slate-800">{p}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 -mt-0.5">
                        Surah {currentMapping?.start.surah}:{currentMapping?.start.ayah} - {currentMapping?.end.surah}:{currentMapping?.end.ayah}
                    </div>
                </div>,
                document.getElementById('navbar-center-portal')
            )}

            {/* Swipe Toggle Bar (Only visible on touch devices) */}
            {isTouchDevice && (
                <div className="w-full bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700/50 py-2 px-4 shadow-sm flex justify-center z-10 shrink-0">
                    <div className="w-full max-w-5xl flex justify-between items-center px-4">
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium tracking-wide">
                            Enable swipe to turn pages
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isSwipeEnabled}
                                onChange={(e) => setIsSwipeEnabled(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500 shadow-inner"></div>
                        </label>
                    </div>
                </div>
            )}

            {/* Reader Container (Scrollable Region) */}
            <div
                className="flex-1 w-full overflow-y-auto flex justify-center custom-scrollbar relative"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    src={imageUrl}
                    alt={`Quran Page ${currentPage}`}
                    className="max-h-full w-full max-w-5xl object-contain pt-4 pb-28"
                    loading="lazy"
                />
            </div>

            {/* Bottom Utility Bar (Sticky) */}
            <div className="fixed bottom-0 left-0 right-0 w-full flex justify-between items-center gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-4 px-4 sm:px-8 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] z-50 border-t border-slate-200/50 dark:border-slate-700/50">
                <button
                    onClick={goToNextPage}
                    disabled={currentPage === 604}
                    className="px-4 py-3 bg-slate-100/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition shrink-0 font-medium"
                >
                    ← Next
                </button>

                {khatmId ? (
                    currentPage === highestPageRead ? (
                        <button
                            onClick={handleUndo}
                            disabled={isUndoing || !user}
                            className={`flex-1 px-4 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${!user
                                ? 'bg-slate-200/90 text-slate-400 dark:bg-slate-800/90 dark:text-slate-600 cursor-not-allowed'
                                : isUndoing
                                    ? 'bg-red-100/90 text-red-500 dark:bg-red-900/50'
                                    : 'bg-white/80 dark:bg-slate-800/80 text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700 border border-red-200 dark:border-red-500/30'
                                }`}
                            title="Undo this read page"
                        >
                            {isUndoing ? 'Undoing...' : '↺ Undo Read Page'}
                        </button>
                    ) : currentPage === 604 ? (
                        <button
                            onClick={handleFinishKhatm}
                            disabled={isSaving || !user}
                            className={`flex-1 px-4 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${!user
                                ? 'bg-slate-200/90 text-slate-400 dark:bg-slate-800/90 dark:text-slate-600 cursor-not-allowed'
                                : isSaving
                                    ? 'bg-amber-100/90 text-amber-600 dark:bg-amber-900/50'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-sm shadow-amber-500/20'
                                }`}
                            title={!user ? "Sign in to save progress" : "Complete your Khatm"}
                        >
                            {isSaving ? 'Logging...' : '✨ Finish Khatm ✨'}
                        </button>
                    ) : (
                        <button
                            onClick={saveProgress}
                            disabled={isSaving || !user || currentPage <= lastSavedPageRef.current}
                            className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${!user
                                ? 'bg-slate-200/90 text-slate-400 dark:bg-slate-800/90 dark:text-slate-600 cursor-not-allowed'
                                : (currentPage <= lastSavedPageRef.current)
                                    ? 'bg-slate-100/90 text-slate-400 dark:bg-slate-800/90 dark:text-slate-500 cursor-default'
                                    : isSaving
                                        ? 'bg-emerald-100/90 text-emerald-600 dark:bg-emerald-900/50'
                                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20'
                                }`}
                            title={!user ? "Sign in to save progress" : (currentPage <= lastSavedPageRef.current ? "Progress is already saved for this page and prior pages. Read on!" : "Save all progress leading up to (not including) this page")}
                        >
                            {
                                isSaving
                                    ? 'Saved!'
                                    : currentPage < lastSavedPageRef.current
                                        ? 'Previously Read'
                                        : currentPage === lastSavedPageRef.current
                                            ? 'Flip page to save'
                                            : 'Save Progress'
                            }
                        </button>
                    )
                ) : (
                    <div className="flex-1 flex justify-center text-sm font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">
                        Just Reciting
                    </div>
                )}

                <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="px-4 py-3 bg-slate-100/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition shrink-0 font-medium"
                >
                    Prev →
                </button>
            </div>

        </div>
    )
}
