/**
 * The shop's initials for the language card's badge: the first letter of
 * up to two words ("Café Maw" → "CM"). A "letter" is one base character
 * with its combining marks, so a Burmese consonant keeps its vowel signs
 * ("ကော်ဖီ" → "ကော်"). Shop data — never translated. Pure.
 */
export function shopInitials(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.match(/^\P{M}\p{M}*/u)?.[0] ?? "")
    .join("")
    .toLocaleUpperCase();
}
