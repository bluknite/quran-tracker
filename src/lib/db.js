import { supabase } from './supabase'

/**
 * Fetches all Khatms for a given user.
 * @param {string} userId - The unique identifier of the user
 * @returns {Promise<Array<{ id: string, khatm_number: number, user_label: string, status: string, surah_number: number, ayah_number: number, created_at: string, completed_at: string }>>}
 */
export const fetchKhatms = async (userId) => {
    if (!userId) return []

    const { data, error } = await supabase
        .from('khatms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching khatms:', error.message)
        return []
    }

    return data || []
}

/**
 * Creates a new Khatm for the user.
 * @param {string} userId - The unique identifier of the user
 * @param {string} [userLabel] - Optional user-specified descriptive name
 * @returns {Promise<{ id: string }>} Resulting Khatm object
 */
export const createKhatm = async (userId, userLabel = null) => {
    if (!userId) throw new Error("Missing userId")

    // Determine the next khatm_number for this user
    const { count, error: countError } = await supabase
        .from('khatms')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    if (countError) throw countError

    const nextKhatmNumber = (count || 0) + 1

    const { data, error } = await supabase
        .from('khatms')
        .insert([{
            user_id: userId,
            khatm_number: nextKhatmNumber,
            user_label: userLabel,
            status: 'active',
            surah_number: 1,
            ayah_number: 1
        }])
        .select('id')
        .single()

    if (error) throw error
    return data
}

/**
 * Fetches a specific Khatm by ID.
 * @param {string} khatmId - The unique identifier of the Khatm
 */
export const getKhatm = async (khatmId) => {
    if (!khatmId) return null

    const { data, error } = await supabase
        .from('khatms')
        .select('*')
        .eq('id', khatmId)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching specific khatm:', error.message)
    }

    return data
}

/**
 * Updates the progress (bookmark) for a specific Khatm.
 * @param {string} khatmId - The unique identifier of the Khatm
 * @param {number} surahNumber - The current Surah number
 * @param {number} ayahNumber - The current Ayah number
 */
export const updateKhatmProgress = async (khatmId, surahNumber, ayahNumber) => {
    if (!khatmId) return

    const { error } = await supabase
        .from('khatms')
        .update({
            surah_number: surahNumber,
            ayah_number: ayahNumber
        })
        .eq('id', khatmId)

    if (error) {
        console.error('Error updating khatm progress:', error.message)
    }
}

/**
 * Logs a specific page read event to the reading_history table.
 * Used for generating the contribution histogram.
 * @param {string} userId - The unique identifier of the user
 * @param {number} pageNumber - The page number read
 */
export const logPageRead = async (userId, khatmId, pageNumber) => {
    if (!userId || !khatmId || !pageNumber) return

    const { error } = await supabase
        .from('reading_history')
        .insert([{ user_id: userId, khatm_id: khatmId, page_number: pageNumber }]) // read_at defaults to now()

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
export const fetchReadingHistory = async (khatmId) => {
    if (!khatmId) return []

    const { data, error } = await supabase
        .from('reading_history')
        .select('page_number, read_at')
        .eq('khatm_id', khatmId)
        .order('read_at', { ascending: false })
        .order('page_number', { ascending: false })

    if (error) {
        console.error('Error fetching reading history:', error.message)
        return []
    }

    return data || []
}

/**
 * Logs a range of page read events to the reading_history table in a single bulk insert.
 * @param {string} userId - The unique identifier of the user
 * @param {string} khatmId - The unique identifier of the Khatm
 * @param {number} startPage - The page to start logging from
 * @param {number} endPage - The page to end logging at
 */
export const logPageRangeRead = async (userId, khatmId, startPage, endPage) => {
    if (!userId || !khatmId || !startPage || !endPage) return

    const minPage = Math.min(startPage, endPage)
    const maxPage = Math.max(startPage, endPage)

    // Ensure we don't accidentally try to insert 600 pages at once if the user jumps around wildly
    // We limit the array size to realistic reading session counts (e.g. max 100 pages mapped)
    const pageRangeCount = Math.min((maxPage - minPage) + 1, 150)

    // Create an array of row objects
    const insertPayload = Array.from({ length: pageRangeCount }, (_, i) => ({
        user_id: userId,
        khatm_id: khatmId,
        page_number: minPage + i
    }))

    const { error } = await supabase
        .from('reading_history')
        .upsert(insertPayload, { onConflict: 'khatm_id, page_number', ignoreDuplicates: true })

    if (error) {
        console.error('Error logging page range:', error.message)
    }
}

/**
 * Marks a Khatm as completed and records the finish timestamp.
 * @param {string} khatmId - The Khatm to complete
 */
export const finishKhatm = async (khatmId) => {
    if (!khatmId) return

    const { error } = await supabase
        .from('khatms')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', khatmId)

    if (error) {
        console.error('Error finishing khatm:', error.message)
    }
}
