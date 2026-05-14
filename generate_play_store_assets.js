const sharp = require('sharp');
const path = require('path');

async function generate() {
    try {
        console.log('Generating Feature Graphic 1024x500...');
        
        // SVG overlay for the text and gradients
        const svgOverlay = `
            <svg width="1024" height="500">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#d97743;stop-opacity:0.85" />
                        <stop offset="100%" style="stop-color:#2a1a10;stop-opacity:0.9" />
                    </linearGradient>
                </defs>
                <!-- Overlay to darken the background and add brand color -->
                <rect x="0" y="0" width="1024" height="500" fill="url(#grad1)" />
                
                <!-- Main Title -->
                <text x="512" y="240" font-family="sans-serif" font-size="90" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="4">
                    FALGUIÈRE
                </text>
                
                <!-- Subtitle -->
                <text x="512" y="310" font-family="sans-serif" font-size="36" font-weight="normal" fill="#f8fafc" text-anchor="middle">
                    Ensemble pour notre quartier
                </text>
                
                <text x="512" y="370" font-family="sans-serif" font-size="24" font-weight="lighter" fill="#cbd5e1" text-anchor="middle">
                    Solidarité · Paris 15e
                </text>
            </svg>
        `;

        await sharp(path.join(__dirname, 'assets', 'background-photo.jpg'))
            .resize(1024, 500, { fit: 'cover' })
            .composite([
                { input: Buffer.from(svgOverlay), blend: 'over' }
            ])
            .jpeg({ quality: 95 })
            .toFile(path.join(__dirname, 'assets', 'feature-graphic.jpg'));

        console.log('Done!');
    } catch (e) {
        console.error('Error:', e);
    }
}

generate();
