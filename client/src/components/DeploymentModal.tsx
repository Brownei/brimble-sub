import { useState, useEffect } from 'react';
import { X, Clock, GitBranch, Globe, Server, Activity, GithubIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { LogViewer } from './LogViewer';
import type { StatusData } from '#/lib/api.ts';
import type { Deployment } from '#/lib/deployments-query.ts';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deployments: Deployment[]
  deploymentId: number | null;
}

export function DeploymentModal({ isOpen, onClose, deployments, deploymentId }: DeploymentModalProps) {
  const [localDeployment, setLocalDeployment] = useState<Deployment | null>(null);

  // Find deployment from props
  const deploymentFromProps = deploymentId 
    ? deployments.find((d) => d.id === deploymentId) 
    : null;

  // Sync with props when deploymentId changes or modal opens
  useEffect(() => {
    if (deploymentFromProps) {
      setLocalDeployment(deploymentFromProps);
    }
  }, [deploymentId, deploymentFromProps?.id]);

  // Handle real-time status updates from SSE
  const handleStatusChange = (statusData: StatusData) => {
    setLocalDeployment((prev: Deployment | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: statusData.status,
        live_url: statusData.live_url || prev.live_url,
        error: statusData.error || prev.error,
      };
    });
  };

  if (!isOpen || !deploymentId || !localDeployment) return null;

  const deployment = localDeployment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="bg-[#131820] border border-[#1e293b] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8"
        role="dialog"
      >
        <div className="flex justify-between items-center p-6 border-b border-[#1e293b]">
          <h2 className="text-xl font-semibold text-white">Deployment Details</h2>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white transition-colors p-1 rounded-md hover:bg-[#1c232d]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl flex-shrink-0
                  ${deployment.status === 'running' ? 'bg-green-500/20 text-green-400' :
                  deployment.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'}
                `}>
                {deployment.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold tracking-tight text-white">{deployment.name}</h1>
                  <StatusBadge status={deployment.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-[#8b949e]">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#8b949e]" />
                    {new Date(deployment.created_at).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <GithubIcon size={14} className="text-[#8b949e]" />
                    main
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {deployment.live_url && (
                <a
                  href={deployment.live_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#1c232d] hover:bg-[#202832] border border-[#30363d] text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
                >
                  <Globe size={16} />
                  Visit App
                </a>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-[#1e293b] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                <Server size={14} />
                Image Tag
              </span>
              <p className="font-mono text-sm bg-[#0b1015] px-3 py-1.5 rounded-md border border-[#1e293b] text-zinc-300 w-fit break-all">
                {deployment.image_tag || 'Not available'}
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch size={14} />
                Commit
              </span>
              <p className="font-mono text-sm text-zinc-300">
                8f9a2c1
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} />
                Environment
              </span>
              <p className="text-sm font-medium text-zinc-300 capitalize">
                Production
              </p>
            </div>
          </div>

          {/* Logs Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Build & Deploy Logs
            </h2>
            <LogViewer 
              deploymentUUID={deployment.uuid} 
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
