import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export const Layout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
            <Navbar />
            <main className="flex-1 w-full relative">
                <Outlet />
            </main>
        </div>
    )
}
