export function expandPatternSequence(input: string): string[] {
  const result: string[] = [];
  let num = "";

  for (const ch of input) {
    if (ch >= "0" && ch <= "9") {
      num += ch;
    } else {
      const count = Number(num);
      for (let i = 0; i < count; i++) {
        result.push(ch);
      }
      num = "";
    }
  }

  return result.map((v) => v.toUpperCase());
}
