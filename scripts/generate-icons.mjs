import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';

const SOURCE = process.argv[2];
const APP_DIR = path.resolve('src/app');

async function removeWhiteBackground(input) {
  const { data, info } = await sharp(input)
    .trim() // Crop transparency/white space around the logo
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const threshold = 245; // slightly more aggressive white detection
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > threshold && g > threshold && b > threshold) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  });
}

async function main() {
  console.log('🎨 Generating icons from:', SOURCE);

  // Load and remove background
  const transparentImage = await removeWhiteBackground(SOURCE);
  const tempBuffer = await transparentImage.png().toBuffer();

  // 1. favicon.ico (32x32)
  const png32 = await sharp(tempBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const icoBuffer = await pngToIco([png32]);
  fs.writeFileSync(path.join(APP_DIR, 'favicon.ico'), icoBuffer);
  console.log('✅ favicon.ico (32x32)');

  // 2. icon.png (512x512)
  await sharp(tempBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(APP_DIR, 'icon.png'));
  console.log('✅ icon.png (512x512)');

  // 3. apple-icon.png (180x180)
  await sharp(tempBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(APP_DIR, 'apple-icon.png'));
  console.log('✅ apple-icon.png (180x180)');

  // 4. Update logo in public folder
  const publicDir = path.resolve('public');
  await sharp(tempBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('✅ public/logo.png (512x512)');

  console.log('\n🎉 Icons with transparent background generated successfully!');
}

main().catch(console.error);
