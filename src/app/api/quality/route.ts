import { NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get('repoId');

  if (!repoId) {
    return NextResponse.json({ error: 'Missing repoId' }, { status: 400 });
  }

  const index = Storage.getIndex(repoId);
  const metadata = Storage.getRepository(repoId);
  
  if (!index || !metadata) {
    return NextResponse.json({ error: 'Repository not found or not parsed' }, { status: 404 });
  }

  const files = index.files;
  
  if (files.length === 0) {
    return NextResponse.json({
      averageComplexity: 0,
      averageMaintainability: 0,
      filesWithIssues: 0,
      criticalFiles: 0,
      totalFiles: 0,
      topSmells: [],
      largestFiles: []
    });
  }

  let totalComplexity = 0;
  let totalMaintainability = 0;
  let filesWithIssues = 0;
  let criticalFiles = 0;

  const smellCounts: Record<string, number> = {};

  const sortedByComplexity = [...files].sort((a, b) => (b.complexityScore || 0) - (a.complexityScore || 0));
  const sortedBySize = [...files].sort((a, b) => b.size - a.size);

  files.forEach(file => {
    totalComplexity += (file.complexityScore || 0);
    totalMaintainability += (file.maintainabilityScore || 100);
    
    if (file.smells && file.smells.length > 0) {
      filesWithIssues++;
      file.smells.forEach(smell => {
        smellCounts[smell.type] = (smellCounts[smell.type] || 0) + 1;
        if (smell.severity === 'critical') {
          criticalFiles++;
        }
      });
    }
  });

  const averageComplexity = Math.round(totalComplexity / files.length);
  const averageMaintainability = Math.round(totalMaintainability / files.length);
  const overallQualityScore = averageMaintainability; // simple approximation

  const topSmells = Object.entries(smellCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const largestFiles = sortedBySize.slice(0, 5).map(f => ({
    name: f.name,
    path: f.path,
    size: f.size
  }));

  const mostComplexFiles = sortedByComplexity.slice(0, 5).map(f => ({
    name: f.name,
    path: f.path,
    complexityScore: f.complexityScore
  }));

  // New Analytics Calculation
  let totalDuplicateLines = 0;
  let totalDuplicateBlocks = 0;
  let securityCritical = 0;
  let securityHigh = 0;
  let securityMedium = 0;
  let totalLocForOriginality = 0;

  const folderStatsMap: Record<string, { files: number; loc: number; complexitySum: number }> = {};
  
  let smallestFile = sortedBySize[sortedBySize.length - 1];
  let totalSize = 0;

  files.forEach(file => {
    // Originality
    if (file.loc) totalLocForOriginality += file.loc;
    totalDuplicateLines += (file.duplicateLines || 0);
    totalDuplicateBlocks += (file.duplicateBlocks || 0);

    // Security
    if (file.securityIssues) {
      securityCritical += file.securityIssues.critical;
      securityHigh += file.securityIssues.high;
      securityMedium += file.securityIssues.medium;
    }

    // Folder Stats
    const folder = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '/';
    if (!folderStatsMap[folder]) folderStatsMap[folder] = { files: 0, loc: 0, complexitySum: 0 };
    folderStatsMap[folder].files++;
    folderStatsMap[folder].loc += (file.loc || 0);
    folderStatsMap[folder].complexitySum += (file.complexityScore || 1);

    totalSize += file.size;
  });

  const duplicateCodePercent = totalLocForOriginality > 0 ? Math.round((totalDuplicateLines / totalLocForOriginality) * 100) : 0;
  
  const folderStats = Object.entries(folderStatsMap)
    .map(([name, stats]) => ({
      name,
      files: stats.files,
      loc: stats.loc,
      avgComplexity: Math.round(stats.complexitySum / stats.files)
    }))
    .sort((a, b) => b.files - a.files)
    .slice(0, 20); // Top 20 folders

  const avgFileSize = files.length > 0 ? Math.round(totalSize / files.length) : 0;

  return NextResponse.json({
    overallQualityScore,
    averageComplexity,
    averageMaintainability,
    filesWithIssues,
    criticalFiles,
    totalFiles: files.length,
    topSmells,
    largestFiles,
    mostComplexFiles,
    security: {
      critical: securityCritical,
      high: securityHigh,
      medium: securityMedium
    },
    originality: {
      duplicatePercent: duplicateCodePercent,
      duplicateLines: totalDuplicateLines,
      duplicateBlocks: totalDuplicateBlocks,
      similarFilesCount: 0 // Mocking similar files as it needs cross-file diffing which is too heavy
    },
    folderStats,
    repoSizeStats: {
      smallestFile: smallestFile ? { name: smallestFile.name, size: smallestFile.size } : null,
      avgFileSize
    },
    meta: {
      gitStats: metadata?.gitStats,
      projectStats: metadata?.projectStats,
      languages: metadata?.languages,
      sizeBytes: metadata?.sizeBytes
    }
  });
}
