import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoId = searchParams.get('repoId');
    const type = searchParams.get('type'); // summary, setup, api, onboarding

    if (!repoId || !type) {
      return NextResponse.json({ error: 'repoId and type search parameters are required' }, { status: 400 });
    }

    const metadata = Storage.getRepository(repoId);

    if (!metadata) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    let content = '';
    let title = '';

    switch (type) {
      case 'summary':
        content = metadata.summary;
        title = 'Repository Summary';
        break;
      case 'setup':
        content = metadata.setupInstructions;
        title = 'Setup Guide';
        break;
      case 'api':
        content = metadata.apiDocs;
        title = 'API Reference';
        break;
      case 'onboarding':
        content = metadata.onboardingGuide;
        title = 'Developer Onboarding';
        break;
      default:
        return NextResponse.json({ error: 'Invalid documentation type' }, { status: 400 });
    }

    return NextResponse.json({ repoId, type, title, content });
  } catch (error: any) {
    console.error('Error in docs route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
