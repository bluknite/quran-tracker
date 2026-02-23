import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`
❌ ERROR: Missing Supabase Credentials in .env.local

Because this script bypasses authentication to insert data for specific users,
it requires the Supabase Service Role Key to bypass Row Level Security (RLS).

Please add the following to your .env.local file:
VITE_SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

You can find the Service Role Key in your Supabase Dashboard under:
Project Settings -> API -> Project API keys -> service_role (secret)
    `.trim())
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
    const args = process.argv.slice(2)

    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        console.log(`
Usage:
  Manual entry: node scripts/backfill-history.js <user_id> <start_page> <end_page> <date_or_timestamp>
  Example 1:    node scripts/backfill-history.js 123e4567-e89b-12d3... 10 25 2026-02-22
  Example 2:    node scripts/backfill-history.js 123e4567-e89b-12d3... 10 25 "2026-02-22T03:27:34-08:00"

  Auto-sync:    node scripts/backfill-history.js --auto
  (Fetches all users' current progress bookmarks and logs pages 1 to bookmark)
        `.trim())
        process.exit(0)
    }

    if (args[0] === '--auto') {
        console.log("Starting Auto-Sync Backfill...")
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
                console.log(`Successfully backfilled ${currentPage} pages.`)
            }
        }
        console.log("Auto-sync complete.")
        return
    }

    // Manual Mode
    if (args.length < 4) {
        console.error("Error: Missing arguments for manual entry.")
        console.error("Run 'node scripts/backfill-history.js --help' for usage instructions.")
        process.exit(1)
    }

    const userId = args[0]
    const startPage = parseInt(args[1], 10)
    const endPage = parseInt(args[2], 10)
    const dateStr = args.slice(3).join(' ')

    if (isNaN(startPage) || isNaN(endPage) || startPage > endPage) {
        console.error("Error: Invalid page range. Ensure start_page and end_page are numbers, and start_page <= end_page.")
        process.exit(1)
    }

    let timestamp
    try {
        // If the user passes "2026-02-22", convert to valid ISO. Fallback to raw string if they provide a full TZ string.
        timestamp = new Date(dateStr).toISOString()
    } catch (e) {
        console.error("Error: Invalid date format. Please use YYYY-MM-DD or a valid ISO string.")
        process.exit(1)
    }

    console.log(`Manual Backfill: Adding pages ${startPage} to ${endPage} for user ${userId} on ${timestamp}...`)

    const historyEntries = []
    for (let p = startPage; p <= endPage; p++) {
        historyEntries.push({
            user_id: userId,
            page_number: p,
            read_at: timestamp
        })
    }

    const { error: insertError } = await supabase
        .from('reading_history')
        .insert(historyEntries)

    if (insertError) {
        console.error(`Failed to manually insert entries:`, insertError.message)
    } else {
        console.log(`Successfully backfilled ${endPage - startPage + 1} pages for the user!`)
    }
}

backfill()
