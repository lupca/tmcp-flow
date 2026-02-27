export async function streamSseEvents(response, onEvent, onParseError) {
  if (!response?.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        onEvent?.(event);
      } catch (error) {
        if (onParseError) {
          onParseError(error, line);
        } else {
          console.warn('SSE parse error:', error, line);
        }
      }
    }
  }
}
