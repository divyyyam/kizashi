#!/usr/bin/env bash
# Deploy Kizashi to Arc testnet in one go. Run in WSL from the repo root or contracts/:
#   bash contracts/script/deploy-arc.sh            # checks, dry run, deploy, demo markets, verify
#   SKIP_DEMO=1 bash contracts/script/deploy-arc.sh # without demo markets
# Reads the root .env: DEPLOYER_PRIVATE_KEY (required), ARC_TESTNET_RPC_URL, optional
# RESOLVER_ROLE, POOL_MANAGER, SEED_LIQUIDITY, DEMO_SUBSIDY_USDC, DEMO_CLOSE_SECONDS.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
source ../.env
set +a

RPC="${ARC_RPC_OVERRIDE:-${ARC_TESTNET_RPC_URL:-https://rpc.testnet.arc.network}}" # override only for local rehearsal
export ARC_TESTNET_RPC_URL="$RPC"
USDC=0x3600000000000000000000000000000000000000
CREATE2=0x4e59b44847b379578588920cA78FbF26c0B4956C
VERIFY=(--verify --verifier blockscout --verifier-url https://testnet.arcscan.app/api/)
NEED_USDC=${NEED_USDC:-12000000} # 12 USDC in base units: gas + 5 seed liquidity + 2 x 2 demo

step() { printf '\n== %s\n' "$1"; }
die() { printf 'STOP: %s\n' "$1" >&2; exit 1; }

[ -n "${DEPLOYER_PRIVATE_KEY:-}" ] || die "DEPLOYER_PRIVATE_KEY is empty in .env"
DEPLOYER=$(cast wallet address "$DEPLOYER_PRIVATE_KEY")

step "1/6 network"
CHAIN=$(cast chain-id --rpc-url "$RPC")
[ "$CHAIN" = "5042002" ] || die "RPC is chain $CHAIN, expected Arc testnet 5042002"
echo "Arc testnet OK via $RPC"

step "2/6 CREATE2 deployer (needed for the mined hook address)"
[ "$(cast code "$CREATE2" --rpc-url "$RPC")" != "0x" ] || die "no CREATE2 deployer at $CREATE2 on Arc; tell Claude"
echo "present"

step "3/6 deployer funds"
BAL=$(cast call "$USDC" "balanceOf(address)(uint256)" "$DEPLOYER" --rpc-url "$RPC" | awk '{print $1}')
echo "deployer $DEPLOYER holds $BAL USDC base units (need $NEED_USDC)"
[ "$BAL" -ge "$NEED_USDC" ] || die "fund $DEPLOYER with Arc testnet USDC at https://faucet.circle.com and rerun"

deployed() {
  # The script writes the JSON during simulation too, so only on-chain code proves a deploy.
  [ -f deployments/5042002.json ] || return 1
  local f
  f=$(python3 -c "import json;print(json.load(open('deployments/5042002.json'))['KizashiMarketFactory']['address'])")
  [ "$(cast code "$f" --rpc-url "$RPC")" != "0x" ]
}

if deployed; then
  echo "Kizashi is already deployed on this chain; skipping the core deploy"
else
  step "4/6 dry run, then deploy the system"
  forge script ${FORGE_EXTRA:-} script/01_DeployAll.s.sol --rpc-url arc_testnet
  forge script ${FORGE_EXTRA:-} script/01_DeployAll.s.sol --rpc-url arc_testnet --broadcast --slow
  deployed || die "broadcast finished but the factory has no code on chain; check the forge output above"
  forge script ${FORGE_EXTRA:-} script/01_DeployAll.s.sol --rpc-url arc_testnet --broadcast --resume "${VERIFY[@]}" ||
    echo "WARN: verification failed; contracts are deployed. Rerun the verify step later."
fi

if [ "${SKIP_DEMO:-0}" != "1" ]; then
  step "5/6 demo markets"
  forge script ${FORGE_EXTRA:-} script/02_DemoMarkets.s.sol --rpc-url arc_testnet --broadcast --slow
else
  step "5/6 demo markets skipped"
fi

step "6/6 addresses (deployments/5042002.json)"
python3 -c "import json;[print(f'{k:28} {v[\"address\"]}  block {v[\"block\"]}') for k,v in json.load(open('deployments/5042002.json')).items()]"
FACTORY=$(python3 -c "import json;print(json.load(open('deployments/5042002.json'))['KizashiMarketFactory']['address'])")
echo "markets created: $(cast call "$FACTORY" 'marketCount()(uint256)' --rpc-url "$RPC")"
echo
echo "Done. Commit contracts/deployments/5042002.json and push. Explorer: https://testnet.arcscan.app/address/$FACTORY"
