export type GuestLanguage = "bn" | "en";

const BANGLA_UNICODE_BLOCK = /[ঀ-৿]/;

// Deterministic language match for tool-authored strings: booking tools
// return fully-formed sentences the agent relays verbatim (not paraphrased),
// so the *tool* has to pick the right language, not the agent's prompt.
export const detectGuestLanguage = (text: string | null | undefined): GuestLanguage => {
  if (!text) {
    return "en";
  }

  return BANGLA_UNICODE_BLOCK.test(text) ? "bn" : "en";
};

export const pickByLanguage = <T>(
  language: GuestLanguage,
  variants: { bn: T; en: T },
): T => (language === "bn" ? variants.bn : variants.en);
