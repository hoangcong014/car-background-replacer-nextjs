import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality, Part } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { carImageB64, backgroundImageB64, prompt } = await request.json();

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

    // Retry logic for 503 errors
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image-preview',
          contents: { parts },
        });

        if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              return NextResponse.json({ image: part.inlineData.data });
            }
          }
        }

        throw new Error("No image was generated in the response.");
      } catch (error: any) {
        if (error.status === 503 && retries > 1) {
          retries--;
          console.log(`Retrying... ${retries} attempts left`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          continue;
        }
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Error replacing background:', error);
    
    // More detailed error handling
    if (error.status === 503) {
      return NextResponse.json(
        { error: 'Gemini API is temporarily unavailable. Please try again in a few moments.' },
        { status: 503 }
      );
    } else if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your GEMINI_API_KEY.' },
        { status: 401 }
      );
    } else {
      return NextResponse.json(
        { error: `Failed to replace background: ${error.message}` },
        { status: 500 }
      );
    }
  }
}