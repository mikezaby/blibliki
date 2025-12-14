/**
 * Utilities for fuzzy matching MIDI device names across different platforms
 *
 * MIDI devices can have different names in browser vs Node.js:
 * - Browser: "Launchkey Mini MK3 MIDI 1"
 * - Node.js: "Launchkey Mini MK3:Launchkey Mini MK3 MIDI 1 20:0"
 *
 * This module provides fuzzy matching to find the same physical device
 * across platforms based on name similarity.
 */

/**
 * Normalizes a MIDI device name by:
 * - Converting to lowercase
 * - Removing common suffixes/prefixes
 * - Removing port numbers and ALSA identifiers
 * - Removing extra whitespace
 * - Removing special characters
 */
export function normalizeDeviceName(name: string): string {
  let normalized = name.toLowerCase();

  // First, remove ALSA port numbers (e.g., "20:0" at the very end)
  // Do this BEFORE splitting by colons
  normalized = normalized.replace(/\s+\d+:\d+\s*$/g, "");

  // Remove colon-separated duplicates (Node.js format: "Device:Device Port")
  const parts = normalized.split(":");
  if (parts.length > 1) {
    // Take the longest part as it usually has more info
    normalized = parts.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
    );
  }

  // Remove common port descriptors (but keep the number if it's part of the device name)
  // This regex only matches MIDI/Input/Output/Port at the END of the string
  normalized = normalized.replace(
    /\s+(midi|input|output|port)(\s+\d+)?$/gi,
    "",
  );

  // Remove "device" prefix if present at the start
  normalized = normalized.replace(/^device\s+/gi, "");

  // Remove multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Extracts core device name tokens for matching
 * Removes generic words and focuses on manufacturer/model identifiers
 */
export function extractCoreTokens(name: string): string[] {
  const normalized = normalizeDeviceName(name);

  // Split into tokens
  const tokens = normalized.split(/[\s\-_:]+/);

  // Filter out very short tokens and common generic words
  const genericWords = new Set([
    "midi",
    "input",
    "output",
    "port",
    "device",
    "in",
    "out",
  ]);

  return tokens.filter((token) => token.length > 1 && !genericWords.has(token));
}

/**
 * Calculates Levenshtein distance between two strings
 * Used for fuzzy string matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    if (matrix[0]) {
      matrix[0][j] = j;
    }
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const prevRow = matrix[i - 1];
      const currRow = matrix[i];
      const prevCell = currRow?.[j - 1];
      const diagCell = prevRow?.[j - 1];

      const prevCellInRow = prevRow?.[j];
      if (
        currRow &&
        prevCellInRow !== undefined &&
        prevCell !== undefined &&
        diagCell !== undefined
      ) {
        currRow[j] = Math.min(
          prevCellInRow + 1, // deletion
          prevCell + 1, // insertion
          diagCell + cost, // substitution
        );
      }
    }
  }

  const lastRow = matrix[len1];
  return lastRow?.[len2] ?? 0;
}

/**
 * Calculates similarity score between two device names
 * Returns a score between 0 (no match) and 1 (perfect match)
 *
 * Uses multiple strategies:
 * 1. Exact normalized match (score: 1.0)
 * 2. Token overlap (Jaccard similarity)
 * 3. String similarity (based on Levenshtein distance)
 * 4. Substring matching
 */
export function calculateSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeDeviceName(name1);
  const normalized2 = normalizeDeviceName(name2);

  // Exact match after normalization
  if (normalized1 === normalized2) {
    return 1.0;
  }

  const tokens1 = new Set(extractCoreTokens(name1));
  const tokens2 = new Set(extractCoreTokens(name2));

  // If no tokens extracted, fall back to pure string similarity
  if (tokens1.size === 0 || tokens2.size === 0) {
    const maxLen = Math.max(normalized1.length, normalized2.length);
    if (maxLen === 0) return 0;
    const distance = levenshteinDistance(normalized1, normalized2);
    return 1 - distance / maxLen;
  }

  // Calculate Jaccard similarity for tokens
  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  const jaccardScore = intersection.size / union.size;

  // Calculate string similarity
  const maxLen = Math.max(normalized1.length, normalized2.length);
  const distance = levenshteinDistance(normalized1, normalized2);
  const stringScore = 1 - distance / maxLen;

  // Check for substring matches
  const substringScore =
    normalized1.includes(normalized2) || normalized2.includes(normalized1)
      ? 0.8
      : 0;

  // Weighted combination of scores
  // Token overlap is most important, then string similarity, then substring
  const finalScore =
    jaccardScore * 0.5 + stringScore * 0.3 + substringScore * 0.2;

  return finalScore;
}

/**
 * Finds the best matching device name from a list of candidates
 * Returns the best match and its confidence score
 *
 * @param targetName - The name to match against
 * @param candidateNames - List of possible matches
 * @param threshold - Minimum similarity score to consider a match (default: 0.6)
 * @returns Best match and score, or null if no match above threshold
 */
export function findBestMatch(
  targetName: string,
  candidateNames: string[],
  threshold = 0.6,
): { name: string; score: number } | null {
  let bestMatch: { name: string; score: number } | null = null;

  for (const candidateName of candidateNames) {
    const score = calculateSimilarity(targetName, candidateName);

    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { name: candidateName, score };
    }
  }

  return bestMatch;
}
