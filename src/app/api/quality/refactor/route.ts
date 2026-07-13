import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { checkOllamaRunning, queryOllama } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const { repoId, filePath, smell, code } = await req.json();

    if (!repoId || !filePath || !smell || !code) {
      return NextResponse.json({ error: 'repoId, filePath, smell, and code are required' }, { status: 400 });
    }

    const metadata = Storage.getRepository(repoId);
    if (!metadata) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const isOllamaOnline = await checkOllamaRunning();
    
    if (!isOllamaOnline) {
       // Return a rule-based fallback response if offline
       const fallbackMessage = `**Offline Mode - Rule-Based Suggestion**
       
The detected issue is **${smell.type}** in \`${filePath}\`.
       
**Explanation:** ${smell.description}
**Recommended refactor:** ${smell.recommendation}

*Note: Connect to Ollama for dynamic, context-aware AI refactoring suggestions.*`;
       
       return new Response(fallbackMessage, {
         status: 200,
         headers: { 'Content-Type': 'text/plain; charset=utf-8' }
       });
    }

    const systemPrompt = `You are a Senior AI Software Engineer refactoring code.
You are given a file from a project (${metadata.name}) and a specific code smell detected by static analysis.

File: ${filePath}
Smell Type: ${smell.type}
Description: ${smell.description}
Recommendation: ${smell.recommendation}

Provide a structured refactoring suggestion containing:
1. Problem Explanation
2. Why it matters
3. Recommended refactor (with clear before/after code blocks)
4. Expected benefit (Estimated reduction in complexity & coupling)
5. Severity & Confidence

Code Snippet:
\`\`\`
${code}
\`\`\`

Format your response nicely using Markdown.`;

    const ollamaRes = await queryOllama(`Provide a refactoring suggestion for the ${smell.type} smell in ${filePath}`, systemPrompt, 'deepseek-coder');

    if (!ollamaRes.ok) {
      throw new Error(`Ollama returned status ${ollamaRes.status}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = ollamaRes.body?.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                const content = parsed.message?.content || '';
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {}
            }
          }

          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              const content = parsed.message?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch (e) {}
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });

  } catch (error: any) {
    console.error('Error in quality refactor route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
