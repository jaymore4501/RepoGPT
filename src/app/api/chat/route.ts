import { NextRequest } from 'next/server';
import { Storage } from '@/lib/storage';
import { LocalVectorIndex, checkOllamaRunning, queryOllama, generateLocalFallbackResponse } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const { repoId, query, model = 'deepseek-coder' } = await req.json();

    if (!repoId || !query) {
      return new Response(JSON.stringify({ error: 'Repository ID and query are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Direct clean status ping
    if (query === 'ping-ollama-status-check') {
      const isOllamaOnline = await checkOllamaRunning();
      return new Response(JSON.stringify({ online: isOllamaOnline }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const metadata = Storage.getRepository(repoId);
    const index = Storage.getIndex(repoId);

    if (!metadata || !index) {
      return new Response(JSON.stringify({ error: 'Repository not found or not yet analyzed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Retrieve relevant code chunks
    const vectorIndex = new LocalVectorIndex(index.chunks);
    const searchResults = vectorIndex.search(query, 6);

    // Save user message to chat history
    Storage.saveChatMessage(repoId, {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    });

    // 2. Check if local Ollama is active
    const isOllamaOnline = await checkOllamaRunning();
    
    // Create reference file list to save and send to client
    const references = Array.from(new Set(searchResults.map(r => r.chunk.filePath)));

    if (isOllamaOnline) {
      console.log(`Ollama is online! Querying model "${model}"...`);

      // Prepare context for LLM
      const contextText = searchResults.map((res, i) => {
        return `[Snippet #${i+1}] File: ${res.chunk.filePath} (Lines ${res.chunk.startLine}-${res.chunk.endLine})\nCode:\n${res.chunk.code}`;
      }).join('\n\n');

      const systemPrompt = `You are a Senior AI Software Engineer analyzing the codebase for "${metadata.name}".
You are provided with relevant code snippets from the codebase for context.

Ecosystem/Tech Stack: ${metadata.techStack.join(', ')}
File Count: ${metadata.fileCount}

CONTEXT SNIPPETS:
${contextText}

INSTRUCTIONS:
1. Base your answer on the provided codebase context snippets and project architecture.
2. Be highly technical, precise, and reference actual files and functions (use markdown links, e.g. [\`auth.ts\`]\(file:///auth.ts\)).
3. Include clear code examples and step-by-step logic explanations.
4. If you cannot answer based on the context, state it clearly. Do not make up file paths that do not exist.
5. Focus on onboarding clarity and help the user understand the codebase flow.`;

      try {
        const ollamaRes = await queryOllama(query, systemPrompt, model);

        if (!ollamaRes.ok) {
          throw new Error(`Ollama returned status ${ollamaRes.status}`);
        }

        // Stream the Ollama response
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = ollamaRes.body?.getReader();

        const stream = new ReadableStream({
          async start(controller) {
            let assistantContent = '';
            
            // Send reference files first as a metadata event
            controller.enqueue(encoder.encode(`__METADATA__:${JSON.stringify({ references })}\n`));

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
                      assistantContent += content;
                      controller.enqueue(encoder.encode(content));
                    }
                  } catch (e) {
                    // Skip parse errors for incomplete JSON lines
                  }
                }
              }

              // Process any remaining content in buffer
              if (buffer.trim()) {
                try {
                  const parsed = JSON.parse(buffer);
                  const content = parsed.message?.content || '';
                  if (content) {
                    assistantContent += content;
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {}
              }

              // Save assistant's answer in background history
              Storage.saveChatMessage(repoId, {
                id: Math.random().toString(36).substring(7),
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date().toISOString(),
                references
              });
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

      } catch (err) {
        console.error('Ollama connection failed during query, falling back to local indexing agent...', err);
      }
    }

    // 3. FALLBACK: Local high-fidelity indexing agent response
    console.log('Ollama is offline or failed, executing local fallback agent...');
    const fallbackText = generateLocalFallbackResponse(query, metadata, searchResults, index);

    // Save assistant message to chat history
    Storage.saveChatMessage(repoId, {
      id: Math.random().toString(36).substring(7),
      role: 'assistant',
      content: fallbackText,
      timestamp: new Date().toISOString(),
      references
    });

    // Stream the fallback response using a high-performance chunked stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send references first
        controller.enqueue(encoder.encode(`__METADATA__:${JSON.stringify({ references })}\n`));

        const chunkSize = 2000; // Send 2000 characters per tick for immediate responsiveness
        let position = 0;

        const interval = setInterval(() => {
          if (position >= fallbackText.length) {
            clearInterval(interval);
            controller.close();
            return;
          }

          const end = Math.min(position + chunkSize, fallbackText.length);
          const slice = fallbackText.substring(position, end);
          controller.enqueue(encoder.encode(slice));
          position = end;
        }, 10);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });

  } catch (error: any) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
