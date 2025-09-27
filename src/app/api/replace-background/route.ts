import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality, Part } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Cấu hình timeout và retry
const REQUEST_TIMEOUT = 60000; // 60 giây
const MAX_RETRIES = 3;
const BASE_DELAY = 5000; // 5 giây base delay
const MAX_DELAY = 30000; // 30 giây max delay

interface ApiError extends Error {
  status?: number;
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error occurred';
}

function getErrorStatus(error: unknown): number | undefined {
  return isApiError(error) ? error.status : undefined;
}

// Tính toán delay với exponential backoff và jitter
function calculateDelay(attempt: number): number {
  const exponentialDelay = Math.min(BASE_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
  // Thêm jitter (random factor) để tránh thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.floor(exponentialDelay + jitter);
}

// Kiểm tra xem lỗi có thể retry được không
function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();
  
  return (
    status === 503 || // Service Unavailable
    status === 502 || // Bad Gateway
    status === 504 || // Gateway Timeout
    status === 429 || // Too Many Requests
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection')
  );
}

// Promise với timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

// Gemini API call với retry logic
async function generateContentWithRetry(parts: Part[]): Promise<string> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Generating content - Attempt ${attempt}/${MAX_RETRIES}`);
      
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-2.5-flash-image-preview',
          contents: { parts },
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        }),
        REQUEST_TIMEOUT
      );

      // Validate response structure
      if (!response.candidates || 
          response.candidates.length === 0 || 
          !response.candidates[0].content || 
          !response.candidates[0].content.parts) {
        throw new Error("Invalid response structure from Gemini API");
      }

      // Extract image data
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log(`Successfully generated content on attempt ${attempt}`);
          return part.inlineData.data;
        }
      }

      throw new Error("No image was generated in the response");
      
    } catch (error: unknown) {
      lastError = error;
      const errorMessage = getErrorMessage(error);
      const errorStatus = getErrorStatus(error);
      
      console.error(`Attempt ${attempt} failed:`, errorMessage);
      
      // Nếu không phải lỗi có thể retry, throw ngay
      if (!isRetryableError(error)) {
        console.error(`Non-retryable error (${errorStatus}):`, errorMessage);
        throw error;
      }
      
      // Nếu đã hết lần retry, throw error cuối cùng
      if (attempt === MAX_RETRIES) {
        console.error(`All ${MAX_RETRIES} attempts failed`);
        throw error;
      }
      
      // Tính toán thời gian delay và chờ
      const delay = calculateDelay(attempt);
      console.log(`Waiting ${delay}ms before retry ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('Starting background replacement request');
    
    const { carImageB64, backgroundImageB64, prompt } = await request.json();

    // Validate input
    if (!carImageB64 || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: carImageB64 and prompt are required' },
        { status: 400 }
      );
    }

    const carImagePart: Part = {
      inlineData: {
        mimeType: 'image/png',
        data: carImageB64,
      },
    };

    const parts: Part[] = [carImagePart];

    if (backgroundImageB64) {
      const backgroundImagePart: Part = {
        inlineData: {
          mimeType: 'image/png',
          data: backgroundImageB64,
        },
      };
      parts.push(backgroundImagePart);
    }

    const textPrompt = `You are an expert automotive photo editor. 
    Your task is to replace ONLY the background of the primary car image.
    ${backgroundImageB64 ? 'Use the SECOND image as a direct reference and inspiration for the new background, blending its style and content seamlessly.' : ''}
    The new background must match this description: "${prompt}".
    Crucially, the car in the foreground must remain completely untouched and unchanged. Preserve all original details, lighting, reflections on the car, and its physical form.
    Integrate the car into the new background by generating realistic, natural, and cinematic lighting, and ensure the ground shadows under the car are contextually appropriate for the new scene.
    Output only the final edited image. Do not output any text.`;

    parts.push({ text: textPrompt });

    const imageData = await generateContentWithRetry(parts);
    
    const duration = Date.now() - startTime;
    console.log(`Background replacement completed in ${duration}ms`);
    
    return NextResponse.json({ 
      image: imageData,
      metadata: {
        processingTime: duration,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`Background replacement failed after ${duration}ms:`, error);
    
    const errorMessage = getErrorMessage(error);
    const errorStatus = getErrorStatus(error);
    
    // Detailed error responses
    if (errorMessage.includes('timed out')) {
      return NextResponse.json(
        { 
          error: `Request timed out after ${REQUEST_TIMEOUT / 1000} seconds. The image processing is taking longer than expected.`,
          code: 'TIMEOUT_ERROR',
          processingTime: duration
        },
        { status: 408 }
      );
    } else if (errorStatus === 503) {
      return NextResponse.json(
        { 
          error: 'Gemini API is temporarily overloaded. Please try again in a few minutes.',
          code: 'SERVICE_UNAVAILABLE',
          processingTime: duration
        },
        { status: 503 }
      );
    } else if (errorStatus === 401) {
      return NextResponse.json(
        { 
          error: 'Invalid API key. Please check your GEMINI_API_KEY configuration.',
          code: 'AUTH_ERROR',
          processingTime: duration
        },
        { status: 401 }
      );
    } else if (errorStatus === 429) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before making another request.',
          code: 'RATE_LIMIT_ERROR',
          processingTime: duration
        },
        { status: 429 }
      );
    } else {
      return NextResponse.json(
        { 
          error: `Failed to replace background: ${errorMessage}`,
          code: 'PROCESSING_ERROR',
          processingTime: duration
        },
        { status: 500 }
      );
    }
  }
}