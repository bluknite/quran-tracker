import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Navbar = () => {
    const { user, signInWithGoogle, signOut } = useAuth()
    const location = useLocation()
    const isReading = location.pathname.startsWith('/read')
    const khatmId = new URLSearchParams(location.search).get('khatmId')

    return (
        <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 dark:border-slate-700/50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 relative">
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
                    <div id="navbar-center-portal" className="absolute inset-0 pointer-events-none flex items-center justify-center"></div>

                    <div className="flex items-center gap-4 z-10 shrink-0">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
                                    {user.email}
                                </span>
                                <button
                                    onClick={signOut}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Sign Out
                                </button>
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
