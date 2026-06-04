import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { parseRepository } from '@/lib/parser';
import { Storage } from '@/lib/storage';

// Helper to execute terminal commands as a Promise
function execPromise(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { url, clientId } = await req.json();
    const clientIdentifier = clientId || 'guest-global';

    if (!url) {
      return NextResponse.json({ error: 'GitHub repository URL is required' }, { status: 400 });
    }

    // Validate GitHub URL
    const githubRegex = /^https:\/\/github\.com\/[\w\-._]+\/[\w\-._]+(?:\.git)?\/?$/;
    if (!githubRegex.test(url.trim())) {
      return NextResponse.json({ error: 'Invalid GitHub URL. Must be a valid public GitHub repository URL.' }, { status: 400 });
    }

    // Clean URL and create ID
    const cleanedUrl = url.trim().replace(/\/$/, '');
    const urlParts = cleanedUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1].replace(/\.git$/, '');
    const repoId = `${owner}-${repo}`.toLowerCase();

    // Instant bypass if repository has already been parsed and indexed
    const existingRepo = Storage.getRepository(repoId);
    if (existingRepo) {
      console.log(`Repository ${repoId} already analyzed. Bypassing cloning and parsing entirely.`);
      return NextResponse.json({
        success: true,
        repoId,
        metadata: existingRepo
      });
    }

    // Check rate limit (Max 5 scans per 24 hours per client)
    const scanCount = Storage.getRecentScanCount(clientIdentifier);
    if (scanCount >= 5) {
      return NextResponse.json({
        error: 'Daily scan limit reached. You can only scan up to 5 new repositories per 24 hours. Please try again tomorrow!'
      }, { status: 429 });
    }

    const tempDir = process.env.TEMP_DIR || (process.env.RENDER === 'true' ? '/tmp/temp_repos' : path.join(process.cwd(), 'temp_repos'));
    const repoDir = path.join(tempDir, repoId);

    // Create temp_repos directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Clone or use existing
    let isCloned = false;
    if (fs.existsSync(repoDir)) {
      console.log(`Repository already exists at ${repoDir}, parsing existing files...`);
      isCloned = true;
    } else {
      console.log(`Cloning repository ${url} to ${repoDir}...`);
      try {
        await execPromise(`git clone --depth 1 --single-branch --no-tags --filter=blob:none -- ${cleanedUrl} ${repoId}`, tempDir);
        isCloned = true;
      } catch (err: any) {
        console.error('Git clone error:', err);
        return NextResponse.json({ 
          error: `Failed to clone repository. Make sure the repository is public and accessible. Details: ${err.message || err}` 
        }, { status: 500 });
      }
    }

    if (isCloned) {
      console.log(`Parsing repository ${repoId}...`);
      const { metadata, index } = await parseRepository(repoDir, repoId, cleanedUrl);

      // Save to storage
      Storage.saveRepository(metadata);
      Storage.saveIndex(repoId, index);

      // Record successful new scan
      Storage.recordScan(clientIdentifier, repoId);

      return NextResponse.json({ 
        success: true, 
        repoId, 
        metadata: {
          id: metadata.id,
          name: metadata.name,
          url: metadata.url,
          analyzedAt: metadata.analyzedAt,
          techStack: metadata.techStack,
          languages: metadata.languages,
          fileCount: metadata.fileCount,
          sizeBytes: metadata.sizeBytes
        }
      });
    }

    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  } catch (error: any) {
    console.error('Error in analyze route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }
    const count = Storage.getRecentScanCount(clientId);
    return NextResponse.json({ count, limit: 5 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
