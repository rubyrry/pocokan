const ANGKA_SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

const angkaKeKata = (value: number): string => {
  if (value < 12) return ANGKA_SATUAN[value];
  if (value < 20) return `${ANGKA_SATUAN[value - 10]} belas`;
  if (value < 100) {
    return `${angkaKeKata(Math.floor(value / 10))} puluh ${angkaKeKata(value % 10)}`.trim();
  }
  if (value < 200) return `seratus ${angkaKeKata(value - 100)}`.trim();
  if (value < 1000) {
    return `${angkaKeKata(Math.floor(value / 100))} ratus ${angkaKeKata(value % 100)}`.trim();
  }
  if (value < 2000) return `seribu ${angkaKeKata(value - 1000)}`.trim();
  if (value < 1_000_000) {
    return `${angkaKeKata(Math.floor(value / 1000))} ribu ${angkaKeKata(value % 1000)}`.trim();
  }
  if (value < 1_000_000_000) {
    return `${angkaKeKata(Math.floor(value / 1_000_000))} juta ${angkaKeKata(value % 1_000_000)}`.trim();
  }
  if (value < 1_000_000_000_000) {
    return `${angkaKeKata(Math.floor(value / 1_000_000_000))} miliar ${angkaKeKata(value % 1_000_000_000)}`.trim();
  }

  return `${angkaKeKata(Math.floor(value / 1_000_000_000_000))} triliun ${angkaKeKata(value % 1_000_000_000_000)}`.trim();
};

export const formatTerbilang = (value: number): string => {
  const numberValue = Number(value);
  const roundedValue = Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
  const sign = roundedValue < 0 ? "minus " : "";
  const words = roundedValue === 0 ? "nol" : angkaKeKata(Math.abs(roundedValue));

  return `${sign}${words} rupiah`.replace(/\s+/g, " ").toUpperCase();
};

// ── Format terbilang khusus gaji (slip lama perusahaan) ────────────────────
// Aturan: Title Case, tanpa "Rupiah", puluhan/ratusan digabung
// ("Tujuh Puluh" -> "Tujuhpuluh", "Lima Ratus" -> "Limaratus"),
// satuan besar ("Ribu", "Juta", ...) tetap terpisah.
// Contoh: 78500 -> "Tujuhpuluh Delapan Ribu Limaratus"
//          50464 -> "Limapuluh Ribu Empatratus Enampuluh Empat"
const angkaKeKataGaji = (value: number): string => {
  if (value < 12) return ANGKA_SATUAN[value];
  if (value < 20) return `${ANGKA_SATUAN[value - 10]} belas`;
  if (value < 100) {
    const depan = Math.floor(value / 10);
    const sisa = value % 10;
    const puluhKata = `${angkaKeKataGaji(depan)}puluh`;
    return sisa === 0 ? puluhKata : `${puluhKata} ${angkaKeKataGaji(sisa)}`;
  }
  if (value < 200) return `seratus ${angkaKeKataGaji(value - 100)}`.trim();
  if (value < 1000) {
    const depan = Math.floor(value / 100);
    const sisa = value % 100;
    const ratusKata = `${angkaKeKataGaji(depan)}ratus`;
    return sisa === 0 ? ratusKata : `${ratusKata} ${angkaKeKataGaji(sisa)}`;
  }
  if (value < 2000) return `seribu ${angkaKeKataGaji(value - 1000)}`.trim();
  if (value < 1_000_000) {
    return `${angkaKeKataGaji(Math.floor(value / 1000))} ribu ${angkaKeKataGaji(value % 1000)}`.trim();
  }
  if (value < 1_000_000_000) {
    return `${angkaKeKataGaji(Math.floor(value / 1_000_000))} juta ${angkaKeKataGaji(value % 1_000_000)}`.trim();
  }
  if (value < 1_000_000_000_000) {
    return `${angkaKeKataGaji(Math.floor(value / 1_000_000_000))} miliar ${angkaKeKataGaji(value % 1_000_000_000)}`.trim();
  }

  return `${angkaKeKataGaji(Math.floor(value / 1_000_000_000_000))} triliun ${angkaKeKataGaji(value % 1_000_000_000_000)}`.trim();
};

const toTitleCasePerKata = (text: string): string =>
  text
    .split(" ")
    .filter(Boolean)
    .map((kata) => kata.charAt(0).toUpperCase() + kata.slice(1).toLowerCase())
    .join(" ");

export const formatTerbilangGaji = (value: number): string => {
  const numberValue = Number(value);
  const roundedValue = Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
  const sign = roundedValue < 0 ? "Minus " : "";
  const words =
    roundedValue === 0 ? "nol" : angkaKeKataGaji(Math.abs(roundedValue));

  return `${sign}${toTitleCasePerKata(words)}`.replace(/\s+/g, " ").trim();
};
