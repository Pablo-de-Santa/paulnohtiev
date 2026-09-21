// Northern-hemisphere meteorological seasons; use the visitor's local calendar.
export function seasonForDate(date = new Date()) {
  const month = date.getMonth();
  return month < 2 || month === 11
    ? "winter"
    : month < 5
      ? "spring"
      : month < 8
        ? "summer"
        : "autumn";
}
export const seasonPalettes = {
  autumn: {
    sky: 0xdcc4a6,
    ground: 0x776b39,
    grass: 0x99804a,
    leaves: [0xc56a32, 0xe2a54a, 0xa84830, 0xa89943],
    pine: 0x304e3e,
    water: 0x628f88,
    coat: 0xb87846,
  },
  winter: {
    sky: 0xc5d7df,
    ground: 0xd5dfe0,
    grass: 0x9eaaa2,
    leaves: [0xb1bfc0, 0xd5e0df, 0x8b9fa2],
    pine: 0x466269,
    water: 0xa7d4db,
    coat: 0x456881,
  },
  spring: {
    sky: 0xe1d8c2,
    ground: 0x71864e,
    grass: 0x9dae60,
    leaves: [0x92ac61, 0xe6b2b0, 0xeac9bd, 0x729450],
    pine: 0x3c6451,
    water: 0x69a4a0,
    coat: 0x799881,
  },
  summer: {
    sky: 0xd7d8b9,
    ground: 0x687c42,
    grass: 0x9eaa55,
    leaves: [0x6d914b, 0x8ba24a, 0x4e783f, 0xa5ad56],
    pine: 0x305842,
    water: 0x539e99,
    coat: 0xc8b890,
  },
};
