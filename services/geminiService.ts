/**
 * Converts an image file from a URL to a base64 string.
 * Uses a proxy API to avoid CORS issues.
 */
export async function urlToBase64(url: string): Promise<string> {
    try {
        // Use our proxy API to avoid CORS issues
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl, {
            cache: 'no-cache',
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch image via proxy. Status: ${response.status}`);
        }
        
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to convert image to base64'));
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error in urlToBase64:', error);
        throw new Error(`Failed to load image from ${url}. This might be due to network issues or invalid URL.`);
    }
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

  // If we got an actual image
  if (data.image) {
    return data.image;
  }

  // If we only got a description, show it to user
  if (data.description) {
    throw new Error(`Image generation not available. AI described the edit: ${data.description}`);
  }

  throw new Error('No image or description received');
}