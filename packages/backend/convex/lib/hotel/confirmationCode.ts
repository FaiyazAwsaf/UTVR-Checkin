const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateConfirmationCode = (): string => {
  let suffix = "";

  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }

  return `UVTR-${suffix}`;
};
