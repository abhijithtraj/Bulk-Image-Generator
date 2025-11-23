import React, { useState, useRef, useCallback } from 'react';
import { Upload, Wand2, Download, Image as ImageIcon, RefreshCw, X } from 'lucide-react';
import { editImageWithGemini, fileToBase64 } from '../services/geminiService';

const ImageEditor: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSourceImage(ev.target?.result as string);
        setGeneratedImage(null); // Reset previous result
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return;
      
      setSourceFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSourceImage(ev.target?.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGenerate = async () => {
    if (!sourceFile || !prompt.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(sourceFile);
      const mimeType = sourceFile.type;
      const resultUrl = await editImageWithGemini(base64, mimeType, prompt);
      setGeneratedImage(resultUrl);
    } catch (err: any) {
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSource = () => {
    setSourceImage(null);
    setSourceFile(null);
    setGeneratedImage(null);
    setPrompt('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
          AI Magic Editor
        </h2>
        <p className="text-slate-400">Upload an image and describe how you want to change it.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Source Column */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-200">Source Image</h3>
            {sourceImage && (
              <button onClick={clearSource} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          <div 
            className={`relative border-2 border-dashed rounded-2xl h-[400px] flex flex-col items-center justify-center transition-colors overflow-hidden bg-slate-800/50 ${sourceImage ? 'border-slate-600' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-800'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {sourceImage ? (
              <img src={sourceImage} alt="Source" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="text-center p-6">
                <div className="bg-slate-700 p-4 rounded-full inline-flex mb-4">
                  <Upload className="text-blue-400 w-8 h-8" />
                </div>
                <p className="text-slate-300 font-medium mb-1">Drop image here</p>
                <p className="text-slate-500 text-sm mb-4">or click to upload</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Select File
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <label className="block text-sm font-medium text-slate-400 mb-2">Editing Prompt</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'Add a vintage film filter' or 'Make it snow'"
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button
                onClick={handleGenerate}
                disabled={!sourceImage || !prompt.trim() || isProcessing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                {isProcessing ? <RefreshCw className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                {isProcessing ? 'Magic...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>

        {/* Result Column */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-200">Result</h3>
            {generatedImage && (
              <a 
                href={generatedImage} 
                download="edited-gemini-lens.png"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Download size={14} /> Download
              </a>
            )}
          </div>

          <div className="relative border border-slate-700 rounded-2xl h-[400px] bg-slate-900/50 flex items-center justify-center overflow-hidden">
             {isProcessing ? (
               <div className="text-center">
                 <div className="relative w-20 h-20 mx-auto mb-4">
                   <div className="absolute inset-0 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
                   <div className="absolute inset-2 border-t-4 border-purple-500 border-solid rounded-full animate-spin direction-reverse"></div>
                 </div>
                 <p className="text-slate-400 animate-pulse">Gemini is reimagining your pixels...</p>
               </div>
             ) : generatedImage ? (
               <img src={generatedImage} alt="Generated" className="w-full h-full object-contain p-2" />
             ) : (
               <div className="text-center text-slate-600">
                 <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-20" />
                 <p>Your creation will appear here</p>
               </div>
             )}
          </div>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
