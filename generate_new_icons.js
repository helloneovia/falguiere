const sharp = require('sharp');

async function generate() {
    try {
        console.log('Generating 192x192 icon...');
        await sharp('D:/FALGUIERE/FALGUIERE_MOBILE/app-icon.png')
            .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile('D:/FALGUIERE/assets/icon-192x192.png');

        console.log('Generating 512x512 icon...');
        await sharp('D:/FALGUIERE/FALGUIERE_MOBILE/app-icon.png')
            .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile('D:/FALGUIERE/assets/icon-512x512.png');

        console.log('Done!');
    } catch (e) {
        console.error('Error:', e);
    }
}

generate();
