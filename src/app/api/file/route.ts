import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Storage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoId = searchParams.get('repoId');
    let filePath = searchParams.get('path'); // relative path to file

    if (!repoId || !filePath) {
      return NextResponse.json({ error: 'repoId and path search parameters are required' }, { status: 400 });
    }

    try {
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      // Fallback to original path if decode fails
    }

    const metadata = Storage.getRepository(repoId);
    if (!metadata) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const tempDir = path.join(process.cwd(), 'temp_repos');
    const repoDir = path.resolve(tempDir, repoId);
    const targetFile = path.resolve(repoDir, filePath);

    // Security: Check that the file stays within the repo directory boundary
    const safeRepoDir = repoDir.endsWith(path.sep) ? repoDir : repoDir + path.sep;
    if (!targetFile.startsWith(safeRepoDir) && targetFile !== repoDir) {
      return NextResponse.json({ error: 'Access Denied: Path traversal detected.' }, { status: 403 });
    }

    if (!fs.existsSync(targetFile)) {
      return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 });
    }

    const stat = fs.statSync(targetFile);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: 'Requested path is a directory' }, { status: 400 });
    }

    const ext = path.extname(targetFile).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff'].includes(ext);

    // Don't read files larger than 10MB for images, 1MB for text files
    const sizeLimit = isImage ? 10 * 1024 * 1024 : 1 * 1024 * 1024;
    if (stat.size > sizeLimit) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    if (isImage) {
      const contentType = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.bmp': 'image/bmp',
        '.tiff': 'image/tiff'
      }[ext] || 'application/octet-stream';

      const fileBuffer = fs.readFileSync(targetFile);
      return new Response(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    const content = fs.readFileSync(targetFile, 'utf-8');

    return NextResponse.json({
      repoId,
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
      content
    });
  } catch (error: any) {
    console.error('Error in file route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
