// Google Calendar's fixed event color palette (colorId -> hex). A subset of the
// full 1-11 palette, enough to offer a meaningful picker without overwhelming the UI.
export const EVENT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "1", label: "Lavender", hex: "#7986cb" },
  { id: "2", label: "Sage", hex: "#33b679" },
  { id: "4", label: "Flamingo", hex: "#e67c73" },
  { id: "5", label: "Banana", hex: "#f6bf26" },
  { id: "7", label: "Peacock", hex: "#039be5" },
  { id: "11", label: "Tomato", hex: "#d50000" },
];

const DEFAULT_COLOR = "#3f51b5";

export function colorIdToHex(colorId: string | undefined): string {
  return EVENT_COLORS.find((c) => c.id === colorId)?.hex ?? DEFAULT_COLOR;
}
