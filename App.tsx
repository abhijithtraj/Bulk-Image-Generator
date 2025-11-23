import React, { useState } from 'react';
import { Layout, Image, Database, Zap } from 'lucide-react';
import ImageEditor from './components/ImageEditor';
import BulkGenerator from './components/BulkGenerator';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <Zap className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Gemini Lens</h1>
          </div>
          
          <nav className="flex items-center bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setMode(AppMode.EDITOR)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                mode === AppMode.EDITOR
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Image size={16} />
              Image Editor
            </button>
            <button
              onClick={() => setMode(AppMode.BULK)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                mode === AppMode.BULK
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database size={16} />
              Bulk Generator
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 w-full">
          {mode === AppMode.EDITOR ? <ImageEditor /> : <BulkGenerator />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0f172a] py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>Powered by Google Gemini 2.5 Flash Image</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
