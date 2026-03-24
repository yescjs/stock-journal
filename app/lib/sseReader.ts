// Shared SSE (Server-Sent Events) stream reader utility
// Used by useAIAnalysis and useAIChat hooks

export async function readSSEStream(
  response: Response,
  onChunk: (fullText: string) => void,
  onMeta?: (meta: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.meta && onMeta) {
              onMeta(parsed.meta);
              continue;
            }
            if (parsed.chunk) {
              fullText += parsed.chunk;
              onChunk(fullText);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== data) throw e;
          }
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) {
      // Aborted by user — return partial content
      return fullText;
    }
    throw err;
  }

  return fullText;
}
