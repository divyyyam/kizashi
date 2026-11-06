/** Error codes match the Solidity custom errors in contracts/src/core/KizashiTypes.sol. */
export type KizashiErrorCode =
  | "BadGrid"
  | "BadBucket"
  | "BadRange"
  | "LengthMismatch"
  | "ZeroTrade"
  | "TradeTooLarge"
  | "ExpDomain"
  | "LnDomain"
  | "NegativeAmount"
  | "BadLiquidity"
  | "BadShape";

export class KizashiError extends Error {
  readonly code: KizashiErrorCode;

  constructor(code: KizashiErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "KizashiError";
    this.code = code;
  }
}
