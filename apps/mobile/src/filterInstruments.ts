import type { IInstrument } from "@blibliki/models";

export function filterInstruments(instruments: IInstrument[], query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return instruments;
  }

  // Every term has to appear somewhere in the name, so typing more words
  // narrows rather than widens — what a search field is expected to do when you
  // keep typing, and it makes term order irrelevant.
  return instruments.filter((instrument) => {
    const name = instrument.name.toLowerCase();

    return terms.every((term) => name.includes(term));
  });
}
