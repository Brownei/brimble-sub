import type { DeploymentStatus } from '#/lib/deployments-query.ts';

interface StatusBadgeProps {
  status: DeploymentStatus;
}

const statusConfig: Record<DeploymentStatus, { label: string; colors: string; dot: string; ping?: boolean }> = {
  pending: {
    label: 'Pending',
    colors: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    dot: 'bg-gray-500',
  },
  building: {
    label: 'Building',
    colors: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    dot: 'bg-blue-500',
    ping: true,
  },
  deploying: {
    label: 'Deploying',
    colors: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    dot: 'bg-purple-500',
    ping: true,
  },
  running: {
    label: 'Running',
    colors: 'bg-green-500/10 text-green-500 border-green-500/20',
    dot: 'bg-green-500',
  },
  failed: {
    label: 'Failed',
    colors: 'bg-red-500/10 text-red-500 border-red-500/20',
    dot: 'bg-red-500',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.colors}`}
    >
      <span className="relative flex h-2 w-2">
        {config.ping && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  );
}
