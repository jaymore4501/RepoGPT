import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoId = searchParams.get('repoId');

    if (!repoId) {
      return NextResponse.json({ error: 'repoId is required' }, { status: 400 });
    }

    const index = Storage.getIndex(repoId);

    if (!index) {
      return NextResponse.json({ error: 'Repository index not found' }, { status: 404 });
    }

    return NextResponse.json(index.relationships);
  } catch (error: any) {
    console.error('Error fetching visual relationships:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
