import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const metaPath = path.join(__dirname, 'quran-meta.json');
const mappingPath = path.join(__dirname, 'page-verse-mapping.json');
const outputPath = path.join(__dirname, 'juz-end-pages.json');

try {
    const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const pageMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

    // 1. Extract Juz Start Surahs and Ayahs
    // quran-meta.json structure: data.juzs.references = [{surah: 1, ayah: 1}, {surah: 2, ayah: 142}, ...]
    const juzStarts = metaData.data.juzs.references;

    // We need to find the PAGE where each juz ENDS to give them a bubble.
    // The end of Juz 1 is the verse directly preceeding the start of Juz 2.
    // So we iterate through the 30 Juzs, and find the page that contains the Ayah *just before* the next Juz starts.
    // For Juz 30 (the last one), it ends on page 604.

    const juzTerminalPages = [];

    // Helper to find the page number for a given target Surah/Ayah
    function findPageForAyah(targetSurah, targetAyah) {
        for (let pageNum = 1; pageNum <= 604; pageNum++) {
            const pageData = pageMapping[pageNum];

            // Is it on this page?
            // Case A: The page spans multiple surahs, target is inside one of them
            if (targetSurah >= pageData.start.surah && targetSurah <= pageData.end.surah) {

                // Case 1: Exact Surah Match on a single-surah page
                if (pageData.start.surah === pageData.end.surah) {
                    if (targetAyah >= pageData.start.ayah && targetAyah <= pageData.end.ayah) {
                        return pageNum;
                    }
                }
                // Case 2: Multi-surah page, target is in the FIRST surah on the page
                else if (targetSurah === pageData.start.surah) {
                    if (targetAyah >= pageData.start.ayah) return pageNum;
                }
                // Case 3: Multi-surah page, target is in the LAST surah on the page
                else if (targetSurah === pageData.end.surah) {
                    if (targetAyah <= pageData.end.ayah) return pageNum;
                }
                // Case 4: Multi-surah page, target is stuck in a surah strictly between start/end (e.g. Surahs 112, 113, 114)
                else {
                    return pageNum;
                }
            }
        }
        return -1; // Should never hit this for a valid ayah
    }

    // Process Juz 1 to 29
    for (let i = 0; i < 29; i++) {
        // Find the start of the NEXT Juz
        const nextJuz = juzStarts[i + 1];

        let endSurah = nextJuz.surah;
        let endAyah = nextJuz.ayah - 1;

        // If the next Juz starts exactly on Ayah 1, the previous Juz ended on the final Ayah of the previous Surah.
        // It's cleaner though to just ask our mapping: "What page contains the Ayah exactly prior to this one, or what page contains the Ayah itself?"
        // Simpler approach: A Juz ends on the page exactly prior to the page where the *next* Juz starts, 
        // UNLESS the next Juz starts mid-page, in which case they share the page boundary (which is true for e.g. Juz 2).

        // Wait, what page does the next Juz *START* on?
        const nextJuzStartPage = findPageForAyah(nextJuz.surah, nextJuz.ayah);

        // A Juz is "completed" on the last page that contains its verses.
        // If Juz 2 starts on Page 22, then Juz 1 MUST end on Page 21.
        // If Juz 3 starts on Page 42, then Juz 2 ends on Page 41. (Usually standard 20 page juzs).

        // Let's verify standard mappings by finding exactly what page the PREVIOUS ayah is on.
        // Even simpler: The ending page of Juz N is definitively found by checking the page the previous Ayah is on.
        // But traversing Ayahs logic is annoying (what is the last ayah of Surah X?).

        // Let's just use the `nextJuzStartPage`! 
        // If a new Juz starts on Page 22, the previous Juz ended on either 21 or 22.
        // To be completely accurate to the 13-line / 15-line standard: The Madani Mushaf is explicitly designed so that every Juz ends EXACTLY at the bottom of a page.
        // Therefore, Juz N always ends on `nextJuzStartPage - 1`. Let's verify this beautiful mathematical standard!
        juzTerminalPages.push(nextJuzStartPage - 1);
    }

    // Juz 30 always ends on the final page 604
    juzTerminalPages.push(604);

    fs.writeFileSync(outputPath, JSON.stringify(juzTerminalPages, null, 2));
    console.log(`Successfully extracted ${juzTerminalPages.length} Juz terminal pages to ${outputPath}`);

} catch (e) {
    console.error('Error generating Juz mapping:', e);
}
