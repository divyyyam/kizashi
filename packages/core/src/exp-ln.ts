/**
 * Bit-exact BigInt port of Solady FixedPointMathLib.expWad / lnWad (MIT,
 * https://github.com/Vectorized/solady, credit Remco Bloemen https://2π.com/22/exp-ln).
 * BigInt `/` truncates toward zero like EVM sdiv and `>>` is arithmetic like sar, so for the
 * Kizashi domains (no 256-bit wrap) results equal the Solidity library exactly.
 */
import { KizashiError } from "./errors";

const LN2_X96 = 54916777467707473351141471128n;

/** exp(x) in WAD, x in WAD. Same truncation as Solady (result in (-1, 0] of the true value). */
export function expWad(x: bigint): bigint {
  if (x <= -41446531673892822313n) return 0n;
  if (x >= 135305999368893231589n) throw new KizashiError("ExpDomain", "exp overflow");
  let y = (x << 78n) / 5n ** 18n;
  const k = ((y << 96n) / LN2_X96 + 2n ** 95n) >> 96n;
  y = y - k * LN2_X96;
  let t = y + 1346386616545796478920950773328n;
  t = ((t * y) >> 96n) + 57155421227552351082224309758442n;
  let p = t + y - 94201549194550492254356042504812n;
  p = ((p * t) >> 96n) + 28719021644029726153956944680412240n;
  p = p * y + (4385272521454847904659076985693276n << 96n);
  let q = y - 2855989394907223263936484059900n;
  q = ((q * y) >> 96n) + 50020603652535783019961831881945n;
  q = ((q * y) >> 96n) - 533845033583426703283633433725380n;
  q = ((q * y) >> 96n) + 3604857256930695427073651918091429n;
  q = ((q * y) >> 96n) - 14423608567350463180887372962807573n;
  q = ((q * y) >> 96n) + 26449188498355588339934803723976023n;
  const r = p / q;
  return (r * 3822833074963236453042738258902158003155416615667n) >> (195n - k);
}

/** ln(x) in WAD for x > 0 in WAD. Same algorithm and rounding as Solady. */
export function lnWad(x: bigint): bigint {
  if (x <= 0n) throw new KizashiError("LnDomain", "ln undefined");
  const log2 = BigInt(x.toString(2).length - 1);
  const r = 255n ^ log2;
  const z = (x << r) >> 159n;
  let p =
    ((((((((3273285459638523848632254066296n + z) * z) >> 96n) +
      24828157081833163892658089445524n) *
      z) >>
      96n) +
      43456485725739037958740375743393n) *
      z) >>
    96n;
  p = p - 11111509109440967052023855526967n;
  p = ((p * z) >> 96n) - 45023709667254063763336534515857n;
  p = ((p * z) >> 96n) - 14706773417378608786704636184526n;
  p = p * z - (795164235651350426258249787498n << 96n);
  let q = 5573035233440673466300451813936n + z;
  q = 71694874799317883764090561454958n + ((z * q) >> 96n);
  q = 283447036172924575727196451306956n + ((z * q) >> 96n);
  q = 401686690394027663651624208769553n + ((z * q) >> 96n);
  q = 204048457590392012362485061816622n + ((z * q) >> 96n);
  q = 31853899698501571402653359427138n + ((z * q) >> 96n);
  q = 909429971244387300277376558375n + ((z * q) >> 96n);
  let out = p / q;
  out = 1677202110996718588342820967067443963516166n * out;
  out = 16597577552685614221487285958193947469193820559219878177908093499208371n * (159n - r) + out;
  out = 600920179829731861736702779321621459595472258049074101567377883020018308n + out;
  return out >> 174n;
}
