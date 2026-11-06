#!/usr/bin/env bash
# Deploy Kizashi to Arc testnet in one go. Run in WSL from the repo root or contracts/:
#   bash contracts/script/deploy-arc.sh            # checks, dry run, deploy, demo markets, verify
#   SKIP_DEMO=1 bash contracts/script/deploy-arc.sh # without demo markets
# Reads the root .env: DEPLOYER_PRIVATE_KEY (required), ARC_TESTNET_RPC_URL, optional
# RESOLVER_ROLE, POOL_MANAGER, SEED_LIQUIDITY, DEMO_SUBSIDY_USDC, DEMO_CLOSE_SECONDS.
# forge script only deploys (no USDC calls); every USDC-moving step uses cast send.
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

# --- everything that moves USDC goes through cast: the Arc node executes it with its native
# --- precompiles; Foundry's local script execution cannot (blocklist precompile 0x1800..01).
j() { python3 -c "import json;print(json.load(open('deployments/5042002.json'))['$1']['address'])"; }
send() { cast send --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" "$@" > /dev/null; }
MAX=115792089237316195423570985008687907853269984665640564039457584007913129639935
KZT=$(j KizashiTestToken); HOOK=$(j KizashiOracleHook); LIQ=$(j PoolModifyLiquidityTest)
SWAP=$(j PoolSwapTest); FACTORY=$(j KizashiMarketFactory)
if python3 -c "import sys;sys.exit(0 if int('$USDC',16) < int('$KZT',16) else 1)"; then
  C0=$USDC; C1=$KZT; BASE0=false
else
  C0=$KZT; C1=$USDC; BASE0=true
fi
KEY="($C0,$C1,3000,60,$HOOK)"

POOL_ID=$(cast keccak "$(cast abi-encode 'f((address,address,uint24,int24,address))' "$KEY")")
LIVE=$(cast call "$HOOK" "liquidity(bytes32)(uint128)" "$POOL_ID" --rpc-url "$RPC" 2>/dev/null | awk '{print $1}' || echo 0)
if [ "${LIVE:-0}" = "0" ]; then
  step "4b/6 seed the KZT/USDC v4 pool (${SEED_LIQUIDITY:-5000000000000} liquidity units, ~5 USDC a side)"
  send "$USDC" "approve(address,uint256)" "$LIQ" "$MAX"
  send "$USDC" "approve(address,uint256)" "$SWAP" "$MAX"
  send "$KZT" "approve(address,uint256)" "$LIQ" "$MAX"
  send "$KZT" "approve(address,uint256)" "$SWAP" "$MAX"
  send "$LIQ" "modifyLiquidity((address,address,uint24,int24,address),(int24,int24,int256,bytes32),bytes)" \
    "$KEY" "(-887220,887220,${SEED_LIQUIDITY:-5000000000000},0x0000000000000000000000000000000000000000000000000000000000000000)" 0x
  echo "seeded"
else
  echo "pool already has liquidity ($LIVE); skipping seed"
fi

if [ "${SKIP_DEMO:-0}" != "1" ]; then
  step "5/6 demo markets (cast)"
  SUB=${DEMO_SUBSIDY_USDC:-2000000}
  CLOSE=$(( $(date +%s) + ${DEMO_CLOSE_SECONDS:-7200} ))
  ZERO=0x0000000000000000000000000000000000000000
  SIG="createMarket(((uint256,int256,int256,address),uint256,uint64,uint8,uint8,bytes32,((address,address,uint24,int24,address),bool,uint8,uint8,uint8,uint32,uint16,uint128)))"
  send "$USDC" "approve(address,uint256)" "$FACTORY" $((2 * SUB))
  # Manual expressive market: 16 buckets of 2 km/h from 130 (bowler top speed).
  send "$FACTORY" "$SIG" "((16,130,2,$USDC),$SUB,$CLOSE,1,1,$(cast keccak kizashi-demo-manual),(($ZERO,$ZERO,0,0,$ZERO),false,0,0,0,0,0,0))"
  # TWAP market: KZT price 0.50..2.50 USDC in 8 buckets of 0.25, settled from the hook.
  send "$FACTORY" "$SIG" "((8,50,25,$USDC),$SUB,$CLOSE,1,2,$(cast keccak kizashi-demo-twap),($KEY,$BASE0,18,6,2,300,10,1))"
  echo "created; both close at $(date -d @$CLOSE '+%H:%M %Z' 2>/dev/null || echo $CLOSE)"
else
  step "5/6 demo markets skipped"
fi

step "6/6 addresses (deployments/5042002.json)"
python3 -c "import json;[print(f'{k:28} {v[\"address\"]}  block {v[\"block\"]}') for k,v in json.load(open('deployments/5042002.json')).items()]"
echo "markets created: $(cast call "$FACTORY" 'marketCount()(uint256)' --rpc-url "$RPC")"
echo
echo "Done. Commit contracts/deployments/5042002.json and push. Explorer: https://testnet.arcscan.app/address/$FACTORY"
