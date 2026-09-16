const smallNumbers = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];

const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

const underThousand = (value: number): string => {
  if (value < 20) return smallNumbers[value] ?? String(value);
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? `-${smallNumbers[value % 10]}` : ""}`;
  return `${smallNumbers[Math.floor(value / 100)]} hundred${value % 100 ? ` ${underThousand(value % 100)}` : ""}`;
};

export const numberToWords = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  if (value < 0) return `minus ${numberToWords(Math.abs(value))}`;
  if (value < 1000) return underThousand(Math.floor(value));
  if (value < 1_000_000) return `${underThousand(Math.floor(value / 1000))} thousand${value % 1000 ? ` ${underThousand(value % 1000)}` : ""}`;
  return `${underThousand(Math.floor(value / 1_000_000))} million${value % 1_000_000 ? ` ${numberToWords(value % 1_000_000)}` : ""}`;
};

export const spokenEnglishDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const bengaliDigits = (value: number | string): string =>
  String(value).replace(/[0-9]/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)] ?? digit);

export const spokenBengaliDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};
