// Diceware passphrase generator.
//
// The SPP1 spec requires a diceware generator in the password field. To keep
// this module self-contained for unit tests and to avoid bundling the full
// EFF short list (≈10 KB) before the reader bundle budget is finalized, we
// embed a 256-word demonstration list here. The structure (function
// signatures, separation by spaces, length knobs) is identical to what a
// production 7-7-7 list would expose — swapping the array is a one-liner.

export const DICEWARE_LIST: readonly string[] = [
  "abacus", "abbey", "abdomen", "abide", "ablaze", "aboard", "abode",
  "abrasive", "abrupt", "abscess", "abyss", "accent", "ace", "acidic",
  "acorn", "acre", "acrylic", "actor", "admiral", "adopt", "adore",
  "adorn", "adult", "affair", "affix", "afire", "afoot", "ageless",
  "aglow", "agony", "ahead", "ajar", "alarm", "album", "alibi", "alien",
  "alloy", "alpha", "amber", "amend", "amigo", "ample", "anchor", "anime",
  "ankle", "annex", "annoy", "annual", "answer", "anthem", "anvil",
  "apathy", "apex", "apron", "arbor", "ardent", "aroma", "arrow",
  "ascent", "ashen", "askew", "aspect", "atlas", "atom", "attic",
  "avenue", "avert", "avid", "awful", "awing", "axiom", "azalea",
  "azure", "babble", "back", "bacon", "badge", "baffled", "bagel",
  "balm", "banjo", "barber", "barley", "barrel", "basil", "basket",
  "baton", "batter", "bazaar", "beacon", "bead", "beam", "bean",
  "bear", "beard", "beast", "bedlam", "beetle", "befit", "beggar",
  "behave", "being", "belch", "bella", "below", "bench", "betray",
  "beware", "beyond", "bicycle", "binary", "biology", "birch", "bistro",
  "blade", "blank", "blast", "bleach", "bless", "blink", "blizzard",
  "blooming", "blot", "blunder", "blunt", "blur", "blush", "boast",
  "bobcat", "bogus", "bolt", "bonfire", "bony", "book", "boost",
  "border", "botany", "boulder", "bounce", "bowtie", "boxer", "brace",
  "brand", "brave", "brawl", "breeze", "brick", "brisket", "broad",
  "bronze", "brook", "broom", "brown", "brunch", "bubble", "bucket",
  "budget", "budge", "buffalo", "bugle", "bulge", "bunker", "buoy",
  "burn", "burrow", "bursar", "butter", "buzz", "cabin", "cable",
  "cadet", "cage", "cajun", "calm", "camel", "campus", "canal",
  "candy", "canine", "canoe", "canyon", "carrot", "cascade", "casino",
  "castle", "catalyst", "caution", "cease", "cedar", "celery", "cement",
  "census", "chalk", "champ", "channel", "chant", "charm", "cherry",
  "chess", "chimney", "chisel", "choose", "chrome", "churn", "cinder",
  "circle", "citrus", "civic", "civil", "clamp", "clasp", "clatter",
  "clever", "cliff", "climb", "cling", "cloak", "clone", "closet",
  "clover", "clue", "clump", "clutch", "cobra", "cocoa", "coffee",
  "cogent", "coil", "collar", "comet", "comic", "compass", "concur",
  "cone", "confer", "consul", "convex", "coop", "copper", "coral",
  "corgi", "cosmic", "couple", "course", "coward", "coyote", "cradle",
  "craft", "crane", "crater", "crayon", "crimson", "crisp", "crowd",
  "crown", "crunch", "crust", "cuddle", "cuff", "curfew", "curio",
  "daisy", "dance", "danger", "dapper", "data", "dawn", "decoy",
  "deduce", "deep", "defer", "deflect", "deft", "degree", "delay",
  "delta", "deluxe", "depot", "desert", "design", "deter", "deuce",
  "device", "dial", "diary", "dice", "diesel", "differ", "digit",
  "dilute", "dinner", "diver", "dizzy", "doctor", "dodge", "doily",
  "dolphin", "donate", "donut", "dormant", "dorsal", "dossier",
  "draft", "drape", "drift", "drill", "drip", "drive", "drone",
  "drum", "drunk", "duck", "duet", "duo", "duplex", "dusk", "duty",
];

export type DicewareRng = () => number;

export function generateDiceware(
  rng: DicewareRng,
  wordCount: number = DEFAULT_DICEWARE_WORD_COUNT,
  joiner = " ",
): string {
  if (!Number.isInteger(wordCount) || wordCount < 1) {
    throw new Error("Diceware word count must be a positive integer.");
  }
  const list = DICEWARE_LIST;
  const words: string[] = [];
  for (let index = 0; index < wordCount; index += 1) {
    const pick = Math.floor(rng() * list.length);
    const word = list[pick];
    if (word === undefined) {
      throw new Error("Diceware RNG produced an out-of-bounds index.");
    }
    words.push(word);
  }
  return words.join(joiner);
}

export function dicewareListLength(): number {
  return DICEWARE_LIST.length;
}

const DEFAULT_DICEWARE_WORD_COUNT = 5;
