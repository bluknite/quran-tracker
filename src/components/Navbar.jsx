import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { useSettings } from '../context/SettingsContext'

export const Navbar = () => {
    const { user, signInWithGoogle, signOut } = useAuth()
    const { showDebug, setShowDebug } = useSettings()
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const settingsRef = useRef(null)
    const location = useLocation()
    const isReading = location.pathname.startsWith('/read')
    const khatmId = new URLSearchParams(location.search).get('khatmId')

    // Close settings if clicked outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 dark:border-slate-700/50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between min-h-[4rem] py-1.5 sm:py-0 relative items-center">
                    <div className="flex items-center z-10 shrink-0">
                        <Link to={isReading && khatmId ? `/khatm/${khatmId}` : "/"} className="flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                            {isReading ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                                </svg>
                            ) : (
                                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                                    Quran Tracker
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Center Portal Target */}
                    <div id="navbar-center-portal" className="flex-1 flex justify-center items-center min-w-0 pointer-events-none"></div>

                    <div className="flex items-center justify-end gap-4 z-10 shrink-0 w-auto">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
                                    {user.email}
                                </span>

                                <div className="relative" ref={settingsRef}>
                                    <button
                                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 outline-none"
                                        aria-label="Settings"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                    </button>

                                    {/* Slide-out Menu */}
                                    {isSettingsOpen && (
                                        <div className="absolute right-0 top-14 mt-1 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-left z-50 animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right">
                                            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Settings</h3>
                                                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 bg-slate-50 dark:bg-slate-700 rounded-md">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <div className="p-4 flex flex-col gap-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="pr-4">
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Show Debug Forecasts</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Display alternative mathematical completion projections.</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowDebug(!showDebug)}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showDebug ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showDebug ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 border-dashed">
                                                <button
                                                    onClick={() => {
                                                        setIsSettingsOpen(false);
                                                        signOut();
                                                    }}
                                                    className="w-full px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors flex justify-center items-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                                                    </svg>
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={signInWithGoogle}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50"
                            >
                                Sign In with Google
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
