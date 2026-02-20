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
