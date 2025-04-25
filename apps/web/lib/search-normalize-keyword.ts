/**
 * @see https://react-pdf-viewer.dev
 * @license https://react-pdf-viewer.dev/license
 * @copyright 2019-2024 Nguyen Huu Phuoc <me@phuoc.ng>
 */

// Minimal types adapted from @react-pdf-viewer/search
export interface SingleKeyword {
  keyword: string;
  matchCase?: boolean;
  wholeWords?: boolean;
}

export interface NormalizedKeyword {
  keyword: string;
  regExp: RegExp;
  wholeWords: boolean;
}

export const EMPTY_KEYWORD_REGEXP: NormalizedKeyword = {
  keyword: "",
  regExp: new RegExp("", "g"),
  wholeWords: false,
};

// `$&` means the whole matched string
const escapeRegExp = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeFlagKeyword = (
  flagKeyword: SingleKeyword
): NormalizedKeyword => {
  const source = flagKeyword.wholeWords
    ? ` ${flagKeyword.keyword} `
    : flagKeyword.keyword;
  const flags = flagKeyword.matchCase ? "g" : "gi";
  return {
    keyword: flagKeyword.keyword,
    regExp: new RegExp(escapeRegExp(source), flags),
    wholeWords: flagKeyword.wholeWords || false,
  };
};

export const normalizeSingleKeyword = (
  keyword: string | SingleKeyword | RegExp,
  matchCase?: boolean,
  wholeWords?: boolean
): NormalizedKeyword => {
  if (keyword instanceof RegExp) {
    return {
      keyword: keyword.source,
      regExp: keyword,
      wholeWords: wholeWords || false,
    };
  }

  // Normalize a string keyword
  if (typeof keyword === "string") {
    return keyword === ""
      ? EMPTY_KEYWORD_REGEXP
      : normalizeFlagKeyword({
          keyword,
          matchCase: matchCase || false,
          wholeWords: wholeWords || false,
        });
  }

  // Normalize a keyword with flags (SingleKeyword object)
  if (typeof matchCase !== "undefined") {
    keyword.matchCase = matchCase;
  }
  if (typeof wholeWords !== "undefined") {
    keyword.wholeWords = wholeWords;
  }
  return normalizeFlagKeyword(keyword);
};
