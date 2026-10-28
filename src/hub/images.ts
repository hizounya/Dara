// Optimised brand images for the Member Hub app (used by /hub/ and /signup).
// The app reads them from data attributes on #app; poses are fetched only when the app shows them.
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import logoSrc from '../assets/brand/dara-in-tech-logo.png';

const poseFiles = import.meta.glob<{ default: ImageMetadata }>('../assets/brand/mascot/dala-*.png', { eager: true });

export async function hubImages() {
  const logo = await getImage({ src: logoSrc, width: 240, format: 'webp' });
  const poses: Record<string, string> = {};
  for (const [path, mod] of Object.entries(poseFiles)) {
    const name = path.match(/dala-([a-z-]+)\.png$/)![1];
    poses[name] = (await getImage({ src: mod.default, width: 240, format: 'webp' })).src;
  }
  const dala = (await getImage({ src: poseFiles['../assets/brand/mascot/dala-wave.png'].default, width: 480, format: 'webp' })).src;
  return { logo: logo.src, dala, poses };
}
