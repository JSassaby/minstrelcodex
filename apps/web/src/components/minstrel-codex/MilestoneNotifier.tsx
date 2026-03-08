import { useState, useCallback, useEffect } from 'react';
import ShareMilestoneModal from './ShareMilestoneModal';
import type { MilestoneEvent } from './milestoneDetection';

/**
 * Renders a queue of milestone celebration modals.
 * Shows one at a time; dismissing advances to the next.
 */
export default function MilestoneNotifier() {
  const [queue, setQueue] = useState<MilestoneEvent[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { milestones } = (e as CustomEvent<{ milestones: MilestoneEvent[] }>).detail;
      if (milestones.length > 0) {
        setQueue(prev => [...prev, ...milestones]);
      }
    };
    window.addEventListener('minstrel:milestone', handler);
    return () => window.removeEventListener('minstrel:milestone', handler);
  }, []);

  const current = queue[0] ?? null;

  const handleClose = useCallback(() => {
    setQueue(prev => prev.slice(1));
  }, []);

  if (!current) return null;

  return (
    <ShareMilestoneModal
      visible={true}
      data={current.card}
      onClose={handleClose}
    />
  );
}

/** Dispatch milestone events from anywhere */
export function emitMilestones(milestones: MilestoneEvent[]) {
  if (milestones.length === 0) return;
  window.dispatchEvent(
    new CustomEvent('minstrel:milestone', { detail: { milestones } })
  );
}
