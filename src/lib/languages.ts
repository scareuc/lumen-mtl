export const LANGUAGES = [
  "Japanese",
  "Korean",
  "Chinese",
  "Spanish",
  "French",
  "German",
  "Russian",
  "Portuguese",
  "Italian",
  "Arabic",
  "Other",
] as const;

export type Language = (typeof LANGUAGES)[number];
