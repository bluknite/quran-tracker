import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export const Layout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
            <Navbar />
            <main className="flex-1 w-full relative">
                <Outlet />
            </main>
        </div>
    )
}
