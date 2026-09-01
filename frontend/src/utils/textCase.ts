/**
 * Advanced Utility for Automatic Caps, Small Detection, Casing Correction & Grammar Formatting.
 * Fixes ALL CAPS, all lowercase, mixed casing, comma-separated lists, and preserves academic & tech acronyms.
 */

const ACRONYMS = new Set([
  'KPRCAS', 'IT', 'AI', 'HOD', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BCA', 'BSC', 'MSC',
  'MCA', 'IEEE', 'ACM', 'ISO', 'NAAC', 'NIRF', 'UGC', 'AICTE', 'PHD', 'DR', 'PROF', 'DEPT',
  'PDF', 'URL', 'QR', 'API', 'UI', 'UX', 'HTML', 'CSS', 'JS', 'SQL', 'CTC', 'LPA', 'HR',
  'COIMBATORE', 'INDIA', 'KPR', 'NSS', 'NCC', 'PYRS', 'JAVA', 'CNN', 'RNN', 'ML', 'PHP',
  'ANTIGRAVITY', 'ANTIGRAVITITY', 'SIH', 'IoT', 'DBMS'
]);

const PROPER_NOUNS: { [key: string]: string } = {
  'HTML': 'HTML',
  'CSS': 'CSS',
  'JS': 'JS',
  'JAVA': 'Java',
  'AI': 'AI',
  'ML': 'ML',
  'ANTIGRAVITY': 'Antigravity',
  'ANTIGRAVITITY': 'Antigravity',
  'KPRCAS': 'KPRCAS',
  'IT': 'IT',
  'CSE': 'CSE',
  'DR': 'Dr.',
  'PROF': 'Prof.',
  'DEPT': 'Dept.',
  'PHD': 'PhD',
  'HOD': 'HOD'
};

const MINOR_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of', 'for', 'as'
]);

export const detectAndFixCase = (
  text: string,
  mode: 'auto' | 'sentence' | 'title' | 'upper' | 'lower' = 'auto'
): string => {
  if (!text || !text.trim()) return text;

  if (mode === 'upper') return text.toUpperCase();
  if (mode === 'lower') return text.toLowerCase();

  let cleanInput = text
    .replace(/national-level initiative/gi, 'academic initiative')
    .replace(/national level initiative/gi, 'academic initiative')
    .replace(/national-level/gi, '')
    .replace(/national level/gi, '')
    .replace(/([a-zA-Z0-9]+)\s*,\s*([a-zA-Z0-9]+)/g, '$1, $2');

  if (mode === 'title') {
    const words = cleanInput.split(/(\s+)/);
    let wordIdx = 0;
    return words.map(segment => {
      if (/^\s+$/.test(segment)) return segment;
      const upperWord = segment.toUpperCase().replace(/[^A-Z]/g, '');

      if (PROPER_NOUNS[upperWord]) return segment.replace(new RegExp(upperWord, 'i'), PROPER_NOUNS[upperWord]);
      if (ACRONYMS.has(upperWord)) return segment.toUpperCase();

      const cleanWord = segment.toLowerCase();
      if (wordIdx === 0 || !MINOR_WORDS.has(cleanWord)) {
        wordIdx++;
        return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
      }
      wordIdx++;
      return cleanWord;
    }).join('');
  }

  // Sentence Case / Auto mode
  const hasLetters = /[a-zA-Z]/.test(cleanInput);
  if (!hasLetters) return text;

  const isAllCaps = cleanInput === cleanInput.toUpperCase();
  const isAllLower = cleanInput === cleanInput.toLowerCase();

  // Standardize ALL CAPS or all lowercase to lowercase first so sentence split works properly
  if (isAllCaps || isAllLower) {
    cleanInput = cleanInput.toLowerCase();
  }

  // Split into sentences (by . ! ? or newlines)
  const sentenceRegex = /(.*?[.!?]+(?:\s+|$)|[^\n.!?]+[\n.!?]*)/g;
  const matches = cleanInput.match(sentenceRegex) || [cleanInput];

  const formattedSentences = matches.map(sentence => {
    if (!sentence.trim()) return sentence;

    // Capitalize first character of sentence
    let result = sentence;
    const firstLetterIdx = result.search(/[a-zA-Z]/);
    if (firstLetterIdx !== -1) {
      result =
        result.slice(0, firstLetterIdx) +
        result.charAt(firstLetterIdx).toUpperCase() +
        result.slice(firstLetterIdx + 1);
    }

    // Preserve acronyms & proper tech names
    const tokens = result.split(/(\b[A-Za-z0-9]+\b)/);
    return tokens.map(token => {
      const upperToken = token.toUpperCase();
      if (PROPER_NOUNS[upperToken]) {
        return PROPER_NOUNS[upperToken];
      }
      if (ACRONYMS.has(upperToken)) {
        return upperToken;
      }
      return token;
    }).join('');
  });

  let output = formattedSentences.join('');
  // Ensure single spacing
  output = output.replace(/\s+/g, ' ').trim();
  // Ensure ending punctuation
  if (!/[.!?]$/.test(output)) {
    output += '.';
  }
  return output;
};
