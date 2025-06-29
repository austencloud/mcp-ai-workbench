import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const faviconPath = join(process.cwd(), 'public', 'favicon.ico');
    const favicon = readFileSync(faviconPath);
    
    return new Response(favicon, {
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error serving favicon:', error);
    return new Response('Not Found', { status: 404 });
  }
}
