import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export const Layout = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)]">
                <Outlet />
            </main>
        </div>
    )
}
