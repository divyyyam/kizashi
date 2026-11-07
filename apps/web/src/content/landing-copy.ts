export const landingCopy = {
  hero: {
    eyebrow: "Outcome markets on Arc",
    headlineLead: "Bet on the",
    headlineAccent: "shape",
    headlineTail: "of what happens.",
    subtitle:
      "Kizashi splits a real-world number into buckets and prices every bet with one LMSR curve. Take a side, or draw a bell curve over the crowd’s. Your bets are netted, so collateral covers your worst case, not the sum of every bet.",
    primary: "Launch app",
    secondary: "How netting works",
  },
  curve: {
    label: "Your curve",
    title: "Drag to move your belief",
    grid: "32 buckets · $120–152 · SOL price at Friday’s close",
    crowd: "Crowd, fresh market",
    yours: "Your curve",
    mean: "Mean",
    width: "Width",
    peak: "Most likely",
    share: "Share",
    widen: "Wider",
    narrow: "Narrower",
    slider: "Curve mean",
    caption: "Example distribution on a 32-bucket grid.",
    unit: "USD",
  },
  netting: {
    eyebrow: "The thesis",
    titleLead: "Collateral for the sum of your bets,",
    titleAccent: "not each one.",
    body: "Every bet is a payout vector over the buckets. Kizashi adds your vectors and backs the worst case of the sum. Because the minimum of a sum is never below the sum of minimums, netting never frees less.",
    cases: "Example",
    tickets: "Tickets",
    bucket: (index: number) => `Bucket ${index + 1}`,
    gross: "Gross",
    grossHelp: "Each ticket backed on its own",
    netted: "Netted",
    nettedHelp: "Worst case of the combined vector",
    freed: "Freed by netting",
    caption:
      "Exact two-bucket examples from the Formula accounting spec, in USDC. Purchase cost is excluded; freed backing is not a cash withdrawal.",
    examples: {
      short: "Standalone short",
      hedge: "Short, then hedge",
      offset: "Offsetting shorts",
    },
  },
  modes: {
    eyebrow: "Two ways in",
    titleLead: "One market,",
    titleAccent: "two kinds of trader.",
    simpleTitle: "Simple",
    simpleBody:
      "Above or below a threshold. A step vector that pays on every bucket past the line.",
    expressiveTitle: "Expressive",
    expressiveBody:
      "Drag a bell curve. Its mean and width become a payout vector across every bucket.",
    shared:
      "Both are priced by the same LMSR cost function, so they trade against one crowd-curve.",
  },
  lifecycle: {
    eyebrow: "How a market lives",
    titleLead: "From question to",
    titleAccent: "settlement.",
    steps: [
      {
        title: "Create",
        body: "A question over a numeric range, split into buckets. Rules are stored on Swarm.",
      },
      {
        title: "Trade",
        body: "LMSR prices every bet. Formula nets each trader’s position in the market.",
      },
      {
        title: "Resolve",
        body: "The outcome settles from a Uniswap v4 TWAP or the market’s authorised resolver.",
      },
      {
        title: "Redeem",
        body: "The winning bucket pays out in USDC. Unneeded backing is releasable before then.",
      },
    ],
  },
  stack: {
    eyebrow: "Built on",
    items: [
      { name: "Arc", role: "Settlement in USDC. Every amount on screen is USDC." },
      { name: "Uniswap v4", role: "Prices and TWAP resolution for on-chain outcomes." },
      { name: "Arkiv", role: "Public, owner-signed records of markets and crowd-curves." },
    ],
  },
  cta: {
    titleLead: "The crowd has a curve.",
    titleAccent: "Draw yours.",
    primary: "Launch app",
    secondary: "Create a market",
  },
} as const;
