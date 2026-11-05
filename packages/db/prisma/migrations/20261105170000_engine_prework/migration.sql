BEGIN;

CREATE SCHEMA IF NOT EXISTS "engine_dev_e0e1";

CREATE TABLE "engine_dev_e0e1"."auth_nonces" (
  "nonce" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("nonce")
);

CREATE TABLE "engine_dev_e0e1"."runs" (
  "id" UUID NOT NULL,
  "owner" TEXT NOT NULL,
  "chain_id" INTEGER NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'created',
  "rules_confirmed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "engine_dev_e0e1"."rule_sets" (
  "hash" TEXT NOT NULL,
  "run_id" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "parsed" JSONB NOT NULL,
  "confirmed_at" TIMESTAMPTZ(3),
  CONSTRAINT "rule_sets_pkey" PRIMARY KEY ("run_id", "hash")
);

CREATE TABLE "engine_dev_e0e1"."run_events" (
  "run_id" UUID NOT NULL,
  "seq" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "t_sec" BIGINT NOT NULL,
  CONSTRAINT "run_events_pkey" PRIMARY KEY ("run_id", "seq")
);

CREATE TABLE "engine_dev_e0e1"."effects" (
  "key" TEXT NOT NULL,
  "run_id" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "result" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "effects_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "engine_dev_e0e1"."executions" (
  "trade_id" TEXT NOT NULL,
  "run_id" UUID NOT NULL,
  "tx_hash" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "charge_usdc" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "executions_pkey" PRIMARY KEY ("trade_id")
);

CREATE TABLE "engine_dev_e0e1"."kill_switch" (
  "run_id" UUID NOT NULL,
  "stopped" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "kill_switch_pkey" PRIMARY KEY ("run_id")
);

CREATE INDEX "auth_nonces_expires_at_idx" ON "engine_dev_e0e1"."auth_nonces"("expires_at");
CREATE INDEX "runs_owner_created_at_idx" ON "engine_dev_e0e1"."runs"("owner", "created_at");
CREATE INDEX "effects_run_id_idx" ON "engine_dev_e0e1"."effects"("run_id");
CREATE INDEX "executions_run_id_idx" ON "engine_dev_e0e1"."executions"("run_id");

ALTER TABLE "engine_dev_e0e1"."rule_sets" ADD CONSTRAINT "rule_sets_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "engine_dev_e0e1"."runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engine_dev_e0e1"."run_events" ADD CONSTRAINT "run_events_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "engine_dev_e0e1"."runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engine_dev_e0e1"."effects" ADD CONSTRAINT "effects_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "engine_dev_e0e1"."runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engine_dev_e0e1"."executions" ADD CONSTRAINT "executions_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "engine_dev_e0e1"."runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engine_dev_e0e1"."kill_switch" ADD CONSTRAINT "kill_switch_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "engine_dev_e0e1"."runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
