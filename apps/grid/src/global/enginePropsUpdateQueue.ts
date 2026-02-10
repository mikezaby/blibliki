type EngineModuleUpdate = {
  id: string;
  name: string;
  props: object;
  state?: object;
  voices?: number;
};

type ModuleSnapshot = {
  name: string;
  props: object;
  state?: object;
  voices?: number;
};

type ModuleChanges = {
  name?: string;
  props?: object;
  state?: object;
  voices?: number;
};

type PendingUpdate = {
  id: string;
  changes: ModuleChanges;
  snapshot: ModuleSnapshot;
};

export type QueuedModuleUpdate = {
  id: string;
  changes: ModuleChanges;
};

const diffUpdate = (
  next: EngineModuleUpdate,
  baseline: ModuleSnapshot | undefined,
): ModuleChanges => {
  const changes: ModuleChanges = {};

  if (baseline?.name !== next.name) {
    changes.name = next.name;
  }

  if (baseline?.props !== next.props) {
    changes.props = next.props;
  }

  if (baseline?.state !== next.state) {
    changes.state = next.state;
  }

  if (baseline?.voices !== next.voices) {
    changes.voices = next.voices;
  }

  return changes;
};

export function createEnginePropsUpdateQueue() {
  const snapshots = new Map<string, ModuleSnapshot>();
  const pending = new Map<string, PendingUpdate>();

  const enqueue = (update: EngineModuleUpdate): boolean => {
    const currentPending = pending.get(update.id);
    const baseline = currentPending?.snapshot ?? snapshots.get(update.id);
    const nextChanges = diffUpdate(update, baseline);

    if (Object.keys(nextChanges).length === 0) {
      return false;
    }

    const mergedChanges = {
      ...(currentPending?.changes ?? {}),
      ...nextChanges,
    };
    const snapshot: ModuleSnapshot = {
      name: update.name,
      props: update.props,
      state: update.state,
      voices: update.voices,
    };

    pending.set(update.id, {
      id: update.id,
      changes: mergedChanges,
      snapshot,
    });

    return true;
  };

  const flush = (): QueuedModuleUpdate[] => {
    const updates = Array.from(pending.values()).map((entry) => {
      snapshots.set(entry.id, entry.snapshot);
      return {
        id: entry.id,
        changes: entry.changes,
      };
    });

    pending.clear();
    return updates;
  };

  const sweep = (validIds: Iterable<string>) => {
    const allowedIds = new Set(validIds);

    snapshots.forEach((_, id) => {
      if (!allowedIds.has(id)) {
        snapshots.delete(id);
      }
    });

    pending.forEach((_, id) => {
      if (!allowedIds.has(id)) {
        pending.delete(id);
      }
    });
  };

  return {
    enqueue,
    flush,
    sweep,
  };
}
