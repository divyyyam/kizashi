export type CurveParams = { mean: number; sigma: number };
export type CurveGrid = {
  lo: number;
  width: number;
  count: number;
  unit: string;
  precision: number;
};
export type CurveEditorProps = {
  grid: CurveGrid;
  crowdPrices: readonly number[];
  value?: CurveParams;
  onChange?: (next: CurveParams) => void;
  highlight?: { fromBucket: number; toBucket: number };
  height?: number;
  ariaLabel: string;
};
