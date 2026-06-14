const sharp = require('sharp');

async function padLogo() {
  try {
    await sharp('splashlogo.svg')
      .resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 106,
        bottom: 106,
        left: 106,
        right: 106,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('splashlogo_padded.png');
    console.log('Generated splashlogo_padded.png');
  } catch (err) {
    console.error(err);
  }
}

padLogo();
