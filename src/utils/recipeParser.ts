import { getCopy } from '../i18n/translations';
import { Ingredient, InstructionStep, Language, Recipe, SocialPlatform, TranscriptSegment } from '../types/recipe';

export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function parseTimestampToSec(raw: string): number {
  const clean = raw.trim().replace(/[[\]()]/g, '').replace(/,\d+$/, '');
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const num = parseInt(clean, 10);
  return Number.isNaN(num) ? 0 : num;
}

export function detectPlatformFromUrl(url: string): SocialPlatform | null {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) return 'facebook';
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('youtube-nocookie.com')) {
    return 'youtube';
  }
  return null;
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (host.includes('youtu.be') && segments[0]) {
      return segments[0].replace(/[^A-Za-z0-9_-]/g, '') || null;
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const vParam = parsed.searchParams.get('v');
      if (vParam) return vParam.replace(/[^A-Za-z0-9_-]/g, '') || null;

      if (
        segments.length >= 2 &&
        ['shorts', 'embed', 'live', 'v'].includes(segments[0].toLowerCase())
      ) {
        return segments[1].replace(/[^A-Za-z0-9_-]/g, '') || null;
      }
    }
  } catch {
    // Ignore malformed URLs
  }
  return null;
}

export function extractCreatorHandleFromUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const atSegment = segments.find((s) => s.startsWith('@'));
    if (atSegment) return atSegment;
    if (
      parsed.hostname.includes('instagram.com') &&
      segments[0] &&
      !['reel', 'reels', 'p', 'tv', 'stories', 'share'].includes(segments[0].toLowerCase())
    ) {
      return `@${segments[0]}`;
    }
    if (
      parsed.hostname.includes('facebook.com') &&
      segments[0] &&
      !['reel', 'reels', 'watch', 'share', 'video', 'videos'].includes(segments[0].toLowerCase())
    ) {
      return `@${segments[0]}`;
    }
    if (
      parsed.hostname.includes('youtube.com') &&
      segments.length >= 2 &&
      ['c', 'user'].includes(segments[0].toLowerCase())
    ) {
      return `@${segments[1]}`;
    }
  } catch {
    // Ignore invalid partial URLs
  }
  return '';
}

export function formatPlatformLabel(platform: SocialPlatform, lang: Language = 'en'): string {
  if (lang === 'he') {
    switch (platform) {
      case 'instagram':
        return 'אינסטגרם';
      case 'tiktok':
        return 'טיקטוק';
      case 'facebook':
        return 'פייסבוק';
      case 'youtube':
        return 'יוטיוב';
    }
  }
  switch (platform) {
    case 'instagram':
      return 'Instagram';
    case 'tiktok':
      return 'TikTok';
    case 'facebook':
      return 'Facebook';
    case 'youtube':
      return 'YouTube';
  }
}

export function formatScaledAmount(amount: number | null, factor: number): string {
  if (amount === null) return '';
  const scaled = amount * factor;
  const rounded = Math.round(scaled * 100) / 100;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  const fractions: Array<[number, string]> = [
    [0.25, '1/4'],
    [0.33, '1/3'],
    [0.5, '1/2'],
    [0.66, '2/3'],
    [0.75, '3/4'],
  ];

  for (const [val, label] of fractions) {
    if (Math.abs(frac - val) < 0.04) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, '');
}

function extractDurationSecFromInstruction(text: string): number | undefined {
  const minMatch = text.match(
    /(\d+(?:-\d+)?)\s*(?:min|mins|minute|minutes|דק(?:ה|ות|')?)(?![\p{L}\p{N}])/iu
  );
  if (minMatch) {
    const firstNum = parseInt(minMatch[1].split('-')[0], 10);
    if (!Number.isNaN(firstNum) && firstNum > 0 && firstNum <= 180) {
      return firstNum * 60;
    }
  }
  const secMatch = text.match(
    /(\d+(?:-\d+)?)\s*(?:sec|secs|second|seconds|שני(?:יה|ות)?)(?![\p{L}\p{N}])/iu
  );
  if (secMatch) {
    const firstNum = parseInt(secMatch[1].split('-')[0], 10);
    if (!Number.isNaN(firstNum) && firstNum > 0 && firstNum <= 600) {
      return firstNum;
    }
  }
  return undefined;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'into', 'from', 'that', 'this', 'your', 'until',
  'over', 'then', 'about', 'more', 'just', 'some', 'make', 'step', 'minutes', 'seconds',
  'את', 'של', 'עם', 'על', 'אל', 'מן', 'כדי', 'עד', 'שלב', 'דקות', 'שניות',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

export interface ParsedSocialContent {
  suggestedTitle: string;
  dishName: string;
  videoTitle: string;
  tags: string[];
  ingredients: Ingredient[];
  steps: InstructionStep[];
  transcript: TranscriptSegment[];
  videoDurationSec: number;
  hasExplicitRecipeContent: boolean;
}

// Measurement / portion units (keep food nouns like egg/ביצה as items, not units)
const KNOWN_UNITS = new Set([
  'g', 'gr', 'grams', 'gram', 'kg', 'mg', 'ml', 'l', 'tbsp', 'tablespoon', 'tablespoons',
  'tsp', 'teaspoon', 'teaspoons', 'cup', 'cups', 'oz', 'lb', 'lbs', 'clove', 'cloves',
  'slice', 'slices', 'handful', 'sprig', 'sprigs', 'head', 'heads', 'stalk', 'stalks',
  'pinch', 'piece', 'pieces', 'whole', 'can', 'cans', 'pack', 'package', 'packages',
  'jar', 'bunch', 'dash', 'drizzle', 'drop', 'drops', 'scoop', 'scoops', 'bag', 'bags',
  'גרם', 'ג\'', 'קג', 'ק"ג', 'מל', 'מ"ל', 'ליטר', 'כף', 'כפות', 'כפית', 'כפיות',
  'כוס', 'כוסות', 'יחידה', 'יחידות', 'שיני', 'שן', 'שיניים', 'חופן', 'קורט',
  'פרוסה', 'פרוסת', 'פרוסות', 'חבילה', 'חבילת', 'חבילות', 'גביע', 'קופסה', 'קופסת', 'קופסאות',
  'פחית', 'צרור', 'שקית', 'קוביית', 'קוביות',
]);

const UNIT_PATTERN =
  '(?:grams?|gr|g|kg|mg|ml|l|tbsp|tablespoons?|tsp|teaspoons?|cups?|oz|lbs?|cloves?|slices?|handful|sprigs?|heads?|stalks?|pinch|pieces?|whole|cans?|packages?|pack|jar|bunch|dash|drizzle|drops?|scoops?|bags?|גרם|ג\'|ק"ג|קג|מ"ל|מל|ליטר|כפות|כף|כפיות|כפית|כוסות|כוס|יחידות|יחידה|שיניים|שיני|שן|חופן|קורט|פרוסות|פרוסת|פרוסה|חבילות|חבילת|חבילה|גביע|קופסאות|קופסת|קופסה|פחית|צרור|שקית|קוביות|קוביית)';

const NON_FOOD_UNITS_OR_WORDS = new Set([
  'min', 'mins', 'minute', 'minutes', 'sec', 'secs', 'second', 'seconds', 'hr', 'hrs', 'hour', 'hours',
  'deg', 'degree', 'degrees', 'c', 'f', 'step', 'steps', 'serving', 'servings', 'like', 'likes',
  'comment', 'comments', 'view', 'views', 'day', 'days', 'kcal', 'cal', 'calories', 'percent',
  'דקה', 'דקות', 'שניה', 'שנייה', 'שניות', 'שעה', 'שעות', 'מעלות', 'שלב', 'שלבים', 'מנה', 'מנות', 'קלוריות', 'אחוז', 'אחוזים',
]);

// Non-ingredient count nouns common in yields, instructions, shapes, tools & finished dishes
const NON_INGREDIENT_COUNT_NOUNS = new Set([
  'ball', 'balls', 'circle', 'circles', 'disc', 'discs', 'disk', 'disks', 'part', 'parts',
  'portion', 'portions', 'batch', 'batches', 'side', 'sides', 'sheet', 'sheets', 'layer', 'layers',
  'pan', 'pans', 'bowl', 'bowls', 'tray', 'trays', 'towel', 'towels', 'rack', 'racks', 'plate', 'plates',
  'pita', 'pitas', 'flatbread', 'flatbreads', 'cookie', 'cookies', 'muffin', 'muffins',
  'patty', 'patties', 'meatball', 'meatballs', 'way', 'ways', 'time', 'times', 'thing', 'things',
  'כדור', 'כדורים', 'עיגול', 'עיגולים', 'חלק', 'חלקים', 'חתיכה', 'חתיכות',
  'צד', 'צדדים', 'דף', 'דפים', 'נייר', 'שכבה', 'שכבות',
  'קערה', 'קערות', 'מחבת', 'מחבתות', 'תבנית', 'תבניות', 'מגבת', 'צלחת', 'צלחות',
  'פיתה', 'פיתות', 'לאפה', 'לאפות', 'רול', 'רולים', 'roll', 'rolls', 'עוגיה', 'עוגייה', 'עוגיות', 'לביבה', 'לביבות',
  'קציצה', 'קציצות', 'מאפין', 'מאפינס', 'דרך', 'דרכים', 'פעם', 'פעמים', 'כמות',
]);

const LEADING_DECOR_REGEX = /^[\s\-•*▪▫▪️▫️✅☑️✔️🔹🔸🟢🟡🔴🟠🥄🥣🧀🥚🧅🥒🧄🍅🍝🍗🧂🌶️🍋🫒🌿🛒👩‍🍳👨‍🍳🔥💡🚨~+]+/;

function stripLeadingDecor(line: string): string {
  return line.replace(LEADING_DECOR_REGEX, '').trim();
}

function normalizeQuotesAndUnits(input: string): string {
  return input
    .replace(/\u05F4/g, '"') // Hebrew gershayim -> ASCII double quote
    .replace(/\u05F3/g, "'"); // Hebrew geresh -> ASCII single quote
}

function normalizeUnicodeFractions(input: string): string {
  const unicodeFracs: Record<string, string> = {
    '½': '1/2',
    '¼': '1/4',
    '¾': '3/4',
    '⅓': '1/3',
    '⅔': '2/3',
  };
  // Insert space when a Unicode fraction is glued to a leading digit (e.g. "1½" -> "1 1/2", not "11/2")
  let out = normalizeQuotesAndUnits(input).replace(/(\d)(?=[½¼¾⅓⅔])/g, '$1 ');
  for (const [uni, ascii] of Object.entries(unicodeFracs)) {
    out = out.replaceAll(uni, ascii);
  }
  return out;
}

function normalizeTextQuantities(input: string): string {
  let out = normalizeUnicodeFractions(input)
    // Support European/Hebrew decimal commas when flanked strictly by digits (e.g. "1,5 כוסות")
    .replace(/(\d),(\d)/g, '$1.$2');
  // Strip approximate prefixes like "כ-150 מ\"ל", "~2 tbsp", "approx. 200 g", "about 1/2 cup"
  out = out.replace(
    /^(?:כ-?\s*(?=\d)|בערך\s+(?=\d)|~+\s*|approx\.?\s+|approximately\s+|about\s+|around\s+)/iu,
    ''
  );
  out = out
    .replace(/(?<![\p{L}\p{N}])(?:חצי|half(?:\s+(?:a|an))?)\s+/giu, '0.5 ')
    .replace(/(?<![\p{L}\p{N}])(?:רבע|quarter(?:\s+(?:a|an))?)\s+/giu, '0.25 ')
    .replace(/(?<![\p{L}\p{N}])(?:שליש|a\s+third(?:\s+of)?)\s+/giu, '0.33 ')
    .replace(/^(?:שני|שתי|two)\s+/iu, '2 ')
    .replace(/^(?:שלוש|שלושה|three)\s+/iu, '3 ')
    .replace(/^(?:ארבע|ארבעה|four)\s+/iu, '4 ')
    .replace(/^(?:אחד|אחת|one)\s+/iu, '1 ');
  return out;
}

function parseNumericToken(qtyToken: string): number | null {
  const trimmed = qtyToken.trim().replace(/^~/, '');
  // Numeric range like "1-2" or "2–3" -> use first numeric bound
  if (/^\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?$/.test(trimmed)) {
    const first = parseFloat(trimmed.split(/[-–]/)[0]);
    return Number.isNaN(first) ? null : first;
  }
  if (trimmed.includes(' ')) {
    const [whole, frac] = trimmed.split(/\s+/);
    const [n, d] = frac.split('/').map(Number);
    return Number(whole) + (d ? n / d : 0);
  }
  if (trimmed.includes('/')) {
    const [n, d] = trimmed.split('/').map(Number);
    return d ? n / d : null;
  }
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}

function parseIngredientLine(raw: string, idx: number): Ingredient {
  const cleaned = stripLeadingDecor(raw);
  const normalized = normalizeTextQuantities(cleaned);

  // 1. Leading number (incl. ranges like "1-2") with attached/separated unit + item
  const attachedQtyMatch = normalized.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\s*([^\s\d]+)\s+(.+)$/
  );
  if (attachedQtyMatch) {
    const amt = parseNumericToken(attachedQtyMatch[1]);
    const token2 = attachedQtyMatch[2].replace(/[.,]$/, '');
    const rest = attachedQtyMatch[3].trim();

    if (KNOWN_UNITS.has(token2.toLowerCase())) {
      return {
        id: `parsed-ing-${idx + 1}`,
        amount: amt,
        unit: token2,
        item: rest.replace(/^(?:of|של)\s+/iu, '').trim(),
      };
    }

    return {
      id: `parsed-ing-${idx + 1}`,
      amount: amt,
      unit: '',
      item: `${token2} ${rest}`.trim(),
    };
  }

  // 2. Leading number directly followed by item (e.g. "2 זוקיני", "1 בצל", "1 ביצה", "3 eggs")
  const simpleQtyItemMatch = normalized.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\s+(.+)$/
  );
  if (simpleQtyItemMatch) {
    const amt = parseNumericToken(simpleQtyItemMatch[1]);
    const rest = simpleQtyItemMatch[2].trim();
    const attachedUnitMatch = rest.match(new RegExp(`^(${UNIT_PATTERN})(?![\\p{L}\\p{N}])\\s*(.*)$`, 'iu'));
    if (attachedUnitMatch && attachedUnitMatch[2].trim()) {
      return {
        id: `parsed-ing-${idx + 1}`,
        amount: amt,
        unit: attachedUnitMatch[1],
        item: attachedUnitMatch[2].replace(/^(?:of|של)\s+/iu, '').trim(),
      };
    }
    return {
      id: `parsed-ing-${idx + 1}`,
      amount: amt,
      unit: '',
      item: rest,
    };
  }

  // 3. Unit-first without explicit leading digit (e.g. "פרוסת גבינה צהובה לייט 9%", "קורט מלח", "pinch of salt")
  const unitFirstRegex = new RegExp(
    `^(${UNIT_PATTERN})(?![\\p{L}\\p{N}])\\s+(?:of\\s+|של\\s+)?(.+)$`,
    'iu'
  );
  const unitFirstMatch = normalized.match(unitFirstRegex);
  if (unitFirstMatch) {
    return {
      id: `parsed-ing-${idx + 1}`,
      amount: null,
      unit: unitFirstMatch[1],
      item: unitFirstMatch[2].trim(),
    };
  }

  // 4. Plain pantry item (e.g. "מלח ופלפל", "salt and pepper")
  return {
    id: `parsed-ing-${idx + 1}`,
    amount: null,
    unit: '',
    item: normalizeQuotesAndUnits(cleaned),
  };
}

const CULINARY_VERB_REGEX =
  /(?<![\p{L}\p{N}])(chop|dice|slice|mince|sear|boil|simmer|whisk|mix|fold|toss|bake|roast|fry|saute|sauté|drizzle|serve|heat|melt|pour|season|add|combine|blend|toast|cook|squeeze|sprinkle|preheat|transfer|knead|divide|roll|wrap|assemble|stuff|layer|לחמם|לחתוך|לקצוץ|לטגן|לבשל|לערבב|לאפות|להוסיף|להגיש|למזוג|לצרוב|לתבל|להקציף|לגרד|למעוך|ללוש|לרדד|לחלק|לצלות|לעטוף|לקפל|לגלגל|להשרות|להרטיב|להניח|למרוח|לפזר|קוצצים|קוצצת|חותכים|חותכת|מטגנים|מטגנת|מבשלים|מבשלת|מערבבים|מערבבת|אופים|אופה|מוסיפים|מוסיפה|מגישים|מגישה|צורבים|צורבת|מגרדים|מגרדת|מחממים|מחממת|להכניס|מכניסים|מכניסה|מחלקים|מחלקת|מרדדים|מרדדת|צולים|צולה|לשים|לשה|מגלגלים|מגלגלת|מקפלים|מקפלת|מתחילה לקפל|שמה|שמים|מניחה|מניחים|מורחת|מורחים|מפזרת|מפזרים|מתבלת|מתבלים|מרטיבה|מרטיבים|הרטבתי|טובלים|טובלת)(?![\p{L}\p{N}])/iu;

const STANDALONE_PANTRY_REGEX =
  /^(?:מלח ופלפל|מלח,?\s*פלפל(?:\s*שחור)?|מלח|פלפל שחור|שמן זית|תרסיס שמן|סוכר|אבקת אפייה|סודה לשתייה|מים|חמאה|טחינה גולמית|salt and pepper|salt & pepper|salt,?\s*pepper|olive oil|cooking spray|black pepper|kosher salt|water|butter|garlic powder|paprika)$/iu;

const MACRO_ONLY_ITEM_REGEX =
  /^(?:protein|carbs?|carbohydrates?|fats?|saturated\s*fat|trans\s*fat|fiber|sugar|sodium|kcal|cal|calories|חלבון|פחמימות|שומנים?|שומן\s*רווי|סיבים(?:\s*תזונתיים)?|קלוריות|נתרן)(?:\s+(?:per\s+(?:serving|portion|100g)|למנה|במנה|ליחידה|ל-?100\s*גרם))?$/iu;

function isNutritionOrMacroLine(line: string): boolean {
  const cleaned = line.replace(/[()[\]]/g, '').trim();
  if (!cleaned) return false;
  if (
    /^(?:nutrition(?:al)?(?:\s+(?:info|facts))?|macros?|per\s+serving|calories|ערכים\s*תזונתיים|ערכים\s*למנה|למנה|קלוריות)\s*[:|-]/iu.test(
      cleaned
    )
  ) {
    return true;
  }
  const macroHits =
    cleaned.match(
      /(?<![\p{L}\p{N}])(?:kcal|calories|protein|carbs|carbohydrates|saturated\s*fat|fiber|sodium|חלבון|פחמימות|קלוריות|סיבים)(?![\p{L}\p{N}])/giu
    ) || [];
  if (macroHits.length >= 2) return true;

  // Reject standalone macro stats like "28g protein", "12g carbs", "25 גרם חלבון" (preserving "1 scoop protein powder")
  const parsedProbe = parseIngredientLine(cleaned, 0);
  if (MACRO_ONLY_ITEM_REGEX.test(parsedProbe.item.trim())) {
    return true;
  }
  return false;
}

function isTemperatureLine(line: string): boolean {
  const cleaned = line.replace(/[()[\]]/g, '').trim();
  return (
    /^\d{2,3}\s*°\s*[cf](?:\b|\s|$)/iu.test(cleaned) ||
    /^\d{2,3}\s*(?:c|f|deg|degrees?|מעלות)(?:\s+(?:preheat|oven|bake|תנור|חום))?$/iu.test(cleaned) ||
    /^(?:preheat|bake\s+at|תנור\s+על|חום\s+בינוני)\s+.*\d{2,3}\s*°?\s*(?:[cf]|מעלות)?/iu.test(
      cleaned
    )
  );
}

function isMetadataOrYieldLine(line: string): boolean {
  const cleaned = line.replace(/[()[\]]/g, '').trim();
  return (
    /^(?:prep(?:\s*time)?|cook(?:\s*time)?|total\s*time|yield|serves|servings|makes|time|difficulty)\s*[:|]/iu.test(
      cleaned
    ) ||
    /(?:^|\|\s*)(?:זמן הכנה|זמן בישול|זמן אפייה|כמות|מנות|יחידות|מספיק ל)\s*[:|]/iu.test(cleaned) ||
    /^\(?\s*(?:זמן|כמות|prep|cook|yield|servings)[^)]*\)$/iu.test(line.trim()) ||
    isNutritionOrMacroLine(line) ||
    isTemperatureLine(line)
  );
}

function isUnitPrefixedLine(cleaned: string): boolean {
  const norm = normalizeTextQuantities(cleaned);
  return new RegExp(`^(${UNIT_PATTERN})(?![\\p{L}\\p{N}])\\s+.+`, 'iu').test(norm);
}

function isQuantifiedIngredientLine(cleaned: string): boolean {
  if (!cleaned || cleaned.length > 85) return false;
  if (isMetadataOrYieldLine(cleaned)) return false;
  if (/[.!?]$/.test(cleaned) && cleaned.split(/\s+/).length > 8) return false;
  const norm = normalizeTextQuantities(cleaned);

  const m = norm.match(
    new RegExp(
      `^(\\d+(?:\\.\\d+|\\/\\d+)?(?:\\s*[-–]\\s*\\d+(?:\\.\\d+)?)?)\\s*(?:${UNIT_PATTERN})?\\s*([^\\s].+)$`,
      'iu'
    )
  );
  if (!m) return false;

  const rest = m[2].trim();
  if (MACRO_ONLY_ITEM_REGEX.test(rest)) return false;
  const firstWord = rest.split(/\s+/)[0].replace(/[.,:%°]/g, '').toLowerCase();
  if (NON_FOOD_UNITS_OR_WORDS.has(firstWord)) return false;
  if (NON_INGREDIENT_COUNT_NOUNS.has(firstWord) && !KNOWN_UNITS.has(firstWord)) return false;

  // Reject numbered instructions unless the first word is a known measurement unit
  if (/^\d+[.):]\s+/.test(cleaned) && !KNOWN_UNITS.has(firstWord)) {
    return false;
  }

  // Reject lines that are predominantly cooking instructions with timers
  if (CULINARY_VERB_REGEX.test(cleaned) && extractDurationSecFromInstruction(cleaned)) {
    return false;
  }

  return true;
}

/**
 * Re-segments flattened single-line captions into proper discourse lines:
 * splits inline section headers, numbered steps, timestamps, and space-separated ingredient runs.
 */
function resegmentRecipeText(rawText: string): string {
  let out = normalizeQuotesAndUnits(rawText);

  // 1. Break before & after inline section headers even when preceded by emojis or spaces
  const headerKeywords = [
    'ingredients',
    'what you need',
    "what you'll need",
    'what youll need',
    'shopping list',
    'for the (?:sauce|dough|batter|filling|topping|glaze|marinade|dressing|crust|cream)',
    'instructions',
    'directions',
    'method',
    'preparation',
    'how to make(?: it)?',
    'steps',
    'transcript',
    'video transcript',
    'chapters',
    'מה צריך',
    'מה נצטרך',
    'מצרכים',
    'המצרכים',
    'רכיבים',
    'הרכיבים',
    'חומרים',
    'החומרים',
    'לרוטב',
    'לבצק',
    'למילוי',
    'לציפוי',
    'למרינדה',
    'לתערובת',
    'איך מכינים',
    'הוראות הכנה',
    'הוראות',
    'אופן ההכנה',
    'אופן הכנה',
    'שלבי הכנה',
    'תמלול הסרטון',
    'תמלול',
    'פרקים',
  ].join('|');

  const inlineHeaderRegex = new RegExp(
    `(?:[🛒👩‍🍳👨‍🍳🥣📝✨🔹🔸✅•]\\s*)?(?:${headerKeywords})(?:\\s+(?:ל[\\p{L}\\s]{2,18}|for\\s+[\\p{L}\\s]{2,18}))?\\s*[?:]+`,
    'giu'
  );
  out = out.replace(inlineHeaderRegex, (match) => `\n${match.trim()}\n`);

  // 1b. Break before inline social CTA promo sentences so they never merge into the last cooking step
  out = out.replace(
    /(?<=[.!?\s])\s*(?=(?:see more|follow for more|save this recipe|link in bio|subscribe|like and subscribe|למתכונים נוספים|למתכון המלא|עקבו לעוד|תעקבו אחריי|שמרו את המתכון|תשלחו את הפוסט)(?![\p{L}\p{N}]))/giu,
    '\n'
  );

  // 2. Break inline numbered steps onto separate lines (requires whitespace after punctuation/word so decimals like 1.5 aren't split)
  out = out.replace(
    /(?<=[^\d-])\s+(?=(?:step\s*|שלב\s*)?\d{1,2}[.)]\s+[\p{L}\p{N}🚨✅🔹])/giu,
    '\n'
  );

  // 3. Break inline timestamps onto separate lines
  out = out.replace(/(?<=\S)\s+(?=\[?\d{1,2}:\d{2}(?::\d{2})?\]?(?:\s+[\p{L}\p{N}]))/gu, '\n');

  return out;
}

/**
 * Splits a flattened line inside an ingredient section that contains multiple ingredients
 * separated by whitespace/commas while keeping parenthetical notes like "(מולינו ירוק/קאפוטו)" intact.
 */
function splitInlineIngredientRun(line: string): string[] {
  const norm = normalizeQuotesAndUnits(line).trim();
  if (!norm) return [];

  // Mask parenthetical spans so commas/spaces inside "(מולינו ירוק/קאפוטו)" are never treated as split points
  const tokens: string[] = [];
  let masked = '';
  let depth = 0;
  let buf = '';
  for (let i = 0; i < norm.length; i++) {
    const ch = norm[i];
    if (ch === '(') {
      if (depth === 0) {
        masked += buf;
        buf = ch;
      } else {
        buf += ch;
      }
      depth += 1;
    } else if (ch === ')' && depth > 0) {
      depth -= 1;
      buf += ch;
      if (depth === 0) {
        const placeholder = `__PAREN_${tokens.length}__`;
        tokens.push(buf);
        masked += placeholder;
        buf = '';
      }
    } else {
      buf += ch;
    }
  }
  masked += buf;

  const restoreParens = (s: string) =>
    s.replace(/__PAREN_(\d+)__/g, (_, idxStr) => tokens[Number(idxStr)] || '');

  // Split at comma before any new quantity or known text-unit starter
  let splitCandidate = masked.replace(
    /,\s+(?=(?:כ-?\s*|~|approx\.?\s+|about\s+)?(?:\d+|חצי\s+|רבע\s+|שליש\s+|half\s+|quarter\s+))/giu,
    '\n'
  );

  // Split at whitespace before a NEW ingredient starter inside an ingredient run:
  // (approx prefix + number, fraction-word + unit, standalone pantry item, OR unit-first phrase when NOT preceded by a number)
  const unitFirstStarter = '(?:פרוסה|פרוסת|פרוסות|קורט|חופן|גביע|קוביית|קוביות|pinch\\s+of|dash\\s+of|slice\\s+of)';
  const standalonePantryStarter = '(?:מלח ופלפל|salt (?:and|&) pepper)';
  const numericOrPantryBoundary = new RegExp(
    `\\s+(?=(?:(?:כ-?\\s*|~|approx\\.?\\s+|about\\s+)?\\d+(?:\\.\\d+|\\/\\d+)?(?:\\s*[-–]\\s*\\d+(?:\\.\\d+)?)?(?!\\s*(?:%|דקות|שניות|מעלות|min|mins|minutes|sec|deg|c\\b|f\\b|spice))|(?:חצי|רבע|שליש|שני|שתי|שלוש|שלושה|ארבע|ארבעה|half|quarter|two|three|four)\\s+(?:a\\s+)?(?:${UNIT_PATTERN}|[\\p{L}]{2,14})|${standalonePantryStarter}(?![\\p{L}\\p{N}])))`,
    'giu'
  );
  const unitFirstBoundary = new RegExp(`(?<!\\d)\\s+(?=${unitFirstStarter}\\s+)`, 'giu');
  splitCandidate = splitCandidate
    .replace(numericOrPantryBoundary, '\n')
    .replace(unitFirstBoundary, '\n');

  return splitCandidate
    .split('\n')
    .map((part) => restoreParens(part).replace(/\.+$/, '').trim())
    .filter(Boolean);
}

/**
 * Extracts inline ingredients from spoken video transcripts or unstructured prose descriptions
 * when no explicit ingredient list was provided. Filters out yields, timers, and shaping nouns.
 */
function extractInlineIngredientsFromProse(text: string, allowCountNouns = false): Ingredient[] {
  // Strip explicit metadata/yield blocks and normalize number words before scanning unstructured prose
  const cleanedText = normalizeUnicodeFractions(text)
    .split(/\r?\n/)
    .filter((line) => !isMetadataOrYieldLine(line))
    .join('\n')
    .replace(/\([^)]*(?:זמן הכנה|כמות|prep time|cook time|yield|servings|makes)[^)]*\)/giu, ' ')
    .replace(/(?<![\p{L}\p{N}])(?:ו-?\s*)(?=\d)/giu, ' ');

  const found: Ingredient[] = [];
  const seen = new Set<string>();

  const unitRegex = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:כ-?\\s*|~|about\\s+|approx\\.?\\s+)?(\\d+(?:\\.\\d+|\\/\\d+)?|חצי|רבע|שליש|half|quarter)\\s*(${UNIT_PATTERN})(?![\\p{L}\\p{N}])\\s+(?:of\\s+|של\\s+)?(.{2,52}?)(?=\\s*(?:[.,;\\n!?|🛒👩‍🍳👨‍🍳]|(?:(?:כ-?\\s*|~)?\\d+(?:\\.\\d+|\\/\\d+)?\\s*${UNIT_PATTERN})|(?:(?<![\\p{L}\\p{N}])(?:and|with|then|into|in|to|until|for|on|over|על|ואת|עם|או|אל|עד|במשך|איך מכינים)(?![\\p{L}\\p{N}])))|$)`,
    'giu'
  );
  let match: RegExpExecArray | null;

  while ((match = unitRegex.exec(cleanedText)) !== null) {
    const rawQty = match[1].toLowerCase();
    const unit = match[2];
    const item = match[3]
      .replace(
        /\s+(?:ו?(?:מבשלים|אופים|מטגנים|מערבבים|מוסיפים|מכסים|צולים|מגישים|מחממים|סוחטים|טוחנים|ממיסים)|במחבת|בקערה|בסיר|בתבנית|בתנור|למחבת|לקערה|לסיר|לתנור|על האש|in (?:a |the )?(?:pan|bowl|pot|skillet|oven)|into (?:a |the )?(?:pan|bowl|pot|skillet|oven)|and (?:cook|simmer|bake|fry|mix|whisk|stir|roast|sear|heat|melt)).*$/iu,
        ''
      )
      .replace(/[,.\s]+$/, '')
      .trim();

    if (!item || item.length < 2) continue;
    if (MACRO_ONLY_ITEM_REGEX.test(item)) continue;
    const firstWord = item.split(/\s+/)[0].toLowerCase();
    if (NON_FOOD_UNITS_OR_WORDS.has(firstWord)) continue;

    let amt: number | null = null;
    if (rawQty === 'חצי' || rawQty === 'half') amt = 0.5;
    else if (rawQty === 'רבע' || rawQty === 'quarter') amt = 0.25;
    else if (rawQty === 'שליש') amt = 0.33;
    else amt = parseNumericToken(rawQty);

    const key = `${unit.toLowerCase()}:${item.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    found.push({
      id: `inline-ing-${found.length + 1}`,
      amount: amt,
      unit,
      item,
    });
  }

  if (allowCountNouns) {
    // Convert Hebrew/English spoken count words when followed by an ingredient noun
    const wordNumberedText = cleanedText
      .replace(/(?<![\p{L}\p{N}])(?:שני|שתי|two)\s+/giu, '2 ')
      .replace(/(?<![\p{L}\p{N}])(?:שלוש|שלושה|three)\s+/giu, '3 ')
      .replace(/(?<![\p{L}\p{N}])(?:ארבע|ארבעה|four)\s+/giu, '4 ');

    // Reject numbers preceded by target/shaping/yield prepositions ("ל-4", "ב-10", "into 4", "makes 4", "כמות: 4")
    const countRegex =
      /(?<![\p{L}\p{N}%-])(\d+(?:\.\d+|\/\d+)?)\s+([\p{L}]{2,20}(?:\s+[\p{L}%]{2,18})?)/gu;
    while ((match = countRegex.exec(wordNumberedText)) !== null) {
      const prefixWindow = wordNumberedText.slice(Math.max(0, match.index - 22), match.index).toLowerCase();
      if (/(?:^|\s)(?:ל-?|ב-?|into|for|makes|serves|yield:?|כמות:?|divide into|split into|מחלקים ל-?|לעוד)\s*$/iu.test(prefixWindow)) {
        continue;
      }

      const rawQty = match[1];
      const phrase = match[2]
        .replace(/(?<![\p{L}\p{N}])(and|with|then|into|in|to|until|for|on|over|top|per|על|ואת|עם|או|אל|עד|במשך|מחבת|מכל)(?![\p{L}\p{N}]).*$/iu, '')
        .trim();
      const words = phrase.split(/\s+/);
      const firstWord = words[0].toLowerCase();
      if (
        !phrase ||
        NON_FOOD_UNITS_OR_WORDS.has(firstWord) ||
        NON_INGREDIENT_COUNT_NOUNS.has(firstWord) ||
        words.some((w) => NON_INGREDIENT_COUNT_NOUNS.has(w.toLowerCase()) || NON_FOOD_UNITS_OR_WORDS.has(w.toLowerCase())) ||
        KNOWN_UNITS.has(firstWord) ||
        STOP_WORDS.has(firstWord)
      ) {
        continue;
      }
      if (CULINARY_VERB_REGEX.test(firstWord)) continue;

      const key = `:${phrase.toLowerCase()}`;
      if (seen.has(key)) continue;
      if (
        Array.from(seen).some((k) => {
          const existingItem = k.split(':')[1] || '';
          return existingItem === phrase.toLowerCase() || (existingItem && phrase.toLowerCase().includes(existingItem));
        })
      ) {
        continue;
      }
      seen.add(key);

      found.push({
        id: `inline-ing-${found.length + 1}`,
        amount: parseNumericToken(rawQty),
        unit: '',
        item: phrase,
      });
    }
  }

  return found;
}

/**
 * Repairs common Hebrew/English Whisper speech-to-text culinary phonetic errors
 * (e.g. "עצה" with rice paper -> "אצה", "סלטטונא" -> "סלט טונה", "חביתיו" -> "חביתה").
 */
export function normalizeSpokenRecipeTranscript(text: string): string {
  let out = normalizeQuotesAndUnits(text);
  const hasCulinaryContext = /דפי\s*אור[זך]|דף\s*אור[זך]|דף\s*עורז|סלט|סולת\s*טונה|חבית|ירקות|מגלגל|אוכל|מתכון|רול|פיתה|פסטה|טונ[הא]|תונה|מלפפון|חסה|רוקט|rice\s*paper|roll|salad|pan|skillet/iu.test(out);
  if (!hasCulinaryContext) return out;

  out = out
    .replace(/(?:סלט|סולת)\s*(?:טונ[הא]|תונה)|סלטטונ[הא]/giu, 'סלט טונה')
    .replace(/(?<![\p{L}\p{N}])([ובלמהכש])?תונה(?![\p{L}\p{N}])/giu, '$1טונה')
    .replace(/חביתיו|חביתיה|חביטה/giu, 'חביתה')
    .replace(/דפי\s*עורז|דף\s*עורז|דפי?\s*אורך|דה\s*פור[זל]|רפי\s*אורז/giu, 'דפי אורז')
    .replace(/(?<![\p{L}\p{N}])(?:את\s+)?העצ[הא](?![\p{L}\p{N}])/giu, (m) =>
      m.includes('את') ? 'את האצה' : 'אצה'
    )
    .replace(/(?<![\p{L}\p{N}])([ובלמהכש])?אצא(?![\p{L}\p{N}])/giu, '$1אצה')
    .replace(/(?<![\p{L}\p{N}])([ובלמהכש])?(?:לנפון|נלנפון|מלפון)(?![\p{L}\p{N}])/giu, '$1מלפפון')
    .replace(/(?<![\p{L}\p{N}])([ובלמהכש])?קיפל(?![\p{L}\p{N}])/giu, '$1פלפל')
    .replace(/(?<![\p{L}\p{N}])([ובלמהכש])?רחסה(?![\p{L}\p{N}])/giu, '$1חסה')
    .replace(/(?<![\p{L}\p{N}])([ובלמהכש])?(?:עורוקה|רוקת)(?![\p{L}\p{N}])/giu, '$1רוקט')
    .replace(/(?<![\p{L}\p{N}])(?:עטבתי|רטבתי)(?![\p{L}\p{N}])/giu, 'הרטבתי')
    .replace(/את\s+ה?מול(?![\p{L}\p{N}])/giu, 'את הרול')
    .replace(/מגלגילת/giu, 'מגלגלת');

  return out;
}

interface LexiconFoodRule {
  pattern: RegExp;
  heLabel: string;
  enLabel: string;
  family?: string;
}

const SPOKEN_CULINARY_LEXICON: LexiconFoodRule[] = [
  { pattern: /(?<![\p{L}\p{N}])(?:[ובלמכהש]|ו?ה)?ד(?:ף|פי)\s*אורז(?![\p{L}\p{N}])|rice\s*paper/iu, heLabel: 'דפי אורז', enLabel: 'Rice paper sheets', family: 'rice_paper' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?(?:אצה|אצת\s*נורי|נורי)|nori|seaweed)(?![\p{L}\p{N}])/iu, heLabel: 'אצת נורי', enLabel: 'Nori seaweed sheet', family: 'nori' },
  { pattern: /(?<![\p{L}\p{N}])(?:[ובלמכהש]|ו?ה)?סלט\s*טונה(?![\p{L}\p{N}])|tuna\s*salad/iu, heLabel: 'סלט טונה', enLabel: 'Tuna salad', family: 'tuna' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?טונה|tuna)(?![\p{L}\p{N}])/iu, heLabel: 'טונה', enLabel: 'Tuna', family: 'tuna' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?חביתה|omelet(?:te)?)(?![\p{L}\p{N}])/iu, heLabel: 'חביתה', enLabel: 'Omelet', family: 'egg' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?ביצ(?:ה|ים)|eggs?)(?![\p{L}\p{N}])/iu, heLabel: 'ביצים', enLabel: 'Eggs', family: 'egg' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?מלפפון(?:ים)?|cucumbers?)(?![\p{L}\p{N}])/iu, heLabel: 'מלפפון', enLabel: 'Cucumber' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?(?:פלפל\s*חריף|פלפל\s*אדום|פלפל)|bell\s*peppers?|peppers?)(?![\p{L}\p{N}])/iu, heLabel: 'פלפל', enLabel: 'Bell pepper' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?חסה|lettuce)(?![\p{L}\p{N}])/iu, heLabel: 'חסה', enLabel: 'Lettuce' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?(?:רוקט|ארוגולה)|arugula|rocket)(?![\p{L}\p{N}])/iu, heLabel: 'רוקט', enLabel: 'Arugula' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?(?:רוטב\s*חריף|צ׳ילי|חריף)|sriracha|hot\s*sauce|chili\s*sauce)(?![\p{L}\p{N}])/iu, heLabel: 'רוטב חריף', enLabel: 'Spicy sauce' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?אבוקדו|avocado)(?![\p{L}\p{N}])/iu, heLabel: 'אבוקדו', enLabel: 'Avocado' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?טחינה|tahini)(?![\p{L}\p{N}])/iu, heLabel: 'טחינה', enLabel: 'Tahini' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?סויה|soy\s*sauce)(?![\p{L}\p{N}])/iu, heLabel: 'רוטב סויה', enLabel: 'Soy sauce' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?(?:ספייסי\s*מיונז|מיונז)|mayo|spicy\s*mayo)(?![\p{L}\p{N}])/iu, heLabel: 'מיונז', enLabel: 'Mayonnaise' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?(?:גבינה\s*לבנה|גבינת\s*שמנת|גבינה\s*צהובה|גבינה|בולגרית|פטה|מוצרלה)|feta|mozzarella|cream\s*cheese|parmesan)(?![\p{L}\p{N}])/iu, heLabel: 'גבינה', enLabel: 'Cheese' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?עגבני(?:ה|יה|ות)|tomato(?:es)?)(?![\p{L}\p{N}])/iu, heLabel: 'עגבניות', enLabel: 'Tomatoes' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?(?:בצל\s*ירוק|בצל)|onions?|scallions?)(?![\p{L}\p{N}])/iu, heLabel: 'בצל', enLabel: 'Onion' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?(?:חזה\s*עוף|פרגיות|עוף)|chicken)(?![\p{L}\p{N}])/iu, heLabel: 'עוף', enLabel: 'Chicken' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?סלמון|salmon)(?![\p{L}\p{N}])/iu, heLabel: 'סלמון', enLabel: 'Salmon' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?שמן\s*זית|olive\s*oil)(?![\p{L}\p{N}])/iu, heLabel: 'שמן זית', enLabel: 'Olive oil' },
  { pattern: /(?<![\p{L}\p{N}])(?:(?:[ובלמכהש]|ו?ה)?שומשום|sesame\s*seeds?)(?![\p{L}\p{N}])/iu, heLabel: 'שומשום', enLabel: 'Sesame seeds' },
];

function extractSpokenCulinaryLexiconIngredients(
  text: string,
  existingIngredients: Ingredient[]
): Ingredient[] {
  const isHe = /[\u0590-\u05FF]/.test(text);
  const results = [...existingIngredients];
  const usedFamilies = new Set<string>();
  const existingText = existingIngredients.map((i) => i.item.toLowerCase()).join(' ');

  for (const rule of SPOKEN_CULINARY_LEXICON) {
    if (rule.family && usedFamilies.has(rule.family)) continue;
    const label = isHe ? rule.heLabel : rule.enLabel;
    if (
      existingText.includes(rule.heLabel.toLowerCase()) ||
      existingText.includes(rule.enLabel.toLowerCase()) ||
      results.some((r) => r.item.toLowerCase().includes(label.toLowerCase()))
    ) {
      if (rule.family) usedFamilies.add(rule.family);
      continue;
    }
    if (rule.pattern.test(text)) {
      results.push({
        id: `spoken-ing-${results.length + 1}`,
        amount: null,
        unit: '',
        item: label,
      });
      if (rule.family) usedFamilies.add(rule.family);
    }
  }

  return results;
}

const NOISE_HASHTAGS = new Set([
  'fyp', 'foryou', 'foryoupage', 'viral', 'trending', 'explore', 'explorepage', 'reels', 'reel',
  'reelsinstagram', 'shorts', 'youtubeshorts', 'tiktok', 'tiktokfood', 'foodtok', 'instafood',
  'foodporn', 'yummy', 'delicious', 'recipe', 'recipes', 'cooking', 'food', 'easyrecipe',
  'healthyfood', 'cookingvideo', 'homemadefood', 'viralpost', 'trend', 'foodie',
  'מתכון', 'מתכונים', 'אוכל', 'טעים', 'טעיםלי', 'רילס', 'טיקטוק', 'אינסטגרם', 'פייסבוק', 'יוטיוב',
  'בריאות', 'מתכוניםבריאים', 'מתכוןמהיר', 'מתכוניםקלים', 'מומלץ', 'טרנד', 'שף',
  'פוריו', 'פוריוישראל', 'פוריופייג', 'פוריואוכל', 'ישראל', 'אקספלור',
  'ארוחתבוקר', 'ארוחתצהריים', 'ארוחתערב',
]);

/**
 * Strips social-media UI clutter (likes/comments counters, promo CTAs, years, spam hashtags
 * like #פוריו/#foryou/#2026, invisible zero-width marks) from descriptions and transcripts.
 */
export function cleanSocialText(
  rawText: string,
  options?: { stripAllHashtags?: boolean }
): string {
  if (!rawText) return '';

  let cleaned = normalizeQuotesAndUnits(rawText)
    // Remove zero-width / bidirectional control markers injected by social apps
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    // Remove IG / FB / TikTok engagement headers ("14.2K likes, 50 comments - user on ...")
    .replace(/^\s*\d+(?:[.,]\d+)?[KMB]?\s+likes,\s+\d+(?:[.,]\d+)?[KMB]?\s+comments?(?:\s*[-–.]\s*[^"“\n]{0,80})?[.:]?\s*[“"]?/gim, '')
    .replace(/^\s*\d+(?:[.,]\d+)?[KMB]?\s+(?:views|לייקים|תגובות|צפיות)[^\n]*$/gim, '')
    .replace(/^\s*(?:original sound|סאונד מקורי)\s*[-–:].*$/gim, '')
    // Remove trailing UI quote wrappers
    .replace(/[”"]$/gm, '')
    // Remove promo/UI CTA phrases inline or standalone
    .replace(
      /(?:^|\s)(?:see more|read more|show more|tap to (?:see|read)|follow for more|save this recipe|link in bio|subscribe(?:\s+for\s+more)?|like and subscribe|הצג עוד|עוד פרטים|למתכון המלא|עקבו לעוד|תעקבו אחריי|תעקבו לעוד|שמרו את המתכון|תשלחו את הפוסט|הירשמו לערוץ|קישור בביו)(?![\p{L}\p{N}])[^\n]*/giu,
      ''
    );

  if (options?.stripAllHashtags) {
    cleaned = cleaned.replace(/#[\p{L}\p{N}_-]+/gu, '');
  } else {
    cleaned = cleaned.replace(/#([\p{L}\p{N}_-]+)/gu, (full, body: string) => {
      const normalized = body.replace(/[_-]+/g, '').toLowerCase();
      if (/^\d{2,5}$/.test(normalized) || NOISE_HASHTAGS.has(normalized)) {
        return '';
      }
      return full;
    });
  }

  return cleaned
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join('\n')
    .trim();
}

const COMPOUND_TAG_SPACES: Array<[RegExp, string]> = [
  [/^ארוחתבוקר$/u, 'ארוחת בוקר'],
  [/^ארוחתצהריים$/u, 'ארוחת צהריים'],
  [/^ארוחתערב$/u, 'ארוחת ערב'],
  [/^ללאגלוטן$/u, 'ללא גלוטן'],
  [/^סלטטונה$/u, 'סלט טונה'],
  [/^דפיאורז$/u, 'דפי אורז'],
  [/^חזהעוף$/u, 'חזה עוף'],
  [/^עוגתגבינה$/u, 'עוגת גבינה'],
  [/^חלבוןגבוה$/u, 'חלבון גבוה'],
  [/^ארוחהמהירה$/u, 'ארוחה מהירה'],
  [/^healthyrecipe$/iu, 'Healthy Recipe'],
  [/^glutenfree$/iu, 'Gluten Free'],
  [/^highprotein$/iu, 'High Protein'],
  [/^airfryer$/iu, 'Air Fryer'],
  [/^ricepaper$/iu, 'Rice Paper'],
  [/^tunasalad$/iu, 'Tuna Salad'],
  [/^quickdinner$/iu, 'Quick Dinner'],
];

export function normalizeTagWithSpaces(rawTag: string): string {
  const cleaned = rawTag
    .replace(/^#/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  for (const [pattern, spaced] of COMPOUND_TAG_SPACES) {
    if (pattern.test(cleaned)) {
      return spaced;
    }
  }

  if (/[\u0590-\u05FF]/.test(cleaned)) {
    return cleaned;
  }
  return cleaned
    .split(' ')
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

const CLICKBAIT_HOOK_REGEX =
  /(?:האהוב(?:ה|ים)?\s*עלינו|האהוב\s*עליי|לאחרונה|נדיר(?:ה|ים)?|הכי\s*(?:טעים|מסביעה?|משביעה?|קלה?|מהירה?)|לא\s*תאמינו|חובה\s*לנסות|ככה\s*עושים|favorite\s*(?:dinner|meal|lunch|breakfast)|my\s*new\s*favorite|you\s*(?:have|need)\s*to\s*(?:try|make)|wait\s*(?:until|till)\s*you\s*try|lately|obsessed\s*with|game\s*changer|stop\s*scrolling)/iu;

function inferMealTypeAndDishTags(text: string, suggestedTitle: string): string[] {
  const lower = text.toLowerCase();
  const isHe = /[\u0590-\u05FF]/.test(text);
  const tags: string[] = [];

  const pushUnique = (tag: string) => {
    const normalized = normalizeTagWithSpaces(tag);
    if (!normalized || normalized.length < 2) return;
    if (!tags.some((t) => t.toLowerCase() === normalized.toLowerCase())) {
      tags.push(normalized);
    }
  };

  // 1. Check explicit meal-type mentions first (highest priority, e.g. "לארוחת ערב", "for breakfast")
  const explicitMealRules: Array<[RegExp, string, string]> = [
    [/(?<![\p{L}\p{N}])(breakfast|brunch)(?![\p{L}\p{N}])|ארוחת\s+ה?בוקר/iu, 'Breakfast', 'ארוחת בוקר'],
    [/(?<![\p{L}\p{N}])(lunch)(?![\p{L}\p{N}])|ארוחת\s+ה?צהריים/iu, 'Lunch', 'ארוחת צהריים'],
    [/(?<![\p{L}\p{N}])(dinner|supper)(?![\p{L}\p{N}])|ארוחת\s+ה?ערב/iu, 'Dinner', 'ארוחת ערב'],
    [/(?<![\p{L}\p{N}])(dessert)(?![\p{L}\p{N}])|קינוח/iu, 'Dessert', 'קינוח'],
    [/(?<![\p{L}\p{N}])(snack)(?![\p{L}\p{N}])|נשנוש/iu, 'Snack', 'נשנוש'],
  ];

  let foundMeal = false;
  for (const [pattern, enMeal, heMeal] of explicitMealRules) {
    if (pattern.test(lower)) {
      pushUnique(isHe ? heMeal : enMeal);
      foundMeal = true;
      break;
    }
  }

  // Fallback meal-type inference from dish/ingredients (always use Unicode word boundaries — never \b for Hebrew!)
  const heWord = (stem: string) => `(?<![\\p{L}\\p{N}])(?:[בהולמכ]?)${stem}(?![\\p{L}\\p{N}])`;
  if (!foundMeal) {
    const cleanedForSoup = lower.replace(/אבקת מרק|soup\s*(?:mix|powder|base)/giu, '');
    const mealRules: Array<[RegExp, string, string]> = [
      [new RegExp(`(?<![\\p{L}\\p{N}])(pancakes?|waffles?|oatmeal|granola|omelette|shakshuka|avocado toast)(?![\\p{L}\\p{N}])|${heWord('פנקייק(?:ים)?')}|${heWord('שקשוקה')}|${heWord('חביתה')}|${heWord('גרנולה')}|${heWord('דייסה')}`, 'iu'), 'Breakfast', 'ארוחת בוקר'],
      [new RegExp(`(?<![\\p{L}\\p{N}])(cake|cheesecake|cookies?|brownies?|muffins?|chocolate|tiramisu|mousse)(?![\\p{L}\\p{N}])|${heWord('עוג(?:ה|ת|ות|יות|יה)')}|${heWord('בראוניז')}|${heWord('שוקולד')}|${heWord('מוס')}`, 'iu'), 'Dessert', 'קינוח'],
      [new RegExp(`(?<![\\p{L}\\p{N}])(salad|slaw)(?![\\p{L}\\p{N}])|${heWord('סלט(?:ים)?')}`, 'iu'), 'Salad', 'סלט'],
      [new RegExp(`(?<![\\p{L}\\p{N}])(soup|broth|stew|chowder)(?![\\p{L}\\p{N}])|${heWord('מרק(?:ים)?')}`, 'iu'), 'Soup', 'מרק'],
      [new RegExp(`(?<![\\p{L}\\p{N}])(bowl|sandwich|wrap|panini|pitas?|flatbreads?)(?![\\p{L}\\p{N}])|${heWord('כריך')}|${heWord('טורטיי(?:ה|ות)')}|${heWord('פית(?:ה|ות)')}|${heWord('לאפ(?:ה|ות)')}`, 'iu'), 'Lunch', 'ארוחת צהריים'],
      [new RegExp(`(?<![\\p{L}\\p{N}])(casserole|quiche|frittata|roast|pasta|rigatoni|penne|spaghetti|chicken|salmon|steak)(?![\\p{L}\\p{N}])|${heWord('פשטיד(?:ה|ת|ות)')}|${heWord('קיש(?:ים)?')}|${heWord('לזניה')}|${heWord('פסטה')}|${heWord('ספגטי')}|${heWord('פרגיות')}|${heWord('עוף')}|${heWord('דג(?:ים)?')}|${heWord('סלמון')}|${heWord('קציצות')}|${heWord('מאפה')}`, 'iu'), 'Dinner', 'ארוחת ערב'],
      [new RegExp(`(?<![\\p{L}\\p{N}])(dip|hummus|protein ball|energy bite)(?![\\p{L}\\p{N}])|${heWord('חטיף')}|${heWord('מטבל')}`, 'iu'), 'Snack', 'נשנוש'],
    ];
    for (const [pattern, enMeal, heMeal] of mealRules) {
      if (pattern.test(cleanedForSoup)) {
        pushUnique(isHe ? heMeal : enMeal);
        foundMeal = true;
        break;
      }
    }
  }

  if (!foundMeal && new RegExp(`${heWord('גבינה')}|${heWord('בולגרית')}|${heWord('זוקיני')}|${heWord('ביצה')}|${heWord('ביצים')}|(?<![\\p{L}\\p{N}])(cheese|eggs?|zucchini)(?![\\p{L}\\p{N}])`, 'iu').test(lower)) {
    pushUnique(isHe ? 'ארוחת ערב' : 'Dinner');
  }

  // 2. Infer Dish Created (specific dish name first, avoid adding generic parent if specific already added)
  const dishRules: Array<[RegExp, string, string, string?]> = [
    [/(?:ד(?:ף|פי)\s*אורז|rice\s*paper).*(?:רול|אצה|טונה|חביתה|roll|wrap)|(?:רול|roll).*(?:ד(?:ף|פי)\s*אורז|rice\s*paper)/iu, 'Rice Paper Roll', 'רול דפי אורז', 'roll'],
    [/ד(?:ף|פי)\s*אורז|rice\s*paper/iu, 'Rice Paper Wrap', 'רול דפי אורז', 'roll'],
    [/פית(?:ה|ות)[^\n.]{0,16}ללא\s*גלוטן|ללא\s*גלוטן[^\n.]{0,16}פית(?:ה|ות)|gluten[- ]?free\s*pita/iu, 'Gluten Free Pita', 'פיתות ללא גלוטן', 'pita'],
    [new RegExp(`${heWord('פית(?:ה|ות)')}|(?<![\\p{L}\\p{N}])(flatbreads?|pitas?)(?![\\p{L}\\p{N}])`, 'iu'), 'Pita Bread', 'פיתות', 'pita'],
    [new RegExp(`${heWord('זוקיני')}.*(?:פשטיד|גבינ|ביצ|תנור)|(?:פשטיד).*${heWord('זוקיני')}|zucchini\\s*(?:pie|quiche|frittata|bake)`, 'iu'), 'Zucchini Pie', 'פשטידת זוקיני', 'pie'],
    [/קציצות\s*זוקיני|לביבות\s*זוקיני|zucchini\s*(?:fritters|patties)/iu, 'Zucchini Fritters', 'לביבות זוקיני', 'patties'],
    [/פשטידת\s*תירס|corn\s*(?:pie|casserole)/iu, 'Corn Pie', 'פשטידת תירס', 'pie'],
    [/פשטידת\s*גבינ|cheese\s*(?:pie|bake)/iu, 'Cheese Pie', 'פשטידת גבינה', 'pie'],
    [new RegExp(`${heWord('פשטיד(?:ה|ת|ות)')}|(?<![\\p{L}\\p{N}])(casserole|savory\\s*pie)(?![\\p{L}\\p{N}])`, 'iu'), 'Savory Pie', 'פשטידה', 'pie'],
    [new RegExp(`${heWord('קיש(?:ים)?')}|(?<![\\p{L}\\p{N}])quiche(?![\\p{L}\\p{N}])`, 'iu'), 'Quiche', 'קיש'],
    [new RegExp(`${heWord('פריטטה')}|(?<![\\p{L}\\p{N}])frittata(?![\\p{L}\\p{N}])`, 'iu'), 'Frittata', 'פריטטה'],
    [new RegExp(`${heWord('שקשוקה')}|(?<![\\p{L}\\p{N}])shakshuka(?![\\p{L}\\p{N}])`, 'iu'), 'Shakshuka', 'שקשוקה'],
    [new RegExp(`${heWord('פסטה')}|(?<![\\p{L}\\p{N}])(pasta|rigatoni|penne|spaghetti|alfredo|arrabbiata|arrabiata)(?![\\p{L}\\p{N}])`, 'iu'), 'Pasta', 'פסטה'],
    [new RegExp(`${heWord('נודלס')}|${heWord('אטריות')}|(?<![\\p{L}\\p{N}])(noodles|ramen|pad thai)(?![\\p{L}\\p{N}])`, 'iu'), 'Noodles', 'אטריות'],
    [new RegExp(`${heWord('לזניה')}|(?<![\\p{L}\\p{N}])lasagna(?![\\p{L}\\p{N}])`, 'iu'), 'Lasagna', 'לזניה'],
    [new RegExp(`${heWord('פיצה')}|(?<![\\p{L}\\p{N}])pizza(?![\\p{L}\\p{N}])`, 'iu'), 'Pizza', 'פיצה'],
    [new RegExp(`${heWord('לחם')}|${heWord('פוקאצ׳ה')}|${heWord('חלה')}|(?<![\\p{L}\\p{N}])(bread|focaccia)(?![\\p{L}\\p{N}])`, 'iu'), 'Homemade Bread', 'לחם ביתי', 'bread'],
    [new RegExp(`${heWord('קציצות')}|(?<![\\p{L}\\p{N}])meatballs(?![\\p{L}\\p{N}])`, 'iu'), 'Meatballs', 'קציצות', 'patties'],
    [new RegExp(`${heWord('מוקפץ')}|(?<![\\p{L}\\p{N}])stir\\s*fry(?![\\p{L}\\p{N}])`, 'iu'), 'Stir Fry', 'מוקפץ'],
    [new RegExp(`${heWord('סלמון')}|(?<![\\p{L}\\p{N}])salmon(?![\\p{L}\\p{N}])`, 'iu'), 'Baked Salmon', 'סלמון'],
    [/סלט\s*טונה|tuna\s*salad/iu, 'Tuna Salad', 'סלט טונה', 'salad'],
    [new RegExp(`${heWord('פרגיות')}|חזה עוף|${heWord('עוף')}|(?<![\\p{L}\\p{N}])chicken(?![\\p{L}\\p{N}])`, 'iu'), 'Chicken Dish', 'עוף'],
    [new RegExp(`${heWord('טוסט(?:ים)?')}|(?<![\\p{L}\\p{N}])toast(?![\\p{L}\\p{N}])`, 'iu'), 'Toast', 'טוסט'],
    [new RegExp(`${heWord('פנקייק(?:ים)?')}|(?<![\\p{L}\\p{N}])pancakes?(?![\\p{L}\\p{N}])`, 'iu'), 'Pancakes', 'פנקייק'],
    [new RegExp(`${heWord('עוגיות')}|(?<![\\p{L}\\p{N}])cookies?(?![\\p{L}\\p{N}])`, 'iu'), 'Cookies', 'עוגיות'],
    [new RegExp(`עוגת\\s*גבינה|(?<![\\p{L}\\p{N}])cheesecake(?![\\p{L}\\p{N}])`, 'iu'), 'Cheesecake', 'עוגת גבינה', 'cake'],
    [new RegExp(`${heWord('עוג(?:ה|ת|ות)')}|(?<![\\p{L}\\p{N}])(cake|brownies?)(?![\\p{L}\\p{N}])`, 'iu'), 'Cake', 'עוגה', 'cake'],
    [new RegExp(`${heWord('סלט(?:ים)?')}|(?<![\\p{L}\\p{N}])salad(?![\\p{L}\\p{N}])`, 'iu'), 'Salad', 'סלט', 'salad'],
    [new RegExp(`${heWord('מרק(?:ים)?')}|(?<![\\p{L}\\p{N}])soup(?![\\p{L}\\p{N}])`, 'iu'), 'Soup', 'מרק'],
    [new RegExp(`${heWord('קערת')}|(?<![\\p{L}\\p{N}])bowl(?![\\p{L}\\p{N}])`, 'iu'), 'Rice Bowl', 'קערת ארוחה'],
  ];

  const usedFamilies = new Set<string>();
  for (const [pattern, enDish, heDish, family] of dishRules) {
    if (family && usedFamilies.has(family)) continue;
    const targetText = family === 'Soup' || enDish === 'Soup' ? lower.replace(/אבקת מרק|soup\s*(?:mix|powder|base)/giu, '') : lower;
    if (pattern.test(targetText)) {
      pushUnique(isHe ? heDish : enDish);
      if (family) usedFamilies.add(family);
    }
  }

  // Only derive dish fallback from suggestedTitle if it's NOT a social clickbait hook
  if (tags.length < 2 && suggestedTitle && !CLICKBAIT_HOOK_REGEX.test(suggestedTitle)) {
    const titleDish = suggestedTitle
      .replace(/#\S+/g, '')
      .replace(/(?<![\p{L}\p{N}])(easy|quick|best|homemade|recipe|how to make|minutes?|מתכון ל|מתכון|הכי טעים|ב-\d+ דקות)(?![\p{L}\p{N}])/giu, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 3)
      .join(' ');
    if (titleDish.length >= 3) {
      pushUnique(titleDish);
    }
  }

  // 3. Helpful dietary / prep style tag if applicable
  if (/(?<![\p{L}\p{N}])gluten[- ]?free(?![\p{L}\p{N}])|ללא\s*גלוטן/iu.test(lower)) {
    pushUnique(isHe ? 'ללא גלוטן' : 'Gluten Free');
  }
  if (/(?<![\p{L}\p{N}])vegetarian(?![\p{L}\p{N}])|צמחוני|חלבי/iu.test(lower)) {
    pushUnique(isHe ? 'צמחוני' : 'Vegetarian');
  }
  if (/(?<![\p{L}\p{N}])vegan(?![\p{L}\p{N}])|טבעוני/iu.test(lower)) {
    pushUnique(isHe ? 'טבעוני' : 'Vegan');
  }
  if (/(?<![\p{L}\p{N}])(?:high[- ]?protein|protein)(?![\p{L}\p{N}])|עתיר חלבון|חלבון/iu.test(lower)) {
    pushUnique(isHe ? 'עתיר חלבון' : 'High Protein');
  }

  return tags.slice(0, 5);
}

/**
 * Separates the actual Dish Name from clickbait social hooks like "ארוחת הערב האהובה עלינו לאחרונה!!".
 */
export function inferDishName(
  rawText: string,
  ingredients: Ingredient[],
  steps: InstructionStep[],
  videoHeadline: string
): string {
  const combined = `${rawText}\n${steps.map((s) => s.instruction).join('\n')}`;
  const isHe = /[\u0590-\u05FF]/.test(combined || videoHeadline);
  const ingJoined = ingredients.map((i) => i.item).join(' ');

  // Priority 1: Check explicit dish phrases in the structured body before falling back to videoHeadline
  const cleanHeadline = videoHeadline
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .replace(/[🚨🥙🍳🍝🥗🍕🔥❤️👇🏼✨!]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isHookTitle = !cleanHeadline || CLICKBAIT_HOOK_REGEX.test(cleanHeadline);

  // Rice paper sushi/tuna/egg roll pattern
  if (/ד(?:ף|פי)\s*אורז|rice\s*paper/iu.test(combined + ingJoined)) {
    const hasTuna = /טונה|tuna/iu.test(combined + ingJoined);
    const hasOmelet = /חביתה|ביצ|omelet|egg/iu.test(combined + ingJoined);
    if (isHe) {
      if (hasTuna && hasOmelet) return 'רול דפי אורז עם סלט טונה וחביתה';
      if (hasTuna) return 'רול דפי אורז עם סלט טונה וירקות';
      if (hasOmelet) return 'רול דפי אורז עם חביתה וירקות';
      return 'רול דפי אורז ואצה';
    }
    if (hasTuna && hasOmelet) return 'Rice Paper Tuna & Omelet Roll';
    if (hasTuna) return 'Rice Paper Tuna & Veggie Roll';
    return 'Crispy Rice Paper Roll';
  }

  // Gluten-free pan pitas / flatbreads
  if (/פית(?:ה|ות)[^\n.]{0,16}ללא\s*גלוטן|ללא\s*גלוטן[^\n.]{0,16}פית(?:ה|ות)|gluten[- ]?free\s*pita/iu.test(combined)) {
    return isHe ? 'פיתות ללא גלוטן במחבת' : 'Gluten Free Pan Pita Bread';
  }

  // If a concise non-hook, non-timestamped body line explicitly names the dish
  const explicitDishLine = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => !/^[-•*]?\s*[\[(]?\d{1,2}:\d{2}/.test(l))
    .map((l) => l.replace(/#[\p{L}\p{N}_-]+/gu, '').replace(/[^\p{L}\p{N}\s"'-]/gu, '').trim())
    .find(
      (l) =>
        l.length >= 5 &&
        l.length <= 58 &&
        !isMetadataOrYieldLine(l) &&
        !CULINARY_VERB_REGEX.test(l) &&
        !/(?:^|\s)(?:טוב|עכשיו|בואו|מכינה\s+לכם|so\s+today|here\s+we)/iu.test(l) &&
        /(?:פשטיד|שקשוקה|פסטה|סלט|סלמון|עוף|קיש|לזניה|פנקייק|עוג|מרק|טוסט|פיצה|קציצות|פית|לחם|רול|בשר|המבורגר|קארי|אורז|pie|pasta|salad|salmon|chicken|steak|noodles|ramen|tacos|burger|curry|bowls?|quiche|shakshuka|pancake|cake|soup|toast|pizza|roll|pita|brownies|cheesecake|risotto)/iu.test(
          l
        ) &&
        !CLICKBAIT_HOOK_REGEX.test(l) &&
        !/(?:ב-\d+\s*דקות\s*עבודה\s*ובלי)/iu.test(l)
    );

  if (explicitDishLine && isHookTitle) {
    return explicitDishLine;
  }

  if (!isHookTitle && cleanHeadline.length >= 4 && cleanHeadline.length <= 68) {
    // Strip trailing promo phrases like "ב-10 דקות עבודה ובלי טיפת התפחה" if a shorter dish title exists in body
    const dishInHeadlineMatch = cleanHeadline.match(
      /^(.{4,42}?)\s+(?:ב-\d+\s*דקות|in\s*\d+\s*min)/iu
    );
    if (explicitDishLine && explicitDishLine.length <= cleanHeadline.length) {
      return explicitDishLine;
    }
    if (dishInHeadlineMatch && dishInHeadlineMatch[1].trim().length >= 5) {
      return dishInHeadlineMatch[1].trim();
    }
    return cleanHeadline;
  }

  // Fallback synthesis from dish rules + top 2 ingredients
  const inferredTags = inferMealTypeAndDishTags(combined, '');
  const dishTag = inferredTags.find(
    (t) =>
      !/^(Breakfast|Lunch|Dinner|Snack|Dessert|ארוחת בוקר|ארוחת צהריים|ארוחת ערב|נשנוש|קינוח|Vegetarian|Vegan|Gluten Free|High Protein|צמחוני|טבעוני|ללא גלוטן|עתיר חלבון)$/i.test(
        t
      )
  );
  if (dishTag) return dishTag;

  if (ingredients.length >= 2) {
    const core = ingredients
      .slice(0, 2)
      .map((i) => i.item.split('(')[0].trim())
      .join(isHe ? ' ו' : ' & ');
    return isHe ? `מתכון ${core}` : `${core} Recipe`;
  }

  return isHookTitle ? '' : cleanHeadline || (isHe ? 'מתכון מסרטון' : 'Video Recipe');
}

/**
 * Multi-platform extractor supporting English & Hebrew captions, transcripts, descriptions,
 * SRT/CapCut timestamps, inline timestamps, unstructured prose segmentation, and step-to-timestamp linking.
 */
export function parseSocialCaptionAndTranscript(
  rawText: string,
  hintedDurationSec?: number
): ParsedSocialContent {
  // Stage 0: Strip social media spam hashtags (#פוריו, #2026), UI counters & promo clutter,
  // then repair common spoken ASR culinary typos before segmentation
  const preCleanedText = cleanSocialText(rawText, { stripAllHashtags: false });
  const normalizedRawText = normalizeSpokenRecipeTranscript(preCleanedText);

  // Stage 1: Discourse re-segmentation for flattened or multi-line captions
  const segmentedText = resegmentRecipeText(normalizedRawText);
  const rawParagraphLines = segmentedText.split(/\r?\n/).map((l) => l.trim());

  // Extract meaningful #hashtags (excluding social spam, years, & ultra-long unspaced compound tags)
  const hashtagMatches = normalizedRawText.match(/#([\p{L}\p{N}_-]+)/gu) || [];
  const cleanHashtagTags = Array.from(
    new Set(
      hashtagMatches
        .map((h) => normalizeTagWithSpaces(h))
        .filter(
          (tag) =>
            tag.length >= 2 &&
            tag.length <= 22 &&
            !/^\d{2,5}$/.test(tag) &&
            !NOISE_HASHTAGS.has(tag.toLowerCase().replace(/\s+/g, ''))
        )
    )
  );

  const inlineTsRegex =
    /^[\[(]?(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[-–—>]+\s*\d{1,2}:\d{2}(?::\d{2})?(?:,\d{3})?)?[\])]?\s*[-–—|:]?\s*(.+)$/;
  const standaloneTsRegex =
    /^[\[(]?(\d{1,2}:\d{2}(?::\d{2})?)(?:,\d{3})?(?:\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?)(?:,\d{3})?)?[\])]?$/;

  type ClassifiedLine = {
    raw: string;
    cleaned: string;
    paragraphId: number;
    kind: 'ingredient' | 'step' | 'transcript' | 'prose' | 'skip';
  };

  const classified: ClassifiedLine[] = [];
  const transcriptEntries: Array<{ startSec: number; endSec?: number; text: string }> = [];
  const stepLines: string[] = [];
  const proseSentences: string[] = [];
  let suggestedTitle = '';

  let section: 'auto' | 'ingredients' | 'steps' | 'transcript' = 'auto';
  let paragraphId = 0;

  for (let i = 0; i < rawParagraphLines.length; i++) {
    const line = rawParagraphLines[i];
    if (!line) {
      paragraphId += 1;
      continue;
    }

    // Skip pure hashtag lines, SRT sequence numbers & CTA promo lines (no \b for Hebrew!)
    if (/^#/.test(line) && line.split(/\s+/).every((w) => w.startsWith('#'))) continue;
    if (/^\d+$/.test(line) && i + 1 < rawParagraphLines.length && standaloneTsRegex.test(rawParagraphLines[i + 1])) {
      continue;
    }
    if (
      /^(see more|follow for more|save this recipe|link in bio|subscribe|like and subscribe|הירשמו לערוץ|למתכון המלא|עקבו לעוד|שמרו את המתכון|למתכונים נוספים|תעקבו אחריי|תשלחו את הפוסט)(?![\p{L}\p{N}])/iu.test(
        line
      )
    ) {
      continue;
    }

    // Check section headers (including Hebrew/English headers with emojis, '?' or ':' or sub-targets)
    const cleanHeader = line.replace(/[^\p{L}\p{N}\s:?]/gu, '').replace(/[?:]+$/g, '').trim().toLowerCase();
    if (
      /^(ingredients|what you need|what youll need|shopping list|for the [\p{L}\s]{2,20}|מצרכים|המצרכים|רכיבים|הרכיבים|חומרים|החומרים|מה צריך|מה נצטרך|לרוטב|לבצק|למילוי|לציפוי|למרינדה|לתערובת)(?:\s+(?:ל[\p{L}\s]{2,20}|for\s+[\p{L}\s]{2,20}))?$/iu.test(
        cleanHeader
      )
    ) {
      section = 'ingredients';
      paragraphId += 1;
      continue;
    }
    if (
      /^(steps|instructions|method|directions|preparation|how to make it|how to make|הוראות הכנה|הוראות|אופן הכנה|אופן ההכנה|שלבי הכנה|הכנה|דרך הכנה|איך מכינים)$/iu.test(
        cleanHeader
      )
    ) {
      section = 'steps';
      paragraphId += 1;
      continue;
    }
    if (
      /^(transcript|video transcript|captions|timestamps|chapters|תמלול|תמלול הסרטון|כתוביות|פרקים)$/iu.test(
        cleanHeader
      )
    ) {
      section = 'transcript';
      paragraphId += 1;
      continue;
    }

    // Check timestamps against bullet-stripped text so "- [00:15] Step" or "• 00:25 Step" parses cleanly
    const strippedForTs = stripLeadingDecor(line);

    // Standalone timestamp + next line (CapCut / SRT)
    const standaloneMatch = strippedForTs.match(standaloneTsRegex);
    if (standaloneMatch && i + 1 < rawParagraphLines.length) {
      const nextLine = rawParagraphLines[i + 1];
      if (nextLine && !standaloneTsRegex.test(stripLeadingDecor(nextLine))) {
        transcriptEntries.push({
          startSec: parseTimestampToSec(standaloneMatch[1]),
          endSec: standaloneMatch[2] ? parseTimestampToSec(standaloneMatch[2]) : undefined,
          text: nextLine.trim(),
        });
        i += 1;
        continue;
      }
    }

    // Inline timestamp
    const tsMatch = strippedForTs.match(inlineTsRegex);
    if (tsMatch) {
      transcriptEntries.push({
        startSec: parseTimestampToSec(tsMatch[1]),
        text: tsMatch[2].trim(),
      });
      continue;
    }

    const cleanedLine = strippedForTs;
    if (!cleanedLine) continue;

    // Never treat yield/time metadata lines like "(זמן הכנה: 5 דקות | כמות: 4 פיתות רכות)" as ingredients
    if (isMetadataOrYieldLine(line)) {
      classified.push({ raw: line, cleaned: cleanedLine, paragraphId, kind: 'skip' });
      continue;
    }

    const hasBulletOrEmojiPrefix = LEADING_DECOR_REGEX.test(line) && line !== cleanedLine;
    const isNumberedStep =
      /^(?:step\s*|שלב\s*)?\d+[.):]\s+/iu.test(line) &&
      !isQuantifiedIngredientLine(cleanedLine);

    if (section === 'ingredients' && !isNumberedStep) {
      // Split any flattened multi-ingredient line inside an ingredients section
      const splitItems = splitInlineIngredientRun(cleanedLine);
      for (const itemText of splitItems) {
        if (!isMetadataOrYieldLine(itemText)) {
          classified.push({ raw: itemText, cleaned: itemText, paragraphId, kind: 'ingredient' });
        }
      }
    } else if (section === 'steps' || isNumberedStep) {
      section = 'steps';
      const stepText = line.replace(/^(?:step\s*|שלב\s*)?\d+[.):]\s*/iu, '').trim();
      stepLines.push(stepText);
      classified.push({ raw: line, cleaned: stepText, paragraphId, kind: 'step' });
    } else if (section === 'transcript') {
      const sentences = cleanedLine
        .replace(/#[\p{L}\p{N}_-]+/gu, '')
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 6);
      proseSentences.push(...sentences);
      classified.push({ raw: line, cleaned: cleanedLine, paragraphId, kind: 'transcript' });
    } else {
      // Auto mode: detect quantified ingredients, unit-prefixed lines, bullets, or standalone pantry items
      const looksLikeIng =
        hasBulletOrEmojiPrefix ||
        isQuantifiedIngredientLine(cleanedLine) ||
        isUnitPrefixedLine(cleanedLine) ||
        STANDALONE_PANTRY_REGEX.test(cleanedLine);

      if (looksLikeIng) {
        const splitItems = splitInlineIngredientRun(cleanedLine);
        for (const itemText of splitItems) {
          classified.push({ raw: itemText, cleaned: itemText, paragraphId, kind: 'ingredient' });
        }
      } else {
        classified.push({
          raw: line,
          cleaned: cleanedLine,
          paragraphId,
          kind: 'prose',
        });
      }
    }
  }

  // Stage 2: Neighborhood pass — rescue unheaded unquantified ingredient lines (e.g. "מלח ופלפל", "בזיליקום")
  // strictly AFTER at least one quantified ingredient line in the same contiguous paragraph
  const paraGroups = new Map<number, ClassifiedLine[]>();
  for (const item of classified) {
    const arr = paraGroups.get(item.paragraphId) || [];
    arr.push(item);
    paraGroups.set(item.paragraphId, arr);
  }
  for (const group of paraGroups.values()) {
    const ingCount = group.filter((g) => g.kind === 'ingredient').length;
    if (ingCount >= 2) {
      let seenIngredient = false;
      for (const item of group) {
        if (item.kind === 'ingredient') {
          seenIngredient = true;
          continue;
        }
        if (
          seenIngredient &&
          item.kind === 'prose' &&
          item.cleaned.length >= 2 &&
          item.cleaned.length <= 48 &&
          !/[.!?]$/.test(item.cleaned) &&
          !CULINARY_VERB_REGEX.test(item.cleaned) &&
          !isMetadataOrYieldLine(item.cleaned)
        ) {
          item.kind = 'ingredient';
        }
      }
    }
  }

  const ingredientLines: string[] = [];
  const descriptionProseLines: string[] = [];

  for (const item of classified) {
    if (item.kind === 'ingredient') {
      const splitItems = splitInlineIngredientRun(item.cleaned);
      if (splitItems.length > 0) {
        ingredientLines.push(...splitItems);
      } else {
        ingredientLines.push(item.cleaned);
      }
    } else if (item.kind === 'prose') {
      const cleanTitleCandidate = item.cleaned.replace(/#[\p{L}\p{N}_-]+/gu, '').trim();
      if (
        !suggestedTitle &&
        cleanTitleCandidate.length >= 4 &&
        cleanTitleCandidate.length <= 95 &&
        !isMetadataOrYieldLine(cleanTitleCandidate)
      ) {
        suggestedTitle = cleanTitleCandidate;
      }
      descriptionProseLines.push(item.cleaned);
      const sentences = cleanTitleCandidate
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 8);
      proseSentences.push(...sentences);
    }
  }

  // Segment continuous spoken clauses or culinary prose into synced transcript entries if no explicit timestamps were present
  let culinaryProseSentences = proseSentences.filter((s) => CULINARY_VERB_REGEX.test(s));
  if (
    transcriptEntries.length === 0 &&
    stepLines.length === 0 &&
    culinaryProseSentences.length <= 1 &&
    proseSentences.length >= 1
  ) {
    const joinedProse = proseSentences.join('. ');
    if (joinedProse.length > 65) {
      const clauseSplit = joinedProse
        .split(/(?:,\s+(?=(?:then|next|now|after|finally|and\s+(?:then|add|mix|fold|roll|cook|bake|serve)|ואז|אחרי זה|עכשיו|לסיום|ו?[\u0590-\u05FF]{2,12}\s))|;\s+)/iu)
        .map((c) => c.trim())
        .filter((c) => c.length >= 10 && CULINARY_VERB_REGEX.test(c));
      if (clauseSplit.length >= 2) {
        culinaryProseSentences = clauseSplit;
      }
    }
  }
  if (transcriptEntries.length === 0 && (stepLines.length > 0 || culinaryProseSentences.length > 0)) {
    const sourceLines = stepLines.length > 0 ? stepLines : culinaryProseSentences;
    const totalDur = Math.max(hintedDurationSec || sourceLines.length * 12, sourceLines.length * 6);
    const slice = Math.max(4, Math.floor(totalDur / Math.max(1, sourceLines.length)));
    sourceLines.forEach((sentence, idx) => {
      transcriptEntries.push({
        startSec: idx * slice,
        endSec: (idx + 1) * slice,
        text: sentence,
      });
    });
  }

  transcriptEntries.sort((a, b) => a.startSec - b.startSec);

  // Stage 3: Ingredients priority — explicit description list first; transcript/prose fallback ONLY if none found
  let ingredients = ingredientLines.map(parseIngredientLine);
  let usedTranscriptFallback = false;
  if (ingredients.length === 0) {
    const descriptionCombined = descriptionProseLines.join('\n');
    ingredients = extractInlineIngredientsFromProse(descriptionCombined, true);
  }
  if (ingredients.length === 0 && (stepLines.length > 0 || transcriptEntries.length > 0)) {
    usedTranscriptFallback = true;
    const fallbackCombined = [
      ...transcriptEntries.map((t) => t.text),
      ...stepLines,
    ].join('\n');
    ingredients = extractInlineIngredientsFromProse(fallbackCombined, true);
  }
  // In spoken audio transcripts without measured weights (e.g. "שמה אצה, 3 דפי אורז, סלט טונה, חביתה, מלפפון, חסה"),
  // also capture mentioned culinary ingredients from spoken cues cleanly
  if (
    ingredients.length <= 2 &&
    (transcriptEntries.length >= 2 || usedTranscriptFallback || /^\[?\d{1,2}:\d{2}/m.test(normalizedRawText))
  ) {
    const spokenSource =
      transcriptEntries.length > 0
        ? transcriptEntries.map((t) => t.text).join('\n')
        : normalizedRawText;
    ingredients = extractSpokenCulinaryLexiconIngredients(spokenSource, ingredients);
  }

  // Filter out pure intro/chitchat Whisper chunks (e.g. "טוב, עכשיו נראה לכם איך אנחנו עושים...") when culinary action chunks exist
  const actionableTranscript = transcriptEntries.filter(
    (seg) =>
      CULINARY_VERB_REGEX.test(seg.text) ||
      extractDurationSecFromInstruction(seg.text) !== undefined ||
      extractSpokenCulinaryLexiconIngredients(seg.text, []).length > 0
  );
  const stepSourceTranscript =
    actionableTranscript.length >= 2 ? actionableTranscript : transcriptEntries;

  // 3. Extract preparation steps from explicit steps, culinary action sentences, or meaningful transcript cues
  const effectiveStepLines =
    stepLines.length > 0 ? stepLines : culinaryProseSentences;

  const steps: InstructionStep[] = [];
  const usedTranscriptIndices = new Set<number>();

  if (effectiveStepLines.length > 0) {
    effectiveStepLines.forEach((text, idx) => {
      let matchedTs = idx * 12;
      if (transcriptEntries.length > 0) {
        const stepTokens = tokenize(text);
        let bestIdx = -1;
        let bestScore = 0;

        transcriptEntries.forEach((seg, tIdx) => {
          if (usedTranscriptIndices.has(tIdx)) return;
          const segTokens = tokenize(seg.text);
          const overlap = stepTokens.filter((tok) => segTokens.includes(tok)).length;
          if (overlap > bestScore) {
            bestScore = overlap;
            bestIdx = tIdx;
          }
        });

        if (bestIdx === -1) {
          bestIdx = Math.min(
            Math.floor((idx / Math.max(1, effectiveStepLines.length)) * transcriptEntries.length),
            transcriptEntries.length - 1
          );
        }
        usedTranscriptIndices.add(bestIdx);
        matchedTs = transcriptEntries[bestIdx].startSec;
      }

      const cleanStepTitle = text
        .replace(/^[🚨🔥💡👩‍🍳👨‍🍳✅🔹•]+\s*/u, '')
        .split(/[.!?\n]/)[0]
        .trim()
        .slice(0, 48);

      steps.push({
        id: `parsed-step-${idx + 1}`,
        stepNumber: idx + 1,
        title: cleanStepTitle || `Step ${idx + 1}`,
        instruction: text,
        linkedTimestampSec: matchedTs,
        durationSec: extractDurationSecFromInstruction(text),
      });
    });
  } else if (stepSourceTranscript.length > 0) {
    // Only build steps from transcript chunks if at least one culinary cue exists (avoid turning clickbait titles into Step 1)
    const hasCulinarySignal =
      actionableTranscript.length > 0 || ingredients.length > 0;
    if (hasCulinarySignal) {
      stepSourceTranscript.forEach((seg, idx) => {
        steps.push({
          id: `parsed-step-${idx + 1}`,
          stepNumber: idx + 1,
          title: seg.text.split(/[.!?\n]/)[0].slice(0, 48) || `Step ${idx + 1}`,
          instruction: seg.text,
          linkedTimestampSec: seg.startSec,
          durationSec: extractDurationSecFromInstruction(seg.text),
        });
      });
    }
  }

  const transcript: TranscriptSegment[] = transcriptEntries.map((entry, idx) => {
    const nextStart = transcriptEntries[idx + 1]?.startSec ?? entry.startSec + 10;
    const matchingStep = steps.find((s) => s.linkedTimestampSec === entry.startSec);
    return {
      id: `parsed-tr-${idx + 1}`,
      startSec: entry.startSec,
      endSec: entry.endSec
        ? Math.max(entry.startSec + 2, entry.endSec)
        : Math.max(entry.startSec + 4, nextStart),
      text: entry.text,
      linkedStepNumber: matchingStep?.stepNumber,
      prepCue: matchingStep ? `Step ${matchingStep.stepNumber}` : undefined,
    };
  });

  // 4. Separate Dish Name vs Original Video Headline & derive meaningful spaced Meal Type + Dish tags
  const dishName = inferDishName(normalizedRawText, ingredients, steps, suggestedTitle);
  const fullContextForTags = [
    dishName,
    normalizedRawText,
    ingredients.map((i) => i.item).join(' '),
  ].join('\n');
  const inferredDishAndMealTags = inferMealTypeAndDishTags(fullContextForTags, dishName);
  const combinedTags = [...inferredDishAndMealTags];
  const existingSpaceless = new Set(
    combinedTags.map((t) => t.toLowerCase().replace(/\s+/g, ''))
  );
  for (const hTag of cleanHashtagTags) {
    if (combinedTags.length >= 5) break;
    const spaceless = hTag.toLowerCase().replace(/\s+/g, '');
    if (existingSpaceless.has(spaceless)) continue;
    if (/[\u0590-\u05FF]/.test(hTag) && !hTag.includes(' ') && hTag.length >= 9 && combinedTags.length >= 2) {
      continue;
    }
    if (!combinedTags.some((existing) => existing.toLowerCase() === hTag.toLowerCase())) {
      combinedTags.push(hTag);
      existingSpaceless.add(spaceless);
    }
  }

  const lastEnd =
    hintedDurationSec ||
    (transcript.length > 0 ? transcript[transcript.length - 1].endSec : Math.max(30, steps.length * 15));

  return {
    suggestedTitle: dishName,
    dishName,
    videoTitle: suggestedTitle || dishName,
    tags: combinedTags,
    ingredients,
    steps,
    transcript,
    videoDurationSec: Math.max(20, lastEnd),
    hasExplicitRecipeContent: ingredients.length > 0 || steps.length > 0,
  };
}

export function formatShoppingListText(
  recipe: Pick<Recipe, 'title' | 'sourceUrl' | 'servings' | 'ingredients'>,
  checkedIngredientIds: string[],
  servings: number,
  lang: Language = 'en'
): string {
  const checkedSet = new Set(checkedIngredientIds);
  const checkedItems = recipe.ingredients.filter((ing) => checkedSet.has(ing.id));
  const selected = checkedItems.length > 0 ? checkedItems : recipe.ingredients;
  if (selected.length === 0) return '';

  const t = getCopy(lang);
  const scaleFactor = servings / Math.max(1, recipe.servings);
  const servingsLabel = `${servings} ${servings === 1 ? t.detail.servingSingle : t.detail.servingPlural}`;

  const lines: string[] = [
    t.detail.shoppingListHeader(recipe.title, servingsLabel),
  ];
  if (recipe.sourceUrl) {
    lines.push(t.detail.shoppingListSource(recipe.sourceUrl));
  }
  lines.push('');

  for (const ing of selected) {
    const qtyLabel = formatScaledAmount(ing.amount, scaleFactor);
    const parts: string[] = [];
    if (qtyLabel) {
      parts.push(ing.unit ? `${qtyLabel} ${ing.unit}` : qtyLabel);
    } else if (ing.unit) {
      parts.push(ing.unit);
    }
    parts.push(ing.item);
    const noteSuffix = ing.note ? ` (${ing.note})` : '';
    lines.push(`- [ ] ${parts.join(' ').trim()}${noteSuffix}`);
  }

  return lines.join('\n');
}
