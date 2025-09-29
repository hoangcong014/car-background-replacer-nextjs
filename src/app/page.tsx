'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ImageUploader } from '../../components/ImageUploader';
import { replaceBackground, urlToBase64 } from '../../services/geminiService';

const DEFAULT_CAR_IMAGE_URL = process.env.NEXT_PUBLIC_DEFAULT_CAR_IMAGE_URL || 'https://alexandria-projects-aqua-oriental.trycloudflare.com/screenshots/911.jpg';
const DEFAULT_BACKGROUND_IMAGE_URL = process.env.NEXT_PUBLIC_DEFAULT_BACKGROUND_IMAGE_URL || 'https://resource-3.vcat.ai/resource/preset/imagine/nature/3001.png';
const DEFAULT_PROMPT = "hoàng hôn ấm, cinematic, đường phố Hồ Chí Minh mưa nhẹ";

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

export default function HomePage() {
  const searchParams = useSearchParams();
  
  const [carImage, setCarImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDefaultsLoading, setIsDefaultsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDefaults = useCallback(async () => {
    try {
      setError(null);
      setIsDefaultsLoading(true);
      
      // Lấy URLs từ query params hoặc dùng default
      const carUrl = searchParams.get('carImageUrl') || DEFAULT_CAR_IMAGE_URL;
      const bgUrl = searchParams.get('backgroundImageUrl') || DEFAULT_BACKGROUND_IMAGE_URL;
      const urlPrompt = searchParams.get('prompt');
      
      // Set prompt từ URL nếu có
      if (urlPrompt) {
        setPrompt(urlPrompt);
      }
      
      const [carB64, bgB64] = await Promise.all([
        urlToBase64(carUrl),
        urlToBase64(bgUrl),
      ]);
      
      setCarImage(carB64);
      setBackgroundImage(bgB64);
    } catch (err) {
      setError("Failed to load default images. Please check your network connection or image URLs.");
      console.error(err);
    } finally {
      setIsDefaultsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  const handleCarImageChange = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setCarImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBackgroundImageChange = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setBackgroundImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!carImage) {
      setError("Please upload a car photo.");
      return;
    }
    if (!prompt) {
      setError("Please enter a background description.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const carImageB64 = carImage.split(',')[1];
      const backgroundImageB64 = backgroundImage ? backgroundImage.split(',')[1] : null;

      const result = await replaceBackground(carImageB64, backgroundImageB64, prompt);
      setResultImage(`data:image/png;base64,${result}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to replace background: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Car Background Replacer</h1>
          <p className="text-lg text-gray-400 mt-2 max-w-2xl mx-auto">Upload a car photo, describe a new scene, and let AI do the magic.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Controls Panel */}
          <div className="lg:w-1/3 w-full bg-gray-800 rounded-lg p-6 shadow-xl flex flex-col gap-6">
            <ImageUploader
              id="car-uploader"
              label="1. Car Photo"
              onImageChange={handleCarImageChange}
              defaultImage={carImage}
              isLoading={isDefaultsLoading}
            />
            <ImageUploader
              id="background-uploader"
              label="2. Background Reference (Optional)"
              onImageChange={handleBackgroundImageChange}
              defaultImage={backgroundImage}
              isLoading={isDefaultsLoading}
            />
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">3. Background Description</label>
              <textarea
                id="prompt"
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A futuristic city at night, neon lights..."
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading || isDefaultsLoading || !carImage}
              className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg"
            >
              {isLoading ? <Spinner /> : 'Replace Background'}
            </button>
          </div>

          {/* Result Panel */}
          <div className="lg:w-2/3 w-full bg-gray-800 rounded-lg p-6 shadow-xl flex flex-col justify-center items-center min-h-[300px] lg:min-h-[564px]">
            {isLoading && (
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-gray-400">Generating your image... this can take a moment.</p>
                </div>
            )}
            {error && <p className="text-red-400 bg-red-900/50 p-4 rounded-md">{error}</p>}
            
            {resultImage && !isLoading && (
              <div className="w-full flex flex-col items-center gap-4">
                  <img src={resultImage} alt="Generated car with new background" className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-2xl" />
                  <a
                      href={resultImage}
                      download="car-background-replaced.png"
                      className="mt-4 inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow-lg"
                  >
                      <DownloadIcon />
                      Download Image
                  </a>
              </div>
            )}

            {!resultImage && !isLoading && !error && (
                <div className="text-center text-gray-500">
                    <p>Your generated image will appear here.</p>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}