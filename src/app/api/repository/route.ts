import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoId = searchParams.get('repoId');

    if (!repoId) {
      const allRepos = Storage.getRepositories();
      return NextResponse.json(allRepos);
    }

    const metadata = Storage.getRepository(repoId);

    if (!metadata) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error('Error fetching repository metadata:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
