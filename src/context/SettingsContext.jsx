import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext({})

export const SettingsProvider = ({ children }) => {
    const [showDebug, setShowDebug] = useState(() => {
        const stored = localStorage.getItem('quran_tracker_show_debug')
        return stored ? JSON.parse(stored) : false
    })

    useEffect(() => {
        localStorage.setItem('quran_tracker_show_debug', JSON.stringify(showDebug))
    }, [showDebug])

    return (
        <SettingsContext.Provider value={{ showDebug, setShowDebug }}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => useContext(SettingsContext)
