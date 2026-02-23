import fs from 'fs'
import sharp from 'sharp'

async function check() {
    const p3 = await sharp('public/quran-pages/page_003.jpg').metadata()
    const p4 = await sharp('public/quran-pages/page_004.jpg').metadata()
    const p5 = await sharp('public/quran-pages/page_005.jpg').metadata()
    const p6 = await sharp('public/quran-pages/page_006.jpg').metadata()

    console.log('Page 3 (Odd):', p3.width, 'x', p3.height)
    console.log('Page 4 (Even):', p4.width, 'x', p4.height)
    console.log('Page 5 (Odd):', p5.width, 'x', p5.height)
    console.log('Page 6 (Even):', p6.width, 'x', p6.height)
}
check()
