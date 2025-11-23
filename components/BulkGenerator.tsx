import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { FileSpreadsheet, Play, Square, Download, CheckCircle2, Loader2, Settings2, PackageOpen, AlertCircle } from 'lucide-react';
import { generateImageWithGemini } from '../services/geminiService';
import { GeneratedImage, ProcessingStatus, ExcelRow } from '../types';

const BulkGenerator: React.FC = () => {
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Configuration State
  const [promptColumn, setPromptColumn] = useState<string>('');
  const [filenameColumn, setFilenameColumn] = useState<string>('');
  const [baselinePrompt, setBaselinePrompt] = useState<string>('Professional product photography, studio lighting, white background, 4k');
  
  const [status, setStatus] = useState<ProcessingStatus>({ total: 0, completed: 0, isProcessing: false });
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 50));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<ExcelRow>(ws);
        
        if (data.length > 0) {
          const extractedHeaders = Object.keys(data[0]);
          setHeaders(extractedHeaders);
          setExcelData(data);
          
          // Smart defaults
          setPromptColumn(extractedHeaders[0]); 
          setFilenameColumn(extractedHeaders.find(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('sku') || h.toLowerCase().includes('id')) || extractedHeaders[0]);
          
          addLog(`Loaded ${data.length} rows from ${file.name}`);
        }
      } catch (err) {
        console.error(err);
        addLog("Error parsing Excel file. Please ensure it is a valid .xlsx or .csv");
      }
    };
    reader.readAsBinaryString(file);
  };

  const stopGeneration = () => {
    if (status.isProcessing) {
      abortRef.current = true;
      addLog("Stopping generation after current item finishes...");
    }
  };

  const handleStartBulkGeneration = async () => {
    if (!excelData.length || !promptColumn || !filenameColumn) return;

    abortRef.current = false;
    setStatus({ total: excelData.length, completed: 0, isProcessing: true });
    setResults([]); 
    addLog("Starting bulk generation...");

    for (let i = 0; i < excelData.length; i++) {
      if (abortRef.current) {
        addLog("Process stopped by user.");
        break;
      }

      const row = excelData[i];
      const productPrompt = String(row[promptColumn] || '');
      const productName = String(row[filenameColumn] || `image-${i}`);
      
      if (!productPrompt.trim()) {
        addLog(`Skipping row ${i + 1}: Empty prompt`);
        setStatus(prev => ({ ...prev, completed: prev.completed + 1 }));
        continue;
      }

      // Combine baseline prompt with product specific prompt for consistency
      const fullPrompt = baselinePrompt 
        ? `${baselinePrompt}. ${productPrompt}` 
        : productPrompt;

      setStatus(prev => ({ ...prev, currentAction: `Generating: ${productName}` }));

      try {
        const imageUrl = await generateImageWithGemini(fullPrompt);
        
        // Sanitize filename
        const safeFileName = productName.replace(/[^a-z0-9_\-\s]/gi, '_').trim() || `image-${i}`;

        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          url: imageUrl,
          prompt: fullPrompt,
          fileName: safeFileName,
          originalName: productName,
          timestamp: Date.now()
        };
        setResults(prev => [...prev, newImage]);
        addLog(`Success: ${productName}`);
      } catch (err) {
        addLog(`Failed row ${i + 1} (${productName}): ${err}`);
      }

      setStatus(prev => ({ ...prev, completed: prev.completed + 1 }));
    }

    setStatus(prev => ({ ...prev, isProcessing: false, currentAction: abortRef.current ? 'Stopped' : 'Completed!' }));
    abortRef.current = false;
  };

  const downloadAllAsZip = async () => {
    if (results.length === 0) return;
    
    addLog("Preparing ZIP download...");
    const zip = new JSZip();
    const folder = zip.folder("gemini-generated-images");
    
    if (!folder) return;

    // Track used filenames to handle duplicates
    const usedNames: Record<string, number> = {};

    results.forEach((img) => {
      let fileName = img.fileName;
      
      // Handle duplicates by appending counter
      if (usedNames[fileName]) {
        usedNames[fileName]++;
        fileName = `${fileName}_${usedNames[fileName]}`;
      } else {
        usedNames[fileName] = 1;
      }

      // img.url is "data:image/png;base64,....."
      const base64Data = img.url.split(',')[1];
      folder.file(`${fileName}.png`, base64Data, { base64: true });
    });

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = "gemini-products.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog("ZIP file downloaded successfully.");
    } catch (err) {
      console.error(err);
      addLog("Error generating ZIP file.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
       <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
          Bulk Product Generator
        </h2>
        <p className="text-slate-400">Upload a product list (Excel/CSV) to auto-generate images for your catalog.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Setup Column */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* File Upload Card */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="text-green-400" /> Data Source
                </h3>
                
                {!excelData.length ? (
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-green-500 hover:bg-slate-800 transition-all cursor-pointer"
                         onClick={() => fileInputRef.current?.click()}>
                        <div className="bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FileSpreadsheet className="text-slate-400" />
                        </div>
                        <p className="text-slate-300 text-sm font-medium">Upload .xlsx or .csv</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                            <span className="text-sm text-slate-300">{excelData.length} rows loaded</span>
                            <button onClick={() => { setExcelData([]); setResults([]); }} className="text-xs text-red-400 hover:underline">Reset</button>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Prompt Column</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
                                    value={promptColumn}
                                    onChange={(e) => setPromptColumn(e.target.value)}
                                >
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Filename Column</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
                                    value={filenameColumn}
                                    onChange={(e) => setFilenameColumn(e.target.value)}
                                >
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Configuration Card */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                 <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings2 className="text-blue-400" /> Settings
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Baseline Prompt (Style)</label>
                        <textarea 
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none h-24 resize-none"
                            value={baselinePrompt}
                            onChange={(e) => setBaselinePrompt(e.target.value)}
                            placeholder="e.g. Studio lighting, white background..."
                        />
                        <p className="text-[10px] text-slate-500 mt-1">This text is added to the beginning of every product prompt to ensure consistency.</p>
                    </div>

                    {!status.isProcessing ? (
                         <button 
                            onClick={handleStartBulkGeneration}
                            disabled={!excelData.length}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
                        >
                            <Play className="w-4 h-4 fill-current" /> Start Generation
                        </button>
                    ) : (
                         <button 
                            onClick={stopGeneration}
                            className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20"
                        >
                            <Square className="w-4 h-4 fill-current" /> Stop Process
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* Progress & Results Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Progress Section */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Process Status</h3>
                    {results.length > 0 && !status.isProcessing && (
                        <button onClick={downloadAllAsZip} className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all">
                            <PackageOpen size={16} /> Download ZIP
                        </button>
                    )}
                 </div>

                 <div className="mb-6">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Progress</span>
                        <span>{status.completed} / {status.total}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-300 ${status.isProcessing ? 'bg-gradient-to-r from-green-500 to-emerald-400 animate-pulse' : 'bg-green-500'}`}
                            style={{ width: `${status.total > 0 ? (status.completed / status.total) * 100 : 0}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 h-4 font-mono">{status.currentAction || 'Ready to start'}</p>
                 </div>

                 <div className="bg-black/40 rounded-lg p-4 h-40 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-300 border border-slate-700/50">
                    {logs.length === 0 ? (
                        <span className="text-slate-600 italic">Waiting for activity...</span>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="mb-1.5 border-b border-slate-800/50 pb-1.5 last:border-0 last:pb-0">
                                <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                <span>{log}</span>
                            </div>
                        ))
                    )}
                 </div>
            </div>

            {/* Live Results Grid */}
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    {results.length > 0 ? `Generated Assets (${results.length})` : 'Output Preview'}
                </h3>
                
                {results.length === 0 ? (
                    <div className="h-64 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 bg-slate-800/20">
                        <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                        <p>No images generated yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {results.map((res) => (
                            <div key={res.id} className="group relative aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-blue-500/50">
                                <img src={res.url} alt={res.prompt} className="w-full h-full object-cover" />
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-white text-xs font-medium truncate mb-2">{res.fileName}</p>
                                    <a 
                                        href={res.url} 
                                        download={`${res.fileName}.png`}
                                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Download size={12} /> Save
                                    </a>
                                </div>
                                
                                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform">
                                    <CheckCircle2 size={12} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default BulkGenerator;