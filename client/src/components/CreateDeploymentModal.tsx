import React, { useState } from 'react';
import { X, Github, UploadCloud, Link as LinkIcon, ArrowRight } from 'lucide-react';

interface CreateDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateDeploymentModal({ isOpen, onClose }: CreateDeploymentModalProps) {
  const [tab, setTab] = useState<'git' | 'upload'>('git');
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
      >
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">New Deployment</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex space-x-1 bg-zinc-800/50 p-1 rounded-lg mb-6">
            <button
              onClick={() => setTab('git')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                tab === 'git' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Github size={16} />
              Git Repository
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                tab === 'upload' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <UploadCloud size={16} />
              Upload Project
            </button>
          </div>

          {tab === 'git' && (
            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Repository URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <LinkIcon size={16} />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                  />
                </div>
              </div>
              <button 
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-blue-500 transition-colors"
                onClick={() => {
                  // Mock submission
                  alert('Submitting: ' + url);
                  onClose();
                }}
              >
                Deploy Now
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {tab === 'upload' && (
            <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-800 border-dashed rounded-xl hover:border-zinc-600 transition-colors bg-zinc-900/50 cursor-pointer group">
                <div className="space-y-2 text-center">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200 transition-all">
                    <UploadCloud size={24} />
                  </div>
                  <div className="text-sm text-zinc-400">
                    <span className="font-medium text-blue-500 group-hover:text-blue-400">Upload a directory</span>
                    {' '}or drag and drop
                  </div>
                  <p className="text-xs text-zinc-500">
                    ZIP, TAR, or loose files
                  </p>
                </div>
              </div>
              <button 
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                Upload & Deploy
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
