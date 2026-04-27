import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useCallback } from 'react';
import { Package, GitBranch, CloudUpload, Clock, Globe, ArrowRight, X, FileArchive } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { DeploymentModal } from '../components/DeploymentModal';
import { apiRequest } from '#/lib/api.ts';
import type { Deployment } from '#/lib/deployments-query.ts';
import { toast } from 'sonner';
import { getRepoName } from '#/utils/helpers.ts';
import { useGetListOfDeployments } from '#/lib/deployments-query.ts';
import { useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient()
  const { data: deployments, error: deploymentsError, isLoading: deploymentsLoading } = useGetListOfDeployments()
  const [tab, setTab] = useState<'git' | 'upload'>('git');

  // Git deployment state
  const [url, setUrl] = useState('https://github.com/acme/api.git');
  const [branch, setBranch] = useState('main');

  // Upload deployment state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadPort, setUploadPort] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<number | null>(null);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setUploadFile(file);
        // Auto-fill name from filename if not set
        if (!uploadName) {
          const nameWithoutExt = file.name.replace('.zip', '');
          setUploadName(nameWithoutExt);
        }
        toast.success(`File selected: ${file.name}`);
      } else {
        toast.error('Please upload a ZIP file');
      }
    }
  }, [uploadName]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setUploadFile(file);
        // Auto-fill name from filename if not set
        if (!uploadName) {
          const nameWithoutExt = file.name.replace('.zip', '');
          setUploadName(nameWithoutExt);
        }
        toast.success(`File selected: ${file.name}`);
      } else {
        toast.error('Please upload a ZIP file');
      }
    }
  }, [uploadName]);

  const clearUploadFile = useCallback(() => {
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDeploy = () => {
    if (tab === "git") {
      handleDeployFromGit()
    } else {
      handleDeployFromUpload()
    }
  };

  async function handleDeployFromGit() {
    setIsLoading(true);
    setError(null);

    try {
      const name = getRepoName(url)
      const { data, success } = await apiRequest({
        route: "/deployments/git",
        method: "POST",
        body: {
          name,
          git_url: url,
          branch: branch,
          port: 8080, // Default port
        }
      })

      if (!success) {
        toast.error("Deployment failed")
        throw new Error('Failed to create deployment');
      }

      // Reset form
      setUrl('');
      setBranch('main');

      toast.success('Deployment created successfully');
      setSelectedDeploymentId(data.id)
      queryClient.invalidateQueries({ queryKey: ["deployments"] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
      toast.error(err instanceof Error ? err.message : 'Deployment failed')
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeployFromUpload() {
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!uploadName) {
      toast.error('Please enter a deployment name');
      return;
    }
    if (!uploadPort) {
      toast.error('Please enter a port number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('name', uploadName);
      formData.append('port', uploadPort);
      formData.append('project', uploadFile);

      const { data, success } = await apiRequest({
        route: "/deployments/upload",
        method: "POST",
        body: formData,
        // Don't set Content-Type - let the browser set it with the boundary
      })

      if (!success) {
        toast.error("Upload failed")
        throw new Error('Failed to create deployment from upload');
      }

      // Reset form
      setUploadFile(null);
      setUploadName('');
      setUploadPort('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Deployment created successfully from upload');
      setSelectedDeploymentId(data.id)
      queryClient.invalidateQueries({ queryKey: ["deployments"] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1015] text-white p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Deployments
          </h1>
          <p className="text-[#8b949e] text-sm">
            {deployments?.length === 0
              ? "No deployments yet — create your first one."
              : "Manage and monitor your applications."}
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left Column: Deployments List */}
          <div className="order-2 lg:order-1 flex-1 w-full">
            {deploymentsLoading ? (
              // Skeleton Loading State
              <div className="bg-[#131820] border border-[#1e293b] rounded-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-[#1e293b] bg-[#131820]/50">
                  <div className="h-7 w-32 bg-[#1e293b] rounded animate-pulse" />
                </div>
                <div className="divide-y divide-[#1e293b]">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#1e293b] animate-pulse" />
                          <div className="space-y-2">
                            <div className="h-5 w-32 bg-[#1e293b] rounded animate-pulse" />
                            <div className="flex items-center gap-3">
                              <div className="h-4 w-24 bg-[#1e293b] rounded animate-pulse" />
                              <div className="h-4 w-20 bg-[#1e293b] rounded animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="h-6 w-24 bg-[#1e293b] rounded animate-pulse" />
                          <div className="h-4 w-8 bg-[#1e293b] rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : deploymentsError ? (
              // Error State
              <div className="bg-[#131820] border border-red-500/20 rounded-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Failed to Load Deployments</h3>
                      <p className="text-sm text-red-400/80 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Retry
                  </button>
                </div>
              </div>
            ) : deployments?.length === 0 ? (
              // Empty State
              <div className="border border-dashed border-[#1e293b] rounded-xl py-16 flex flex-col items-center justify-center space-y-4">
                <div className="text-[#8b949e]">
                  <Package size={36} strokeWidth={1.5} />
                </div>
                <p className="text-[#8b949e] text-sm">
                  Submit a Git URL or upload a project archive to get started.
                </p>
              </div>
            ) : (
              // Success State with Data
              <div className="bg-[#131820] border border-[#1e293b] rounded-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-[#1e293b] bg-[#131820]/50">
                  <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                </div>
                <div className="divide-y divide-[#1e293b]">
                  {deployments?.map((deployment) => (
                    <button
                      key={deployment.id}
                      onClick={() => setSelectedDeploymentId(deployment.id)}
                      className="w-full text-left group flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-[#1c232d]/50 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0
              ${deployment.status === 'running' ? 'bg-green-500/20 text-green-400' :
                            deployment.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'}
            `}>
                          {deployment.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                            {deployment.name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-[#8b949e] mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {new Date(deployment.created_at).toLocaleDateString()}
                            </span>
                            {deployment.image_tag && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span className="font-mono text-xs bg-[#0b1015] border border-[#1e293b] px-2 py-0.5 rounded text-zinc-400">
                                  {deployment.image_tag?.split(':').pop()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 sm:justify-end mt-2 sm:mt-0">
                        <div className="shrink-0 min-w-25 flex justify-start sm:justify-end">
                          <StatusBadge status={deployment.status} />
                        </div>

                        {deployment.live_url && (
                          <a
                            href={deployment.live_url as string}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden sm:flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {new URL(deployment.live_url as string).hostname}
                            <Globe size={14} />
                          </a>
                        )}

                        <ArrowRight size={18} className="text-[#8b949e] group-hover:text-white transition-colors transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: New Deployment Form Box */}
          <div className="order-1 lg:order-2 w-full lg:w-[420px] lg:sticky lg:top-8 shrink-0">
            <div className="border border-[#1e293b] bg-[#131820] rounded-xl overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold text-white">New deployment</h2>
                  <p className="text-[#8b949e] text-sm">
                    Deploy from a Git repository or upload a project archive.
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#0b1015] rounded-lg p-1 border border-[#1e293b]">
                  <button
                    type="button"
                    onClick={() => setTab('git')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${tab === 'git' ? 'bg-[#1c232d] text-white' : 'text-[#8b949e] hover:text-white'
                      }`}
                  >
                    <GitBranch size={16} />
                    Git URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${tab === 'upload' ? 'bg-[#1c232d] text-white' : 'text-[#8b949e] hover:text-white'
                      }`}
                  >
                    <CloudUpload size={16} />
                    Upload
                  </button>
                </div>

                {/* Form Fields */}
                {tab === 'git' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white">Repository URL</label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://github.com/username/repo"
                        className="block w-full px-3 py-2.5 bg-[#0b1015] border border-[#1e293b] rounded-lg text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] sm:text-sm transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white">Branch (optional)</label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="block w-full px-3 py-2.5 bg-[#0b1015] border border-[#1e293b] rounded-lg text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] sm:text-sm transition-colors"
                      />
                    </div>
                  </div>
                )}

                {tab === 'upload' && (
                  <div className="space-y-4">
                    {/* File Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-all bg-[#0b1015] cursor-pointer group ${isDragging
                          ? 'border-[#58a6ff] bg-[#1c232d]'
                          : 'border-[#1e293b] hover:border-[#334155]'
                        } ${uploadFile ? 'border-green-500/50' : ''}`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {uploadFile ? (
                        <div className="flex items-center gap-3 text-center">
                          <FileArchive size={24} className="text-green-400" />
                          <div className="text-left">
                            <p className="text-sm text-white font-medium">{uploadFile.name}</p>
                            <p className="text-xs text-[#8b949e]">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearUploadFile();
                            }}
                            className="ml-2 p-1 hover:bg-[#1e293b] rounded transition-colors"
                          >
                            <X size={16} className="text-[#8b949e]" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 text-center">
                          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#1c232d] text-[#8b949e] group-hover:text-white transition-all">
                            <CloudUpload size={24} />
                          </div>
                          <div className="text-sm text-[#8b949e]">
                            <span className="font-medium text-[#58a6ff] group-hover:text-blue-400">
                              {isDragging ? 'Drop file here' : 'Click to upload'}
                            </span>
                            {' '}or drag and drop
                          </div>
                          <p className="text-xs text-[#8b949e]">
                            ZIP files only (max 32MB)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Name Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white">Deployment Name</label>
                      <input
                        type="text"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        placeholder="my-app"
                        className="block w-full px-3 py-2.5 bg-[#0b1015] border border-[#1e293b] rounded-lg text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] sm:text-sm transition-colors"
                      />
                    </div>

                    {/* Port Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white">Port</label>
                      <input
                        type="number"
                        value={uploadPort}
                        onChange={(e) => setUploadPort(e.target.value)}
                        placeholder="8080"
                        className="block w-full px-3 py-2.5 bg-[#0b1015] border border-[#1e293b] rounded-lg text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] sm:text-sm transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleDeploy}
                  type="button"
                  disabled={isLoading || (tab === 'upload' && !uploadFile)}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-black bg-[#4ade80] hover:bg-[#22c55e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#131820] focus:ring-[#4ade80] transition-colors disabled:cursor-none disabled:opacity-50"
                >
                  {isLoading ? "Deploying...." : (tab === 'upload' && !uploadFile) ? "Select a file..." : "Deploy"}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <DeploymentModal
        isOpen={selectedDeploymentId !== null}
        onClose={() => setSelectedDeploymentId(null)}
        deployments={deployments as Deployment[]}
        deploymentId={selectedDeploymentId}
      />
    </div>
  );
}
