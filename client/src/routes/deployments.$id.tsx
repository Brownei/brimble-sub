import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Clock, GitBranch, Github, Globe, Server, Activity } from 'lucide-react';
import { mockDeployments } from '../lib/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { LogViewer } from '../components/LogViewer';

export const Route = createFileRoute('/deployments/$id')({
  component: DeploymentDetails,
});

function DeploymentDetails() {
  const { id } = Route.useParams();
  
  // Find the mocked deployment
  const deployment = mockDeployments.find(d => d.id === id);

  if (!deployment) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-2">Deployment Not Found</h2>
        <p className="text-zinc-400 mb-6">The deployment you're looking for does not exist or has been removed.</p>
        <Link to="/" className="text-blue-500 hover:text-blue-400 flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation */}
        <nav>
          <Link to="/" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium w-fit mb-6">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </nav>

        {/* Header Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl
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
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-zinc-500" />
                    {new Date(deployment.createdAt).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Github size={14} className="text-zinc-500" />
                    main
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {deployment.url && (
                <a 
                  href={deployment.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
                >
                  <Globe size={16} />
                  Visit App
                </a>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Server size={14} />
                Image Tag
              </span>
              <p className="font-mono text-sm bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-800 text-zinc-300 w-fit">
                {deployment.imageTag || 'Not available'}
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch size={14} />
                Commit
              </span>
              <p className="font-mono text-sm text-zinc-300">
                8f9a2c1
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} />
                Environment
              </span>
              <p className="text-sm font-medium text-zinc-300 capitalize">
                Production
              </p>
            </div>
          </div>
        </div>

        {/* Logs Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Build & Deploy Logs
          </h2>
          <LogViewer deploymentId={deployment.id} />
        </div>

      </div>
    </div>
  );
}
