export function expandPatternSequence(sequence: string): string[] {
  if (!sequence) return [];

  const expanded: string[] = [];
  let i = 0;

  while (i < sequence.length) {
    const currentChar = sequence[i];
    if (currentChar === undefined) break;

    // Check for number prefix
    let count = 1;
    if (/\d/.test(currentChar)) {
      count = parseInt(currentChar, 10);
      i++;
    }

    // Get pattern name
    if (i < sequence.length) {
      const patternName = sequence[i];
      if (patternName !== undefined) {
        for (let j = 0; j < count; j++) {
          expanded.push(patternName);
        }
      }
    }
    i++;
  }

  return expanded;
}
