import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY // Service role key preferred for admin bypass, but anon works if RLS allows it

if (!supabaseUrl) {
    console.error("Missing Supabase URL in .env.local")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const mappingPath = path.resolve(__dirname, '../src/data/page-verse-mapping.json')
const pageMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'))

const findPageBySurahAyah = (surah, ayah) => {
    for (const [pageNumStr, data] of Object.entries(pageMapping)) {
        const pageNum = parseInt(pageNumStr)
        if (
            (surah > data.start.surah || (surah === data.start.surah && ayah >= data.start.ayah)) &&
            (surah < data.end.surah || (surah === data.end.surah && ayah <= data.end.ayah))
        ) {
            return pageNum
        }
    }
    return 1
}

async function backfill() {
    console.log("Fetching current user progress...")
    const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')

    if (progressError) {
        console.error("Error fetching progress:", progressError)
        return
    }

    console.log(`Found ${progressData.length} progress records.`)

    for (const record of progressData) {
        const currentPage = findPageBySurahAyah(record.surah_number, record.ayah_number)
        console.log(`User ${record.user_id} is on page ${currentPage}. Backfilling pages 1 to ${currentPage}...`)

        const historyEntries = []
        // Backfill pages distributing them arbitrarily into the past to make the graph look nice? 
        // Or just log them all to the original `updated_at` date.
        // For accuracy, we'll log them all with a timestamp of the progress's `updated_at`
        for (let p = 1; p <= currentPage; p++) {
            historyEntries.push({
                user_id: record.user_id,
                page_number: p,
                read_at: record.updated_at || new Date().toISOString()
            })
        }

        const { error: insertError } = await supabase
            .from('reading_history')
            .insert(historyEntries)

        if (insertError) {
            console.error(`Failed to backfill user ${record.user_id}:`, insertError.message)
        } else {
            console.log(`Successfully backfilled ${currentPage} pages for user ${record.user_id}.`)
        }
    }

    console.log("Backfill complete.")
}

backfill()
