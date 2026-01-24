# Multiple Event Sources for Transport

**Date:** 2026-01-19
**Status:** Design
**Author:** Mike Zaby

## Overview

Refactor the Transport package to support multiple event sources that can be added and removed dynamically, replacing the current single listener pattern. This enables use cases like multiple step sequencers, automation timelines, and MIDI file playback running simultaneously with synchronized timing.

## Motivation

### Current Limitations

The Transport currently accepts a single "listener" at construction time:

```typescript
new Transport(context, listener)
```

This design has several issues:

1. **Not scalable**: Only one event generator can be active at a time
2. **Poor naming**: "listener" doesn't accurately describe what the interface does (generates AND consumes events)
3. **Inflexible**: Cannot add/remove event generators dynamically during playback
4. **Limited use cases**: Cannot support multiple sequencers, timeline automation, or MIDI playback simultaneously

### Target Use Cases

- **StepSequencer**: Pattern-based rhythm and melody generation
- **Timeline**: Automation lanes for parameter control (like Ableton Live)
- **MIDI File Reader**: Playback of pre-recorded MIDI data
- **Multiple simultaneous sources**: All sources contribute events to a unified, chronologically-ordered timeline

## Design

### 1. Core Concepts

#### Source Interface

Rename `TransportListener` to `Source` and make it self-identifying:

```typescript
export interface Source<T extends TransportEvent> {
  // Unique identifier for this Source
  id: string;

  // Generate events in the time window [start, end)
  // Must handle deduplication for overlapping windows
  generator: (start: Ticks, end: Ticks) => readonly Readonly<T>[];

  // Execute/consume the event when it fires
  consumer: (event: Readonly<T>) => void;

  // Optional lifecycle hooks
  onStart?: (contextTime: ContextTime) => void;
  onStop?: (contextTime: ContextTime) => void;
  onJump?: (ticks: Ticks) => void;
  silence?: (contextTime: ContextTime) => void;
}
```

**Key changes:**
- Requires `id` property for identification
- Optional lifecycle hooks (not all Sources need them)
- Better name that reflects dual responsibility (generate + consume)

#### Event Flow

Events from all Sources merge into a single chronological timeline:

1. **Generation Phase**:
   - SourceManager calls `generator(start, end)` on all active Sources
   - Each Source returns events, handling its own deduplication
   - Events are merged and sorted chronologically by ticks
   - Each event tagged with `sourceId` to track origin

2. **Consumption Phase**:
   - When events reach their scheduled time, SourceManager routes them back to the originating Source's `consumer()`

#### Updated Event Type

```typescript
export interface TransportEvent extends TimelineEvent {
  ticks: Ticks;
  contextTime: ContextTime;
  sourceId: string;  // NEW: identifies which Source generated this
}
```

### 2. SourceManager

A new internal class that manages the collection of Sources:

```typescript
export class SourceManager<T extends TransportEvent> {
  private activeSources: Map<string, Source<T>>;
  private pendingOperations: PendingOperation[];

  // Collect events from all active Sources
  generateEvents(start: Ticks, end: Ticks): readonly Readonly<T>[];

  // Route events to their originating Source
  consumeEvents(events: readonly Readonly<T>[]): void;

  // Broadcast lifecycle events
  notifyStart(contextTime: ContextTime): void;
  notifyStop(contextTime: ContextTime): void;
  notifyJump(ticks: Ticks): void;
  notifySilence(contextTime: ContextTime): void;

  // Internal: process pending operations
  processPendingOperations(start: Ticks, end: Ticks): void;
}
```

**Responsibilities:**
- Maintain active Sources map
- Aggregate events from all sources during generation
- Route events back to correct consumer
- Broadcast lifecycle events to Sources that implement them
- Handle quantized add/remove operations

### 3. Transport API Changes

#### Constructor

Remove the listener parameter:

```typescript
// Old
constructor(context: Context, listener: TransportListener<T>)

// New
constructor(context: Context)
```

#### New Methods

```typescript
type QuantizeBoundary = 'bar' | 'beat' | 'sixteenth' | 'immediate';

class Transport<T extends TransportEvent> {
  // Add an Source, optionally quantized to musical boundary
  addSource(
    source: Source<T>,
    boundary: QuantizeBoundary = 'immediate'
  ): void;

  // Remove an Source by ID, optionally quantized to musical boundary
  removeSource(
    id: string,
    boundary: QuantizeBoundary = 'immediate'
  ): void;

  // Get Source by ID
  getSource(id: string): Source<T> | undefined;

  // Get all active Sources
  getSources(): ReadonlyArray<Source<T>>;
}
```

#### Internal Changes

- Transport delegates to `SourceManager` for all Source operations
- User interacts only with Transport API (manager is private implementation detail)

### 4. Quantized Add/Remove

Operations can be quantized to musical boundaries for synchronized changes during playback.

#### Pending Operations Queue

```typescript
type PendingOperation =
  | { type: 'add'; source: Source<T>; ticks: Ticks }
  | { type: 'remove'; sourceId: string; ticks: Ticks };
```

#### Operation Flow

When `addSource(source, 'beat')` or `removeSource(id, 'bar')` is called:

1. **Calculate target tick**: Convert boundary ('beat', 'bar', 'sixteenth') to the next occurrence tick
2. **Queue operation**: Store in `pendingOperations` array with target tick
3. **Process during generation**: In `generateEvents(start, end)`, check if any pending operations have `ticks` in range `[start, end)`
4. **Apply operations**: Execute matching operations before generating events
   - For `add`: Call `onStart(contextTime)` if implemented, add to active sources
   - For `remove`: Call `silence(contextTime)` if implemented, remove from active sources
5. **Continue generation**: Generate events from all currently active Sources

#### Immediate Operations

`boundary: 'immediate'` bypasses the queue and applies instantly (even mid-sixteenth).

#### Edge Cases

- If Transport is stopped, all operations apply immediately (no quantization needed)
- Multiple operations for same boundary execute in order received
- When Transport jumps, pending operations are cleared (or applied immediately)

### 5. BaseSource Helper

Abstract base class providing common utilities:

```typescript
export abstract class BaseSource<T extends TransportEvent>
  implements Source<T> {

  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  // Subclasses must implement
  abstract generator(start: Ticks, end: Ticks): readonly Readonly<T>[];
  abstract consumer(event: Readonly<T>): void;

  // Optional lifecycle - subclasses can override
  onStart?(contextTime: ContextTime): void;
  onStop?(contextTime: ContextTime): void;
  onJump?(ticks: Ticks): void;
  silence?(contextTime: ContextTime): void;

  // Helper: Track last generated tick to prevent duplication
  // Automatically cleared on onJump and onStop
  protected lastGeneratedTick: Ticks = -1;

  protected shouldGenerate(eventTick: Ticks): boolean {
    return eventTick > this.lastGeneratedTick;
  }
}
```

**Notes:**
- `lastGeneratedTick` is a simple deduplication helper
- Works for basic cases, cleared on jump/stop
- Sources with lookahead or complex state can override this behavior
- Provides default lifecycle hooks that clear state

### 6. File Structure

```
packages/transport/src/
├── sources/
│   ├── BaseSource.ts      # Abstract base class
│   ├── StepSequencer.ts         # Example implementation
│   └── Timeline.ts              # Future: automation timeline
├── SourceManager.ts        # NEW: Manages collection of Sources
├── Transport.ts                 # Modified: Uses SourceManager
├── Scheduler.ts                 # Modified: Handles sourceId
├── Clock.ts
├── Position.ts
├── Tempo.ts
├── Timer.ts
├── types.ts                     # Updated: Source interface, TransportEvent
└── index.ts                     # Updated exports
```

### 7. Error Handling

#### Duplicate ID on Add
- **Action**: Throw `Error("Source with id '${id}' already exists")`
- **Rationale**: IDs must be unique for remove operations

#### Remove Non-existent ID
- **Action**: Silent no-op (no error)
- **Rationale**: Idempotent removes, resilient code

#### Source Throws During Generation/Consumption
- **Action**: Catch, log error, skip that Source for this cycle
- **Rationale**: One broken Source shouldn't crash entire Transport

## Migration

### Breaking Changes

This is a **breaking change** to the Transport constructor signature.

```typescript
// Old way
const transport = new Transport(context, myListener);

// New way - convert listener to Source
const eventSource: Source = {
  id: 'main-sequencer',
  generator: myListener.generator,
  consumer: myListener.consumer,
  onStart: myListener.onStart,
  onStop: myListener.onStop,
  onJump: myListener.onJump,
  silence: myListener.silence,
};

const transport = new Transport(context);
transport.addSource(eventSource, 'immediate');
```

### Version Strategy

Immediate breaking change - no deprecation period. This will be a major version bump.

## Implementation Order

1. **Create Source interface and BaseSource**
   - Define new interface in `types.ts`
   - Create `sources/BaseSource.ts`
   - Update `TransportEvent` to include `sourceId`

2. **Create SourceManager class**
   - Implement active sources map
   - Implement event aggregation and routing
   - Implement lifecycle notification broadcasting
   - Add error handling for Source failures

3. **Refactor Transport to use SourceManager**
   - Remove listener from constructor
   - Add SourceManager as private member
   - Implement `addSource()`, `removeSource()`, getters
   - Delegate generation/consumption to SourceManager

4. **Add quantization logic**
   - Implement pending operations queue in SourceManager
   - Add tick calculation for boundaries (bar/beat/sixteenth)
   - Process pending operations during generation phase
   - Handle edge cases (stopped transport, jumps)

5. **Update Scheduler**
   - Ensure events flow correctly with sourceId
   - Verify no changes needed to core scheduler logic

6. **Update tests**
   - Update existing Transport tests for new API
   - Add SourceManager tests
   - Add BaseSource tests
   - Add multi-Source integration tests
   - Add quantization tests

7. **Create example StepSequencer implementation**
   - Extend BaseSource
   - Demonstrate pattern generation
   - Show lifecycle hook usage
   - Serve as reference for other Source implementations

## Future Considerations

### Mute/Solo Groups

Add grouping functionality for DAW-like track control:

```typescript
interface Source {
  id: string;
  group?: string;  // Optional group identifier
  // ...
}

transport.muteGroup('drums');
transport.soloGroup('melody');
```

### Priority/Ordering

If event ordering becomes important beyond chronological:

```typescript
interface Source {
  priority?: number;  // Higher priority fires first for same tick
  // ...
}
```

### Performance Monitoring

Add metrics for Source performance:

```typescript
transport.getSourceMetrics(id);
// Returns: { avgGenerationTime, avgConsumptionTime, eventCount, errorCount }
```

## Open Questions

- **Pending operations on jump**: Should they be cleared or applied immediately?
  - **Recommendation**: Clear them - jump indicates intentional transport repositioning, queued operations are now stale

- **Source removal during its own event consumption**: What happens if an Source removes itself?
  - **Recommendation**: Allow it, but removal happens after current event batch completes

- **Maximum Sources limit**: Should there be a limit to prevent performance issues?
  - **Recommendation**: No hard limit initially, monitor in practice

## Success Criteria

- Multiple Sources can run simultaneously
- Events from all sources merge correctly in chronological order
- Add/remove operations work correctly during playback
- Quantized boundaries work accurately (bar/beat/sixteenth)
- Lifecycle hooks fire correctly for all Sources
- No timing drift or precision loss
- All existing Transport functionality still works
- Clean, intuitive API for users

## References

- Current implementation: `packages/transport/src/Transport.ts`
- Current implementation: `packages/transport/src/Scheduler.ts`
- Transport documentation: `packages/transport/DOCUMENTATION.md`
