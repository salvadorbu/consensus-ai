import React, { useEffect, useState } from 'react';
import { getChannelStatus, ChannelStatusResponse } from '../../api/channels';
import Markdown from '../Markdown';

interface ConsensusChannelViewProps {
  channelId: string;
}

const POLL_INTERVAL_MS = 4000;

const ConsensusChannelView: React.FC<ConsensusChannelViewProps> = ({ channelId }) => {
  const [channelData, setChannelData] = useState<ChannelStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const fetchStatus = async () => {
      try {
        const data = await getChannelStatus(channelId);
        if (!isMounted) return;
        setChannelData(data);
        if (data.status === 'finished' || data.status === 'error') {
          if (intervalId) window.clearInterval(intervalId);
        }
      } catch (err: any) {
        console.error('Failed to fetch channel status', err);
        if (!isMounted) return;
        setError(err?.message ?? 'Failed to fetch status');
        if (intervalId) window.clearInterval(intervalId);
      }
    };

    // Initial fetch
    fetchStatus();
    // Polling
    intervalId = window.setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [channelId]);

  if (error) {
    return <div className="text-xs text-red-400 p-2">{error}</div>;
  }

  if (!channelData) {
    return <div className="text-xs text-gray-400 p-2">Loading channel…</div>;
  }

  const { status, rounds_executed, answer, log } = channelData;

  // Transform log into ordered entries if available
  let logEntries: React.ReactNode[] = [];
  if (log) {
    Object.entries(log).forEach(([agent, msgs]) => {
      msgs.forEach((msg, idx) => {
        logEntries.push(
          <div key={`${agent}-${idx}`} className="mb-2">
            <span className="font-semibold text-purple-300 mr-1">{agent}:</span>
            <Markdown content={msg.content} />
          </div>
        );
      });
    });
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 space-y-3 max-h-64 overflow-y-auto text-sm">
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span className="capitalize">Status: {status}</span>
        <span>Round: {rounds_executed}</span>
      </div>

      {logEntries.length > 0 ? (
        <div className="space-y-1">{logEntries}</div>
      ) : (
        <div className="text-xs text-gray-500">No messages yet.</div>
      )}

      {status === 'finished' && answer && (
        <div className="p-2 bg-purple-900/40 rounded">
          <div className="text-xs uppercase tracking-wide text-purple-300 mb-1">Consensus Answer</div>
          <Markdown content={answer} />
        </div>
      )}

      {status === 'error' && channelData.error && (
        <div className="p-2 bg-red-900/40 rounded text-red-300">
          <div className="text-xs uppercase tracking-wide mb-1">Error</div>
          {channelData.error}
        </div>
      )}
    </div>
  );
};

export default ConsensusChannelView; 