import { BrandGlyph } from "@/components/layout/BrandGlyph";
import { copy } from "@/content/copy";
import { appChain } from "@/lib/wagmi";

const LAYERS = ["base", "middle", "face"] as const;
const TILE = "M22 69 109 25 199 70 112 115Z";

/** An exploded seal assembled from the same vector mark used in the opening curtain. */
export function WalletPlate() {
  return (
    <div className="wallet-plate">
      <span className="wallet-wordmark">{copy.site.name}</span>
      <svg className="wallet-diagram" aria-hidden="true" viewBox="0 0 220 165" fill="none">
        <path className="wallet-guides" d="M0 80H220M110 0V165M0 135 220 25M0 25 220 135" />
        {LAYERS.map((layer) => (
          <g className={`wallet-layer wallet-layer-${layer}`} key={layer}>
            <path d="m22 69 90 46 87-45v5l-87 45-90-46Z" className="wallet-edge" />
            <path d={TILE} className="wallet-tile" />
            {layer === "face" && (
              <g transform="matrix(.7 .35 -.7 .35 110 39)">
                <svg width="88" height="88" viewBox="0 0 100 100" aria-hidden="true">
                  <BrandGlyph className="wallet-engraving" />
                </svg>
              </g>
            )}
          </g>
        ))}
      </svg>
      <div className="wallet-network">
        <span className="text-label text-text-faint">{copy.connect.network}</span>
        <span>{appChain.name}</span>
      </div>
    </div>
  );
}
