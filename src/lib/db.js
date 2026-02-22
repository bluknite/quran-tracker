import { supabase } from './supabase'

/**
 * Fetches the user's progress from the user_progress table.
 * If no record exists, returns a default progress object.
 * @param {string} userId - The unique identifier of the user
 * @returns {Promise<{ surah_number: number, ayah_number: number }>}
 */
export const getUserProgress = async (userId) => {
    if (!userId) return { surah_number: 1, ayah_number: 1 }

    const { data, error } = await supabase
        .from('user_progress')
        .select('surah_number, ayah_number')
        .eq('user_id', userId)
        .single()

    if (error && error.code !== 'PGRST116') { // Ignore "Row not found" error
        console.error('Error fetching progress:', error.message)
        return { surah_number: 1, ayah_number: 1 }
    }

    // Return the fetched data or default to 1:1 if not found
    return {
        surah_number: data?.surah_number || 1,
        ayah_number: data?.ayah_number || 1
    }
}

/**
 * Updates the user's progress in the user_progress table.
 * Uses an upsert to create or update the record based on user_id.
 * @param {string} userId - The unique identifier of the user
 * @param {number} surahNumber - The current Surah number
 * @param {number} ayahNumber - The current Ayah number
 */
export const updateUserProgress = async (userId, surahNumber, ayahNumber) => {
    if (!userId) return

    const { error } = await supabase
        .from('user_progress')
        .upsert({
            user_id: userId,
            surah_number: surahNumber,
            ayah_number: ayahNumber,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

    if (error) {
        console.error('Error updating progress:', error.message)
    }
}

/**
 * Logs a specific page read event to the reading_history table.
 * Used for generating the contribution histogram.
 * @param {string} userId - The unique identifier of the user
 * @param {number} pageNumber - The page number read
 */
export const logPageRead = async (userId, pageNumber) => {
    if (!userId || !pageNumber) return

    const { error } = await supabase
        .from('reading_history')
        .insert([{ user_id: userId, page_number: pageNumber }]) // read_at defaults to now()

    if (error) {
        console.error('Error logging page read:', error.message)
    }
}

/**
 * Fetches the user's reading history ledger.
 * Returns an array of objects containing read_at timestamps and page_numbers.
 * @param {string} userId - The unique identifier of the user
 * @returns {Promise<Array<{ page_number: number, read_at: string }>>}
 */
export const fetchReadingHistory = async (userId) => {
    if (!userId) return []

    const { data, error } = await supabase
        .from('reading_history')
        .select('page_number, read_at')
        .eq('user_id', userId)
        .order('read_at', { ascending: false })

    if (error) {
        console.error('Error fetching reading history:', error.message)
        return []
    }

    return data || []
}

/**
 * Logs a range of page read events to the reading_history table in a single bulk insert.
 * @param {string} userId - The unique identifier of the user
 * @param {number} startPage - The page to start logging from
 * @param {number} endPage - The page to end logging at
 */
export const logPageRangeRead = async (userId, startPage, endPage) => {
    if (!userId || !startPage || !endPage) return

    const minPage = Math.min(startPage, endPage)
    const maxPage = Math.max(startPage, endPage)

    // Ensure we don't accidentally try to insert 600 pages at once if the user jumps around wildly
    // We limit the array size to realistic reading session counts (e.g. max 100 pages mapped)
    const pageRangeCount = Math.min((maxPage - minPage) + 1, 150)

    // Create an array of row objects
    const insertPayload = Array.from({ length: pageRangeCount }, (_, i) => ({
        user_id: userId,
        page_number: minPage + i
    }))

    const { error } = await supabase
        .from('reading_history')
        .insert(insertPayload)

    if (error) {
        console.error('Error logging page range:', error.message)
    }
}
