import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { CHRONICLES } from './chronicles';
import type { ChronicleCheckContext, ChronicleDefinition, AchievementRecord } from './types';

export function useChronicleEngine(addXP: (xp: number) => Promise<void>) {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [unlockedRecords, setUnlockedRecords] = useState<(AchievementRecord & { name: string })[]>([]);

  // Load already-unlocked chronicles from Dexie on mount
  useEffect(() => {
    db.achievements.toArray().then(records => {
      setUnlockedIds(records.map(r => r.id));
      setUnlockedRecords(
        records.map(r => ({
          ...r,
          name: CHRONICLES.find(c => c.id === r.id)?.name ?? r.id,
        }))
      );
    });
  }, []);

  /** Check all chronicles against the given context. Returns newly unlocked definitions. */
  const checkChronicles = useCallback(
    async (ctx: ChronicleCheckContext): Promise<ChronicleDefinition[]> => {
      const currentIds = [...unlockedIds];
      const newlyUnlocked: ChronicleDefinition[] = [];

      for (const chronicle of CHRONICLES) {
        if (currentIds.includes(chronicle.id)) continue;
        if (!chronicle.check({ ...ctx, unlockedChronicleIds: currentIds })) continue;

        // Persist to Dexie
        const record: AchievementRecord = {
          id: chronicle.id,
          unlockedAt: new Date().toISOString(),
          category: chronicle.category,
        };
        await db.achievements.put(record);

        // Award Renown bonus
        await addXP(chronicle.renownReward);

        currentIds.push(chronicle.id);
        newlyUnlocked.push(chronicle);
      }

      if (newlyUnlocked.length > 0) {
        setUnlockedIds([...currentIds]);
        setUnlockedRecords(prev => [
          ...prev,
          ...newlyUnlocked.map(c => ({
            id: c.id,
            unlockedAt: new Date().toISOString(),
            category: c.category,
            name: c.name,
          })),
        ]);
      }

      return newlyUnlocked;
    },
    [unlockedIds, addXP],
  );

  /** All earned Chronicles as full definitions, sorted by unlockedAt descending */
  const unlockedChronicles: ChronicleDefinition[] = unlockedRecords
    .slice()
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .map(r => CHRONICLES.find(c => c.id === r.id))
    .filter((c): c is ChronicleDefinition => c !== undefined);

  return {
    checkChronicles,
    unlockedChronicles,
    unlockedChronicleIds: unlockedIds,
    allChronicles: CHRONICLES,
  };
}
