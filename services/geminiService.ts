/**
 * Converts an image file from a URL to a base64 string.
 * This is a workaround for CORS issues when loading images from external domains onto a canvas.
 */
export async function urlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}. Status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function replaceBackground(
  carImageB64: string,
  backgroundImageB64: string | null,
  prompt: string
): Promise<string> {
  const response = await fetch('/api/replace-background', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      carImageB64,
      backgroundImageB64,
      prompt,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }

  // For testing - return a placeholder
  if (data.message) {
    console.log('API Test Response:', data);
    throw new Error('API is working but image generation is not implemented yet');
  }

  return data.image;
}