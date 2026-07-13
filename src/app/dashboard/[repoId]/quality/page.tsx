'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, AlertTriangle, FileCode2, Zap, ArrowUpRight, BarChart3, Settings, ShieldAlert, ShieldCheck, Copy, GitCommit, GitBranch, Users, Clock, Hash, Code, FileText, Download, HardDrive, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export default function QualityDashboard() {
  const params = useParams();
  const repoId = params.repoId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/quality?repoId=${repoId}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [repoId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <p>Failed to load quality data. Please re-analyze the repository.</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleExport = async (type: string) => {
    if (type === 'pdf') {
      try {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();

        // --- Premium Header Section ---
        // Load Banner Image
        try {
          const response = await fetch('/Report%20Banner.png');
          if (response.ok) {
            const blob = await response.blob();
            const bannerBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            doc.addImage(bannerBase64, 'PNG', 0, 0, 210, 45);
          } else {
            throw new Error('Banner not found');
          }
        } catch (e) {
          console.error("Failed to load banner image, falling back to solid color", e);
          doc.setFillColor(15, 23, 42); // slate-900
          doc.rect(0, 0, 210, 45, 'F');
        }

        // Main Report Title
        doc.setTextColor(255, 255, 255); // white
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Code Quality Intelligence', 14, 20);

        // Repository Name Subtitle
        // Clickable URL styling
        doc.setFontSize(10);
        doc.setTextColor(56, 189, 248); // sky-400
        doc.setFont('helvetica', 'bold');
        const repoUrl = data.meta?.url || `https://github.com/${repoId.replace('-', '/')}`;
        doc.text(`Repository URL: ${repoUrl}`, 14, 32);

        // Right-Aligned Metadata
        doc.setFontSize(10);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text(`Report Generated On: ${new Date().toLocaleDateString()}`, 196, 10, { align: 'right' });

        // --- Executive Summary ---
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont('helvetica', 'bold');
        doc.text('Executive Summary', 14, 58);

        autoTable(doc, {
          startY: 65,
          head: [['Metric', 'Value', 'Metric', 'Value']],
          body: [
            ['Overall Quality Score', `${data.overallQualityScore}/100`, 'Average Complexity', `${data.averageComplexity}`],
            ['Issues Detected', `${data.filesWithIssues} files`, 'Total Files', `${data.totalFiles}`],
            ['Total Lines of Code', `${data.meta?.projectStats?.totalLoc ?? 'N/A'}`, 'Duplicate Code', `${data.originality?.duplicatePercent ?? 0}%`]
          ],
          theme: 'grid',
          headStyles: { fillColor: [56, 189, 248], textColor: 255 }, // Cyan-400
          styles: { font: 'helvetica', fontSize: 10, textColor: [51, 65, 85] } // slate-700
        });

        // --- Security & Originality (With Data Visualization) ---
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Security & Originality', 14, (doc as any).lastAutoTable.finalY + 15);

        let currentY = (doc as any).lastAutoTable.finalY + 25;

        // Security Visualization (Stacked Bar)
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        doc.text('Security Vulnerabilities Breakdown:', 14, currentY);

        const secCrit = data.security?.critical ?? 0;
        const secHigh = data.security?.high ?? 0;
        const secMed = data.security?.medium ?? 0;
        const totalSec = secCrit + secHigh + secMed;

        let secBarX = 14;
        const secBarY = currentY + 5;
        const totalWidth = 180;

        if (totalSec === 0) {
          doc.setFillColor(16, 185, 129); // Emerald
          doc.rect(secBarX, secBarY, totalWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.text('100% Safe', secBarX + totalWidth / 2 - 10, secBarY + 6);
        } else {
          const critW = (secCrit / totalSec) * totalWidth;
          const highW = (secHigh / totalSec) * totalWidth;
          const medW = (secMed / totalSec) * totalWidth;

          if (critW > 0) {
            doc.setFillColor(244, 63, 94); // Rose
            doc.rect(secBarX, secBarY, critW, 8, 'F');
            secBarX += critW;
          }
          if (highW > 0) {
            doc.setFillColor(245, 158, 11); // Amber
            doc.rect(secBarX, secBarY, highW, 8, 'F');
            secBarX += highW;
          }
          if (medW > 0) {
            doc.setFillColor(234, 179, 8); // Yellow
            doc.rect(secBarX, secBarY, medW, 8, 'F');
          }
        }

        // Security Legend
        currentY = secBarY + 16;
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.setFillColor(244, 63, 94); doc.rect(14, currentY, 4, 4, 'F'); doc.text(`Critical (${secCrit})`, 20, currentY + 4);
        doc.setFillColor(245, 158, 11); doc.rect(45, currentY, 4, 4, 'F'); doc.text(`High (${secHigh})`, 51, currentY + 4);
        doc.setFillColor(234, 179, 8); doc.rect(75, currentY, 4, 4, 'F'); doc.text(`Medium (${secMed})`, 81, currentY + 4);
        if (totalSec === 0) {
          doc.setFillColor(16, 185, 129); doc.rect(105, currentY, 4, 4, 'F'); doc.text(`Safe`, 111, currentY + 4);
        }

        // Originality Visualization (Stacked Bar)
        currentY += 15;
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        doc.text('Code Duplication Rate:', 14, currentY);

        const dupPct = data.originality?.duplicatePercent ?? 0;
        const uniqPct = 100 - dupPct;
        const origBarY = currentY + 5;

        const dupW = (dupPct / 100) * totalWidth;
        const uniqW = (uniqPct / 100) * totalWidth;

        if (dupW > 0) {
          doc.setFillColor(59, 130, 246); // Blue
          doc.rect(14, origBarY, dupW, 8, 'F');
        }
        if (uniqW > 0) {
          doc.setFillColor(14, 165, 233); // Light Blue
          doc.rect(14 + dupW, origBarY, uniqW, 8, 'F');
        }

        // Originality Legend
        currentY = origBarY + 16;
        doc.setFontSize(9);
        doc.setFillColor(59, 130, 246); doc.rect(14, currentY, 4, 4, 'F'); doc.text(`Duplicated (${dupPct}%)`, 20, currentY + 4);
        doc.setFillColor(14, 165, 233); doc.rect(55, currentY, 4, 4, 'F'); doc.text(`Unique (${uniqPct}%)`, 61, currentY + 4);

        // Detailed Originality Stats
        doc.text(`Duplicate Lines: ${data.originality?.duplicateLines ?? 0}  |  Duplicate Blocks: ${data.originality?.duplicateBlocks ?? 0}  |  Similar Files: ${data.originality?.similarFilesCount ?? 0}`, 14, currentY + 10);

        (doc as any).lastAutoTable.finalY = currentY + 15;

        // --- Git Analytics & Recent Activity ---
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Repository Analytics & Activity', 14, (doc as any).lastAutoTable.finalY + 15);

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['Contributors', 'Total Commits', 'Active Branches', 'Latest Commit Date', 'Latest Committer']],
          body: [[
            `${data.meta?.gitStats?.contributors ?? 'N/A'}`,
            `${data.meta?.gitStats?.commits ?? 'N/A'}`,
            `${data.meta?.gitStats?.branches ?? 'N/A'} (${data.meta?.gitStats?.currentBranch ?? ''})`,
            data.meta?.gitStats?.lastCommitDate ? new Date(data.meta.gitStats.lastCommitDate).toLocaleDateString() : 'N/A',
            `${data.meta?.gitStats?.lastCommitAuthor ?? 'N/A'}`
          ]],
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] } // Emerald-500
        });

        // --- Repository Size & Meta ---
        currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Repository Size & Metadata', 14, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Total Size', 'Smallest File', 'Average File Size', 'Indexed At']],
          body: [[
            formatSize(data.meta?.sizeBytes),
            `${data.repoSizeStats?.smallestFile?.name ?? 'N/A'} (${formatSize(data.repoSizeStats?.smallestFile?.size)})`,
            formatSize(data.repoSizeStats?.avgFileSize),
            data.meta?.analyzedAt ? new Date(data.meta.analyzedAt).toLocaleString() : 'N/A'
          ]],
          theme: 'grid',
          headStyles: { fillColor: [249, 115, 22] } // Orange-500
        });

        // --- Language Distribution (Data Visualization) ---
        currentY = (doc as any).lastAutoTable.finalY + 15;
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Language Distribution', 14, currentY);

        const langData = data.meta?.languages ? Object.entries(data.meta.languages).map(([name, value]) => ({ name, value: value as number })) : [];
        if (langData.length > 0) {
          const totalPercentage = 100; // It's already in percentage 0-100
          let barY = currentY + 10;

          const barColors = [[139, 92, 246], [6, 182, 212], [16, 185, 129], [245, 158, 11], [239, 68, 68]];

          langData.forEach((lang, idx) => {
            if (barY > 280) {
              doc.addPage();
              barY = 20;
            }
            const percentage = lang.value;
            const barWidth = Math.max(1, (percentage / 100) * 150); // Max width 150

            // Draw Label
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            doc.text(`${lang.name} (${percentage.toFixed(1)}%)`, 14, barY + 4);

            // Draw Bar
            const color = barColors[idx % barColors.length];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(50, barY, barWidth, 6, 'F');

            // Draw Size Text
            doc.text(`${percentage.toFixed(1)}%`, 50 + barWidth + 2, barY + 4);

            barY += 10;
          });

          // Update currentY for next sections
          (doc as any).lastAutoTable.finalY = barY + 5;
        } else {
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text('No language data available.', 14, currentY + 8);
          (doc as any).lastAutoTable.finalY = currentY + 15;
        }

        // --- Top Code Smells ---
        if (data.topSmells && data.topSmells.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42);
          doc.text('Top Code Smells', 14, (doc as any).lastAutoTable.finalY + 15);

          autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Smell Type', 'Occurrences']],
            body: data.topSmells.map((s: any) => [s.type, s.count]),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] } // Amber-500
          });
        }

        // --- Most Complex Files ---
        if (data.mostComplexFiles && data.mostComplexFiles.length > 0) {
          let currentY = (doc as any).lastAutoTable.finalY + 15;
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42);
          doc.text('Highest Complexity Files', 14, currentY);

          autoTable(doc, {
            startY: currentY + 5,
            head: [['File Path', 'Complexity Score']],
            body: data.mostComplexFiles.map((f: any) => [f.path, f.complexityScore]),
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241] } // Indigo-500
          });
        }

        // --- Folder Statistics ---
        if (data.folderStats && data.folderStats.length > 0) {
          let currentY = (doc as any).lastAutoTable.finalY + 15;
          if (currentY > 220) {
            doc.addPage();
            currentY = 20;
          }
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42);
          doc.text('Folder Statistics', 14, currentY);

          autoTable(doc, {
            startY: currentY + 5,
            head: [['Folder Name', 'Files', 'Total LOC', 'Avg Complexity']],
            body: data.folderStats.map((f: any) => [f.name === '/' ? 'Root' : f.name, f.files, f.loc, f.avgComplexity]),
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] } // Violet-500
          });
        }

        doc.save(`repogpt-quality-report-${repoId}.pdf`);
      } catch (err) {
        console.error('Failed to export PDF:', err);
        alert('An error occurred while generating the PDF.');
      }
    }
  };

  const langData = data.meta?.languages ? Object.entries(data.meta.languages).map(([name, value]) => ({ name, value })) : [];

  // Create mock historical data for the chart if we only have 1 scan
  const complexityTrendData = [
    { name: 'Jan', complexity: Math.max(1, data.averageComplexity - 5) },
    { name: 'Feb', complexity: Math.max(1, data.averageComplexity - 3) },
    { name: 'Mar', complexity: data.averageComplexity },
  ];

  const locByLangData = langData.map(l => ({ name: l.name, loc: (l.value as number) / 30 })); // approximating loc from bytes for chart

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar" id="dashboard-content">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Code Quality Intelligence
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Actionable insights and maintainability metrics.</p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm text-white font-medium shadow-lg shadow-cyan-500/20 transition-colors">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-xl border ${getScoreBg(data.overallQualityScore)} backdrop-blur-sm flex flex-col justify-between relative overflow-hidden group`}>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-4">
            <Activity className={`w-4 h-4 ${getScoreColor(data.overallQualityScore)}`} /> Overall Quality
          </div>
          <div className={`text-4xl font-bold ${getScoreColor(data.overallQualityScore)}`}>{data.overallQualityScore}<span className="text-lg text-slate-500 font-normal">/100</span></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Issues Detected
          </div>
          <div className="text-3xl font-bold text-slate-200">{data.filesWithIssues} <span className="text-sm font-normal text-slate-500">files</span></div>
          {data.criticalFiles > 0 && (
            <div className="mt-2 text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded inline-block w-max">
              {data.criticalFiles} critical
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-4">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Avg Complexity
          </div>
          <div className="text-3xl font-bold text-slate-200">{data.averageComplexity}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-4">
            <FileCode2 className="w-4 h-4 text-cyan-400" /> Total Files
          </div>
          <div className="text-3xl font-bold text-slate-200">{data.totalFiles}</div>
        </motion.div>
      </div>

      {/* Security Analysis & Code Originality */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">

        {/* Security Analysis */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm flex flex-col">
          <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Security Analysis
          </h3>

          <div className="flex-1 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-1/2 h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Critical', value: data.security?.critical ?? 0, fill: '#f43f5e' },
                      { name: 'High', value: data.security?.high ?? 0, fill: '#f59e0b' },
                      { name: 'Medium', value: data.security?.medium ?? 0, fill: '#eab308' },
                      { name: 'Safe', value: (data.security?.critical === 0 && data.security?.high === 0 && data.security?.medium === 0) ? 1 : 0, fill: '#10b981' }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#cbd5e1' }} itemStyle={{ color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-200">
                  {Math.max(0, 100 - ((data.security?.critical ?? 0) * 10 + (data.security?.high ?? 0) * 5 + (data.security?.medium ?? 0) * 2))}%
                </span>
                <span className="text-xs text-slate-500 font-medium">Secure</span>
              </div>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-sm font-semibold text-rose-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-400"></div>Critical</span>
                <span className="text-xl font-bold text-slate-200">{data.security?.critical ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-sm font-semibold text-amber-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div>High</span>
                <span className="text-xl font-bold text-slate-200">{data.security?.high ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-sm font-semibold text-yellow-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div>Medium</span>
                <span className="text-xl font-bold text-slate-200">{data.security?.medium ?? 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {(data.security?.critical === 0 && data.security?.high === 0 && data.security?.medium === 0) ? (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-sm">
                <ShieldCheck className="w-4 h-4" /> No obvious security vulnerabilities detected.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 bg-slate-800/30 p-3 rounded-lg border border-slate-800/50 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Found {(data.security?.critical || 0) + (data.security?.high || 0) + (data.security?.medium || 0)} potential security issues.
              </div>
            )}
          </div>
        </motion.div>

        {/* Code Originality */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm flex flex-col">
          <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <Copy className="w-4 h-4 text-cyan-400" /> Code Originality
          </h3>

          <div className="flex-1 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-1/2 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Duplicated Code', value: data.originality?.duplicatePercent ?? 0, fill: '#3b82f6' },
                      { name: 'Unique Code', value: 100 - (data.originality?.duplicatePercent ?? 0), fill: '#0ea5e9' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    startAngle={180}
                    endAngle={0}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#cbd5e1' }} itemStyle={{ color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center -mt-16">
                <span className="text-3xl font-bold text-slate-200">{data.originality?.duplicatePercent ?? 0}%</span>
                <span className="block text-xs text-slate-500 mt-1">Duplication Rate</span>
              </div>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-sm font-semibold text-slate-400">Duplicate Lines</span>
                <span className="text-xl font-bold text-slate-200">{data.originality?.duplicateLines ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-sm font-semibold text-slate-400">Duplicate Blocks</span>
                <span className="text-xl font-bold text-slate-200">{data.originality?.duplicateBlocks ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-sm font-semibold text-slate-400">Similar Files</span>
                <span className="text-xl font-bold text-slate-200">{data.originality?.similarFilesCount ?? 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-400 bg-slate-800/30 p-3 rounded-lg border border-slate-800/50">
            {data.originality?.duplicatePercent < 10 ? 'Excellent! No significant code duplication found.' : 'High code duplication detected. Consider refactoring.'}
          </div>
        </motion.div>
      </div>

      {/* Project Statistics & Git Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

        {/* Project Statistics */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <Hash className="w-4 h-4 text-indigo-400" /> Project Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
              <span className="text-slate-400 text-sm">Total Lines of Code</span>
              <span className="text-slate-200 font-bold">{data.meta?.projectStats?.totalLoc ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
              <span className="text-slate-400 text-sm">Total Blank Lines</span>
              <span className="text-slate-200 font-bold">{data.meta?.projectStats?.totalBlank ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
              <span className="text-slate-400 text-sm">Total Comment Lines</span>
              <span className="text-slate-200 font-bold">{data.meta?.projectStats?.totalComments ?? 'N/A'}</span>
            </div>
          </div>
        </motion.div>

        {/* Git Repository Analytics */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" /> Git Repository Analytics
          </h3>
          {data.meta?.gitStats?.error ? (
            <div className="flex h-32 items-center justify-center text-slate-400 text-sm">
              Git repository not found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Contributors</span>
                <span className="text-xl font-bold text-slate-200">{data.meta?.gitStats?.contributors ?? 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1"><GitCommit className="w-3 h-3" /> Commits</span>
                <span className="text-xl font-bold text-slate-200">{data.meta?.gitStats?.commits ?? 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1"><GitBranch className="w-3 h-3" /> Branches</span>
                <span className="text-xl font-bold text-slate-200">{data.meta?.gitStats?.branches ?? 'N/A'} ({data.meta?.gitStats?.currentBranch})</span>
              </div>
              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap">
                <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Last Commit</span>
                <span className="text-sm font-bold text-slate-200 truncate">{data.meta?.gitStats?.lastCommitAuthor ?? 'N/A'}</span>
                <div className="text-xs text-slate-500 truncate">{data.meta?.gitStats?.lastCommitDate ? new Date(data.meta.gitStats.lastCommitDate).toLocaleDateString() : ''}</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Language Distribution & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

        {/* Language Distribution */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-pink-400" /> Language Distribution
          </h3>
          <div className="flex items-center justify-center h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={langData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {langData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => [formatSize(value), 'Size']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {langData.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-slate-300">{l.name}</span>
                </div>
                <span className="text-slate-500">{formatSize(l.value as number)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Complexity Trend Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <LineChart className="w-4 h-4 text-cyan-400" /> Complexity Trend
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={complexityTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#cbd5e1' }} />
                <Line type="monotone" dataKey="complexity" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>

      {/* Folder Statistics & Repository Size */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

        {/* Folder Statistics */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-violet-400" /> Folder Statistics
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Folder Name</th>
                  <th className="px-4 py-3 font-semibold text-right">Files</th>
                  <th className="px-4 py-3 font-semibold text-right">LOC</th>
                  <th className="px-4 py-3 font-semibold text-right">Avg Complexity</th>
                </tr>
              </thead>
              <tbody>
                {(data.folderStats || []).map((f: any, i: number) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-300 truncate max-w-[150px]">{f.name === '/' ? 'Root' : f.name}</td>
                    <td className="px-4 py-3 text-right">{f.files}</td>
                    <td className="px-4 py-3 text-right">{f.loc}</td>
                    <td className="px-4 py-3 text-right">{f.avgComplexity}</td>
                  </tr>
                ))}
                {(!data.folderStats || data.folderStats.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No folder data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Repository Size */}
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-orange-400" /> Repository Size
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Total Size</span>
                <span className="text-slate-200 font-bold">{formatSize(data.meta?.sizeBytes)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Largest File</span>
                <span className="text-slate-200 font-bold truncate max-w-[200px] text-right" title={data.repoSizeStats?.smallestFile?.name}>{data.repoSizeStats?.smallestFile?.name ?? 'N/A'} ({formatSize(data.repoSizeStats?.smallestFile?.size)})</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Average File Size</span>
                <span className="text-slate-200 font-bold">{formatSize(data.repoSizeStats?.avgFileSize)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Recent Activity
            </h3>
            <div className="space-y-4">
              {data.meta?.gitStats?.error ? (
                <p className="text-slate-500 text-sm">Git repository not found. Activity unavailable.</p>
              ) : (
                <>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 text-sm">Latest Commit Date</span>
                    <span className="text-slate-200 text-sm">{data.meta?.gitStats?.lastCommitDate ? new Date(data.meta.gitStats.lastCommitDate).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 text-sm">Latest Committer</span>
                    <span className="text-slate-200 text-sm">{data.meta?.gitStats?.lastCommitAuthor ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 text-sm">Current Branch</span>
                    <span className="text-cyan-400 text-sm font-mono">{data.meta?.gitStats?.currentBranch ?? 'N/A'}</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Smells */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Top Code Smells
            </h3>
            <div className="space-y-3">
              {data.topSmells.length === 0 ? (
                <p className="text-slate-500 text-sm">No code smells detected. Great job!</p>
              ) : (
                data.topSmells.map((smell: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-800/50">
                    <span className="text-slate-300 text-sm font-medium">{smell.type}</span>
                    <span className="text-slate-400 text-xs bg-slate-800 px-2 py-1 rounded">{smell.count} occurrences</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Most Complex Files */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-rose-400" /> Highest Complexity Files
            </h3>
            <div className="space-y-3">
              {data.mostComplexFiles.length === 0 ? (
                <p className="text-slate-500 text-sm">No files analyzed.</p>
              ) : (
                data.mostComplexFiles.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-800/50">
                    <div className="flex flex-col truncate pr-4">
                      <span className="text-slate-300 text-sm font-medium truncate">{f.name}</span>
                      <span className="text-slate-500 text-xs truncate">{f.path}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-rose-400 font-bold">{f.complexityScore}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

      </div>

    </div>
  );
}
