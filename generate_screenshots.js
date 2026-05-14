const sharp = require('sharp');
const path = require('path');

async function generateScreenshot(inputImage, outputName, title, subtitle, width, height) {
    const safeTitle = title.replace(/'/g, '&apos;');
    const safeSubtitle = subtitle.replace(/'/g, '&apos;');

    const isLandscape = width > height;
    
    // For portrait: text at bottom (y=1550). For landscape: text at bottom (y=850)
    const textY1 = isLandscape ? 850 : 1550;
    const textY2 = isLandscape ? 950 : 1650;
    
    const svgOverlay = `
        <svg width="${width}" height="${height}">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:rgba(0,0,0,0.6)" />
                    <stop offset="40%" style="stop-color:rgba(0,0,0,0.1)" />
                    <stop offset="100%" style="stop-color:rgba(217, 119, 67, 0.95)" />
                </linearGradient>
            </defs>
            <rect x="0" y="0" width="${width}" height="${height}" fill="url(#grad1)" />
            
            <text x="${width/2}" y="${textY1}" font-family="sans-serif" font-size="${isLandscape ? 90 : 80}" font-weight="bold" fill="white" text-anchor="middle">
                ${safeTitle}
            </text>
            <text x="${width/2}" y="${textY2}" font-family="sans-serif" font-size="${isLandscape ? 50 : 45}" font-weight="normal" fill="#f8fafc" text-anchor="middle">
                ${safeSubtitle}
            </text>
        </svg>
    `;

    await sharp(path.join(__dirname, 'assets', inputImage))
        .resize(width, height, { fit: 'cover' })
        .composite([
            { input: Buffer.from(svgOverlay), blend: 'over' }
        ])
        .jpeg({ quality: 90 })
        .toFile(path.join(__dirname, 'playstore_images', outputName));

    console.log(`Generated ${outputName}`);
}

async function run() {
    try {
        // Phone (1080x1920)
        await generateScreenshot('background-photo.jpg', 'screenshot-1.jpg', "L'Association Falguière", "Ensemble pour notre quartier", 1080, 1920);
        await generateScreenshot('galerie-1.jpg', 'screenshot-2.jpg', "Nos Actions", "Découvrez nos projets locaux", 1080, 1920);
        await generateScreenshot('galerie-4.jpg', 'screenshot-3.jpg', "Solidarité", "Soutien et entraide au quotidien", 1080, 1920);
        await generateScreenshot('galerie-5.jpg', 'screenshot-4.jpg', "Rejoignez-nous !", "Devenez bénévole dès aujourd'hui", 1080, 1920);
        
        // Tablet (1920x1080)
        await generateScreenshot('background-photo.jpg', 'tablet-1.jpg', "L'Association Falguière", "Ensemble pour notre quartier", 1920, 1080);
        await generateScreenshot('galerie-1.jpg', 'tablet-2.jpg', "Nos Actions", "Découvrez nos projets locaux", 1920, 1080);
        await generateScreenshot('galerie-4.jpg', 'tablet-3.jpg', "Solidarité", "Soutien et entraide au quotidien", 1920, 1080);
        await generateScreenshot('galerie-5.jpg', 'tablet-4.jpg', "Rejoignez-nous !", "Devenez bénévole dès aujourd'hui", 1920, 1080);

        console.log('All screenshots generated!');
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
