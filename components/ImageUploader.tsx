import React, { useRef } from 'react';

interface ImageUploaderProps {
  id: string;
  label: string;
  onImageChange: (file: File) => void;
  defaultImage: string | null;
  isLoading: boolean;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageChange, defaultImage, isLoading }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageChange(event.target.files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        onImageChange(event.dataTransfer.files[0]);
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div 
        className="relative group aspect-video w-full bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg flex justify-center items-center cursor-pointer hover:border-indigo-500 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        {isLoading ? (
            <div className="flex flex-col items-center text-gray-500">
                <svg className="animate-spin h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="mt-2 text-sm">Loading...</span>
            </div>
        ) : defaultImage ? (
          <div className="relative w-full h-full">
            <img src={defaultImage} alt="Preview" className="object-contain h-full w-full rounded-md" />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md pointer-events-none">
                <p className="text-white text-center text-sm font-medium px-4">Click or drag to replace</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <UploadIcon />
            <p className="mt-1 text-sm text-gray-500">Click to upload or drag & drop</p>
          </div>
        )}
      </div>
    </div>
  );
};