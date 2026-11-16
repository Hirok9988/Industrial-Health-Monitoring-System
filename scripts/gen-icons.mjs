import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../public/icons/icon-512.png');

await sharp(src).resize(192, 192).toFile(resolve(__dirname, '../public/icons/icon-192.png'));
console.log('icon-192.png generated successfully');
