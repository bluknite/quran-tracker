import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const inputDir = path.join(__dirname, '..', '..', 'public', 'quran-pages')
const outputDir = path.join(__dirname, '..', '..', 'public', 'quran-pages-test')

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
}

const testFiles = ['page_003.jpg', 'page_004.jpg', 'page_005.jpg', 'page_006.jpg']

async function runTest() {
    for (const file of testFiles) {
        const pageNum = parseInt(file.match(/\d+/)[0], 10)
        const inputPath = path.join(inputDir, file)
        const outputPath = path.join(outputDir, file)

        const metadata = await sharp(inputPath).metadata()

        // Trial dimensions for slicing
        const gutterSlice = 350 // Inner edge (spine)
        const outerSlice = 150  // Outer edge 
        const topSlice = 150    // Top margin
        const bottomSlice = 150 // Bottom margin

        let leftOffset = 0
        let rightOffset = 0

        if (pageNum % 2 === 0) {
            // Even page (Left Side of Book): Gutter is on the right visually? Wait. 
            // If it's an Arabic book, reading Right-to-Left:
            // Even pages (like 4) are on the LEFT side of the book spread. The spine/gutter is on their RIGHT side!
            // But let's look at the standard scans. Usually, Even pages in Arabic have the wide margin on the RIGHT side.
            // Wait, the user said: "Every odd page has a wide margin on the right side and every even page has a wide margin on the left side."

            // Even page: wide margin on the Left
            leftOffset = gutterSlice
            rightOffset = outerSlice
        } else {
            // Odd page: wide margin on the Right
            leftOffset = outerSlice
            rightOffset = gutterSlice
        }

        const extractWidth = metadata.width - leftOffset - rightOffset
        const extractHeight = metadata.height - topSlice - bottomSlice

        await sharp(inputPath)
            .extract({
                left: leftOffset,
                top: topSlice,
                width: extractWidth,
                height: extractHeight
            })
            .jpeg({ quality: 80, progressive: true })
            .toFile(outputPath)

        console.log(`Saved ${outputPath}`)
    }
}

runTest().catch(console.error)
