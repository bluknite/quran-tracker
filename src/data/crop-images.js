import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const inputDir = path.join(__dirname, '..', '..', 'public', 'quran-pages')
const outputDir = path.join(__dirname, '..', '..', 'public', 'quran-pages-cropped')

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
}

const files = fs.readdirSync(inputDir).filter(f => f.startsWith('page_') && f.endsWith('.jpg'))
console.log(`Found ${files.length} images to process...`)

async function processImages() {
    let processed = 0
    let savedBytes = 0

    for (const file of files) {
        const pageNum = parseInt(file.match(/\d+/)[0], 10)
        const inputPath = path.join(inputDir, file)
        const outputPath = path.join(outputDir, file)

        try {
            const originalStats = fs.statSync(inputPath)
            const metadata = await sharp(inputPath).metadata()

            if (pageNum >= 3) {
                const targetWidth = 1615
                let leftOffset = 0
                // Even pages have the gutter on the Left. Odd pages have the gutter on the Right.
                if (pageNum % 2 === 0) {
                    leftOffset = Math.max(0, metadata.width - targetWidth)
                } else {
                    leftOffset = 0
                }
                const extractWidth = Math.min(metadata.width, targetWidth)

                // Extract the precise horizontal frame without any vertical trimming
                await sharp(inputPath)
                    .extract({
                        left: leftOffset,
                        top: 0,
                        width: extractWidth,
                        height: metadata.height
                    })
                    .jpeg({ quality: 80, progressive: true })
                    .toFile(outputPath)
            } else {
                // Pages 1 and 2 are centered title pages, copy them natively
                fs.copyFileSync(inputPath, outputPath)
            }

            const newStats = fs.statSync(outputPath)
            savedBytes += (originalStats.size - newStats.size)

            processed++
            if (processed % 50 === 0) {
                console.log(`Processed ${processed}/${files.length} images...`)
            }
        } catch (err) {
            console.error(`Error processing ${file}:`, err.message)
        }
    }

    const savedMB = (savedBytes / (1024 * 1024)).toFixed(2)
    console.log(`\n✅ Done processing ${processed} images.`)
    console.log(`Saved approximately ${savedMB} MB of disk space.`)
}

processImages()
