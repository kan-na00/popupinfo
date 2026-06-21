// 全国47都道府県の代表座標（中心付近）。
// 「近い順」はこの座標で概算します（市区町村までは見ない＝完全無料・APIなしのMVP方針）。

export interface Pref {
  name: string;
  lat: number;
  lng: number;
}

export const PREFECTURES: Pref[] = [
  { name: "北海道", lat: 43.06, lng: 141.35 },
  { name: "青森県", lat: 40.82, lng: 140.74 },
  { name: "岩手県", lat: 39.7, lng: 141.15 },
  { name: "宮城県", lat: 38.27, lng: 140.87 },
  { name: "秋田県", lat: 39.72, lng: 140.1 },
  { name: "山形県", lat: 38.24, lng: 140.36 },
  { name: "福島県", lat: 37.75, lng: 140.47 },
  { name: "茨城県", lat: 36.34, lng: 140.45 },
  { name: "栃木県", lat: 36.57, lng: 139.88 },
  { name: "群馬県", lat: 36.39, lng: 139.06 },
  { name: "埼玉県", lat: 35.86, lng: 139.65 },
  { name: "千葉県", lat: 35.61, lng: 140.12 },
  { name: "東京都", lat: 35.69, lng: 139.69 },
  { name: "神奈川県", lat: 35.45, lng: 139.64 },
  { name: "新潟県", lat: 37.9, lng: 139.02 },
  { name: "富山県", lat: 36.7, lng: 137.21 },
  { name: "石川県", lat: 36.59, lng: 136.63 },
  { name: "福井県", lat: 36.07, lng: 136.22 },
  { name: "山梨県", lat: 35.66, lng: 138.57 },
  { name: "長野県", lat: 36.65, lng: 138.18 },
  { name: "岐阜県", lat: 35.39, lng: 136.72 },
  { name: "静岡県", lat: 34.98, lng: 138.38 },
  { name: "愛知県", lat: 35.18, lng: 136.91 },
  { name: "三重県", lat: 34.73, lng: 136.51 },
  { name: "滋賀県", lat: 35.0, lng: 135.87 },
  { name: "京都府", lat: 35.02, lng: 135.76 },
  { name: "大阪府", lat: 34.69, lng: 135.52 },
  { name: "兵庫県", lat: 34.69, lng: 135.18 },
  { name: "奈良県", lat: 34.69, lng: 135.83 },
  { name: "和歌山県", lat: 34.23, lng: 135.17 },
  { name: "鳥取県", lat: 35.5, lng: 134.24 },
  { name: "島根県", lat: 35.47, lng: 133.05 },
  { name: "岡山県", lat: 34.66, lng: 133.93 },
  { name: "広島県", lat: 34.4, lng: 132.46 },
  { name: "山口県", lat: 34.19, lng: 131.47 },
  { name: "徳島県", lat: 34.07, lng: 134.56 },
  { name: "香川県", lat: 34.34, lng: 134.04 },
  { name: "愛媛県", lat: 33.84, lng: 132.77 },
  { name: "高知県", lat: 33.56, lng: 133.53 },
  { name: "福岡県", lat: 33.61, lng: 130.42 },
  { name: "佐賀県", lat: 33.25, lng: 130.3 },
  { name: "長崎県", lat: 32.74, lng: 129.87 },
  { name: "熊本県", lat: 32.79, lng: 130.74 },
  { name: "大分県", lat: 33.24, lng: 131.61 },
  { name: "宮崎県", lat: 31.91, lng: 131.42 },
  { name: "鹿児島県", lat: 31.56, lng: 130.56 },
  { name: "沖縄県", lat: 26.21, lng: 127.68 },
];

const PREF_MAP = new Map(PREFECTURES.map((p) => [p.name, p]));

// 既定の並び順（位置情報オフのとき）。指定外は後ろに回す。
export const DEFAULT_ORDER = ["東京都", "神奈川県", "大阪府"];

// 住所表記が都道府県名を含まない場合のための、主要都市→都道府県の補完
const CITY_TO_PREF: [string, string][] = [
  ["横浜", "神奈川県"],
  ["川崎", "神奈川県"],
  ["札幌", "北海道"],
  ["仙台", "宮城県"],
  ["さいたま", "埼玉県"],
  ["千葉市", "千葉県"],
  ["名古屋", "愛知県"],
  ["大阪市", "大阪府"],
  ["梅田", "大阪府"],
  ["難波", "大阪府"],
  ["心斎橋", "大阪府"],
  ["京都市", "京都府"],
  ["神戸", "兵庫県"],
  ["三宮", "兵庫県"],
  ["広島市", "広島県"],
  ["福岡市", "福岡県"],
  ["博多", "福岡県"],
  ["天神", "福岡県"],
  ["那覇", "沖縄県"],
];

/** テキストから都道府県を推定。見つからなければ null */
export function detectPrefecture(text: string): string | null {
  for (const p of PREFECTURES) {
    if (text.includes(p.name)) return p.name;
  }
  // 「東京」「大阪」など接尾辞なしの略称も拾う
  const short = ["東京", "大阪", "京都"];
  for (const s of short) {
    if (text.includes(s)) {
      const full = PREFECTURES.find((p) => p.name.startsWith(s));
      if (full) return full.name;
    }
  }
  for (const [city, pref] of CITY_TO_PREF) {
    if (text.includes(city)) return pref;
  }
  return null;
}

export function centroidOf(prefecture: string): Pref | undefined {
  return PREF_MAP.get(prefecture);
}

/** 2点間の距離(km)。ハバーサイン公式 */
export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** 既定順のための優先度（小さいほど先） */
export function defaultRank(prefecture: string): number {
  const i = DEFAULT_ORDER.indexOf(prefecture);
  return i >= 0 ? i : DEFAULT_ORDER.length + 1;
}
