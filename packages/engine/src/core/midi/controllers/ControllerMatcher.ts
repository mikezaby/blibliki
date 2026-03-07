import MidiInputDevice from "../MidiInputDevice";
import MidiOutputDevice from "../MidiOutputDevice";
import { calculateSimilarity } from "../deviceMatcher";

export type MatchedControllerPorts = {
  input: MidiInputDevice;
  output: MidiOutputDevice;
};

export type ControllerLifecycle = {
  dispose?: () => void;
};

export type ControllerClass<
  TController extends ControllerLifecycle = ControllerLifecycle,
> = new (engineId: string, ports: MatchedControllerPorts) => TController;

export type ControllerMatcherDefinition = {
  id: string;
  klass: ControllerClass;
  inputCandidateNames: string[];
  outputCandidateNames?: string[];
  minScore?: number;
  maxInstances?: number;
};

type ScoredPort<TPort extends { id: string; name: string }> = {
  port: TPort;
  score: number;
};

type ScoredPair = {
  input: ScoredPort<MidiInputDevice>;
  output: ScoredPort<MidiOutputDevice>;
  score: number;
};

type ControllerBinding = {
  input: MidiInputDevice;
  output: MidiOutputDevice;
  controller: ControllerLifecycle;
};

const DEFAULT_MIN_SCORE = 0.6;
const DEFAULT_MAX_INSTANCES = 1;

export class ControllerMatcherRegistry {
  private readonly engineId: string;
  private readonly matchers: ControllerMatcherDefinition[] = [];
  private bindings = new Map<string, ControllerBinding[]>();

  constructor(engineId: string, matchers: ControllerMatcherDefinition[] = []) {
    this.engineId = engineId;
    this.matchers = [...matchers];
  }

  addMatcher(matcher: ControllerMatcherDefinition) {
    const existingIndex = this.matchers.findIndex((m) => m.id === matcher.id);
    if (existingIndex >= 0) {
      this.disposeBindings(this.matchers[existingIndex]!.id);
      this.matchers.splice(existingIndex, 1, matcher);
      return;
    }

    this.matchers.push(matcher);
  }

  reconcile(
    inputDevices: MidiInputDevice[],
    outputDevices: MidiOutputDevice[],
  ) {
    this.matchers.forEach((matcher) => {
      this.reconcileMatcher(matcher, inputDevices, outputDevices);
    });
  }

  dispose() {
    this.matchers.forEach((matcher) => {
      this.disposeBindings(matcher.id);
    });
    this.bindings.clear();
  }

  private reconcileMatcher(
    matcher: ControllerMatcherDefinition,
    inputDevices: MidiInputDevice[],
    outputDevices: MidiOutputDevice[],
  ) {
    const maxInstances = matcher.maxInstances ?? DEFAULT_MAX_INSTANCES;
    const minScore = matcher.minScore ?? DEFAULT_MIN_SCORE;

    const desiredPairs = this.findBestPairs({
      inputDevices,
      outputDevices,
      inputCandidateNames: matcher.inputCandidateNames,
      outputCandidateNames:
        matcher.outputCandidateNames ?? matcher.inputCandidateNames,
      minScore,
      maxInstances,
    });

    const currentBindings = this.bindings.get(matcher.id) ?? [];
    const nextBindings: ControllerBinding[] = [];

    desiredPairs.forEach((pair) => {
      const existing = currentBindings.find(
        (binding) =>
          binding.input.id === pair.input.port.id &&
          binding.output.id === pair.output.port.id,
      );

      if (existing) {
        nextBindings.push(existing);
        return;
      }

      const controller = new matcher.klass(this.engineId, {
        input: pair.input.port,
        output: pair.output.port,
      });

      nextBindings.push({
        input: pair.input.port,
        output: pair.output.port,
        controller,
      });
    });

    currentBindings.forEach((binding) => {
      const isKept = nextBindings.some(
        (next) =>
          next.input.id === binding.input.id &&
          next.output.id === binding.output.id,
      );
      if (isKept) return;

      binding.controller.dispose?.();
    });

    if (nextBindings.length === 0) {
      this.bindings.delete(matcher.id);
      return;
    }

    this.bindings.set(matcher.id, nextBindings);
  }

  private findBestPairs({
    inputDevices,
    outputDevices,
    inputCandidateNames,
    outputCandidateNames,
    minScore,
    maxInstances,
  }: {
    inputDevices: MidiInputDevice[];
    outputDevices: MidiOutputDevice[];
    inputCandidateNames: string[];
    outputCandidateNames: string[];
    minScore: number;
    maxInstances: number;
  }): ScoredPair[] {
    const scoredInputs = this.scorePorts(
      inputDevices,
      inputCandidateNames,
      minScore,
    );
    const scoredOutputs = this.scorePorts(
      outputDevices,
      outputCandidateNames,
      minScore,
    );

    if (scoredInputs.length === 0 || scoredOutputs.length === 0) return [];

    const candidatePairs: ScoredPair[] = [];

    scoredInputs.forEach((input) => {
      scoredOutputs.forEach((output) => {
        candidatePairs.push({
          input,
          output,
          score: (input.score + output.score) / 2,
        });
      });
    });

    candidatePairs.sort((a, b) => b.score - a.score);

    const selectedPairs: ScoredPair[] = [];
    const usedInputIds = new Set<string>();
    const usedOutputIds = new Set<string>();

    candidatePairs.some((pair) => {
      if (usedInputIds.has(pair.input.port.id)) return false;
      if (usedOutputIds.has(pair.output.port.id)) return false;

      selectedPairs.push(pair);
      usedInputIds.add(pair.input.port.id);
      usedOutputIds.add(pair.output.port.id);

      return selectedPairs.length >= maxInstances;
    });

    return selectedPairs;
  }

  private scorePorts<TPort extends { id: string; name: string }>(
    ports: TPort[],
    candidateNames: string[],
    minScore: number,
  ): ScoredPort<TPort>[] {
    return ports
      .map((port) => {
        const bestScore = candidateNames.reduce((best, candidateName) => {
          const score = calculateSimilarity(candidateName, port.name);
          return Math.max(best, score);
        }, 0);

        if (bestScore < minScore) return null;

        return { port, score: bestScore };
      })
      .filter((value): value is ScoredPort<TPort> => value !== null)
      .sort((a, b) => b.score - a.score);
  }

  private disposeBindings(matcherId: string) {
    const currentBindings = this.bindings.get(matcherId) ?? [];
    currentBindings.forEach((binding) => {
      binding.controller.dispose?.();
    });
    this.bindings.delete(matcherId);
  }
}

export const controllerMatchers: ControllerMatcherDefinition[] = [];
