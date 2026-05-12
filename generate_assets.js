const sharp = require('sharp');
const fs = require('fs');

async function generate() {
    try {
        console.log('Generating 192x192 icon...');
        await sharp('assets/favicon.svg')
            .resize(192, 192)
            .png()
            .toFile('assets/icon-192x192.png');

        console.log('Generating 512x512 icon...');
        await sharp('assets/favicon.svg')
            .resize(512, 512)
            .png()
            .toFile('assets/icon-512x512.png');

        console.log('Generating wide screenshot...');
        await sharp('assets/background-photo.jpg')
            .resize(1280, 720, { fit: 'cover' })
            .jpeg()
            .toFile('assets/screenshot-wide.jpg');

        console.log('Generating narrow screenshot...');
        await sharp('assets/background-photo.jpg')
            .resize(720, 1280, { fit: 'cover' })
            .jpeg()
            .toFile('assets/screenshot-narrow.jpg');

        console.log('Done!');
    } catch (e) {
        console.error('Error:', e);
    }
}

generate();
