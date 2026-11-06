#!/usr/bin/env bash
# Plain v4 swaps on the KZT/USDC pool so the hook records TWAP observations. Run during the
# 5 minutes before a TWAP market closes:  bash contracts/script/swap-arc.sh [count]
# Then settle:  cast send <KizashiResolver> "resolveFromTwap(uint256)" 2 --rpc-url ... --private-key ...
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source ../.env; set +a
RPC="${ARC_RPC_OVERRIDE:-${ARC_TESTNET_RPC_URL:-https://rpc.testnet.arc.io}}"
USDC=0x3600000000000000000000000000000000000000
j() { python3 -c "import json;print(json.load(open('deployments/5042002.json'))['$1']['address'])"; }
KZT=$(j KizashiTestToken); HOOK=$(j KizashiOracleHook); SWAP=$(j PoolSwapTest)
if python3 -c "import sys;sys.exit(0 if int('$USDC',16) < int('$KZT',16) else 1)"; then C0=$USDC; C1=$KZT; else C0=$KZT; C1=$USDC; fi
KEY="($C0,$C1,3000,60,$HOOK)"
N=${1:-12}
AMOUNT0=${SWAP_AMOUNT0:-10000}   # exact-in units of token0
AMOUNT1=${SWAP_AMOUNT1:-10000}   # exact-in units of token1
for i in $(seq 1 "$N"); do
  if [ $((i % 2)) -eq 1 ]; then ARGS="(true,-$AMOUNT0,4295128740)"; else ARGS="(false,-$AMOUNT1,1461446703485210103287273052203988822378723970341)"; fi
  cast send --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --gas-price "${ARC_GAS_PRICE:-25gwei}" "$SWAP" \
    "swap((address,address,uint24,int24,address),(bool,int256,uint160),(bool,bool),bytes)" "$KEY" "$ARGS" "(false,false)" 0x > /dev/null
  echo "swap $i/$N done"
  sleep 2 # one observation per block; Arc blocks are ~0.5 s
done
echo "latest observation: $(cast call "$HOOK" 'latest(bytes32)((uint32,int24,int56))' "$(cast keccak "$(cast abi-encode 'f((address,address,uint24,int24,address))' "$KEY")")" --rpc-url "$RPC")"
