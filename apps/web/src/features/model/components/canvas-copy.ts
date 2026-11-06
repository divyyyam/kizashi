export const canvasCopy = {
  label: "Model canvas",
  panels: {
    context: "Run notes",
    analysis: "Analysis",
    markets: "Markets",
    collateral: "Collateral",
  },
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  reset: "Reset layout",
  hint: "Drag the canvas to pan · Ctrl + scroll to zoom · Drag a panel title to move",
  keyboard: "Use arrow keys to move this panel. Hold Shift for larger steps.",
  move: (name: string) => `Move ${name}`,
} as const;
