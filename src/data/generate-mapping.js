import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the metadata from alquran.cloud
const metaPath = path.join(__dirname, 'quran-meta.json')
const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'))

const pages = metaData.data.pages.references
const surahs = metaData.data.surahs.references

const pageMapping = {}

// For each page, we have the STARTING surah/ayah
// We need to calculate the ENDING surah/ayah based on the start of the NEXT page
for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1
    const startSurah = pages[i].surah
    const startAyah = pages[i].ayah

    let endSurah, endAyah

    if (i < pages.length - 1) {
        // Next page exists
        const nextStartSurah = pages[i + 1].surah
        const nextStartAyah = pages[i + 1].ayah

        if (nextStartSurah === startSurah) {
            // Ends in the same surah
            endSurah = startSurah
            endAyah = nextStartAyah - 1
        } else {
            // Ends in a previous surah
            endSurah = nextStartSurah
            endAyah = nextStartAyah - 1

            if (endAyah === 0) {
                // If the next page starts at ayah 1, this page ended on the last ayah of the previous surah
                endSurah = nextStartSurah - 1
                // Get the total number of ayahs in the ending surah
                const surahData = surahs.find(s => s.number === endSurah)
                endAyah = surahData.numberOfAyahs
            }
        }
    } else {
        // Last page (Page 604)
        endSurah = 114
        endAyah = 6 // Last ayah of An-Naas
    }

    pageMapping[pageNum] = {
        start: { surah: startSurah, ayah: startAyah },
        end: { surah: endSurah, ayah: endAyah }
    }
}

const outputPath = path.join(__dirname, 'page-verse-mapping.json')
fs.writeFileSync(outputPath, JSON.stringify(pageMapping, null, 2))

console.log(`Successfully generated mapping for ${Object.keys(pageMapping).length} pages to ${outputPath}`)
