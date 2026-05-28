const sharp = require('sharp');

async function generate() {
    try {
        console.log('Generating 192x192 icon...');
        await sharp('assets/background-photo.jpg')
            .resize(192, 192, { fit: 'cover' })
            .png()
            .toFile('assets/icon-192x192.png');

        console.log('Generating 512x512 icon...');
        await sharp('assets/background-photo.jpg')
            .resize(512, 512, { fit: 'cover' })
            .png()
            .toFile('assets/icon-512x512.png');

        console.log('Done!');
    } catch (e) {
        console.error('Error:', e);
    }
}

generate();
