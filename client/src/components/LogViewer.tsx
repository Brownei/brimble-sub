import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';
import { BASE_URL, type LogEntry, type StreamEvent, type StatusData } from '#/lib/api.ts';
import { useGetLogs } from '#/lib/deployments-query.ts';
import { useQueryClient } from '@tanstack/react-query';

interface LogViewerProps {
  deploymentUUID: string;
  onStatusChange?: (status: StatusData) => void;
}

export function LogViewer({ deploymentUUID, onStatusChange }: LogViewerProps) {
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const { data: logsFromDB, isLoading } = useGetLogs(deploymentUUID)
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const processedLogIds = useRef(new Set<string>());
  const queryClient = useQueryClient()

  // Load historical logs from database
  useEffect(() => {
    if (!isLoading && logsFromDB) {
      // Clear processed IDs when loading from DB
      processedLogIds.current.clear();
      
      const historicalLogs = logsFromDB.map((log: any) => ({
        id: log.id,
        message: log.message,
        stream: log.stream,
        timestamp: log.timestamp,
      }));
      
      // Track historical logs by timestamp+message to avoid duplicates
      historicalLogs.forEach((log: LogEntry) => {
        const key = `${log.timestamp}-${log.message}`;
        processedLogIds.current.add(key);
      });
      
      setLogs(historicalLogs);
    }
  }, [logsFromDB, isLoading]);

  // Setup SSE for real-time events (logs + status updates)
  useEffect(() => {
    if (!deploymentUUID) return;
    
    const es = new EventSource(`${BASE_URL}/deployments/${deploymentUUID}/logs/stream`);

    es.onmessage = (event) => {
      const streamEvent: StreamEvent = JSON.parse(event.data);
      
      if (streamEvent.type === 'log' && streamEvent.log) {
        const key = `${streamEvent.timestamp}-${streamEvent.log.message}`;
        
        // Only add if not already seen (prevents duplicates)
        if (!processedLogIds.current.has(key)) {
          processedLogIds.current.add(key);
          
          const logEntry: LogEntry = {
            message: streamEvent.log.message,
            stream: streamEvent.log.stream,
            timestamp: streamEvent.timestamp,
          };
          
          setLogs(prevLogs => [...prevLogs, logEntry]);
        }
      } else if (streamEvent.type === 'status' && streamEvent.status) {
        // Notify parent component about status change
        onStatusChange?.(streamEvent.status);
        
        // Also invalidate deployments query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['deployments'] });
      }
    };

    es.onerror = (error) => {
      console.error('SSE Error:', error);
      es.close();
    };

    return () => {
      es.close();
    };
  }, [deploymentUUID, onStatusChange, queryClient]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-xl flex flex-col h-[500px]">
      <div className="flex items-center px-4 py-3 bg-zinc-900 border-b border-zinc-800 gap-2">
        <Terminal size={16} className="text-zinc-500" />
        <span className="text-xs font-mono text-zinc-400">build.log</span>
      </div>
      <div className="p-4 overflow-y-auto font-mono text-sm flex-1 space-y-1" ref={logsContainerRef}>
        {isLoading ? (
          <div className="text-zinc-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-zinc-500">No logs available. Waiting for build to start...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="log-line">
              <span className="text-zinc-600 mr-2">[{formatTime(log.timestamp)}]</span>
              <span className={log.stream === 'stderr' ? 'text-red-400' : 'text-zinc-300'}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
