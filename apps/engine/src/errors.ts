import type { EngineErrorCode, NodeName } from "@kizashi/schemas/engine";

export class EngineServiceError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string,
    readonly status: number = 500,
  ) {
    super(message);
    this.name = "EngineServiceError";
  }
}

export class UnavailableNodeError extends EngineServiceError {
  constructor(readonly node: NodeName) {
    super("internal", `${node} is not configured.`, 503);
    this.name = "UnavailableNodeError";
  }
}
