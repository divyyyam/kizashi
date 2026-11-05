import type { NodeName } from "@kizashi/schemas/engine";
import { UnavailableNodeError } from "../../errors";
import type { EngineState, EngineUpdate } from "../state";

export type EngineNode = (state: EngineState) => Promise<EngineUpdate>;

function unavailable(node: NodeName): EngineNode {
  return async (_state) => {
    throw new UnavailableNodeError(node);
  };
}

export const nodeStubs: Record<NodeName, EngineNode> = {
  ingestRules: unavailable("ingestRules"),
  confirmRules: unavailable("confirmRules"),
  loadContext: unavailable("loadContext"),
  gate: unavailable("gate"),
  plan: unavailable("plan"),
  compile: unavailable("compile"),
  risk: unavailable("risk"),
  select: unavailable("select"),
  publishProposal: unavailable("publishProposal"),
  suggestApproval: unavailable("suggestApproval"),
  awaitUserTx: unavailable("awaitUserTx"),
  execute: unavailable("execute"),
  confirm: unavailable("confirm"),
  record: unavailable("record"),
};
