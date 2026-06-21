#!/usr/bin/env node
/**
 * popupinfo 収集スクリプト（複数源・自動・毎日 / 差分更新）
 * --------------------------------------------------------------
 * 設計（ユーザー決定）に基づく挙動:
 *  - 1件 = イベント/ポップアップ（会場＋開催期間。終わったら消す）
 *  - ジャンル = コスメ＋日用品 に限定
 *  - 全国対応（都道府県を判定し、近い順用に代表座標を付与）
 *  - 信頼重視: 「無料サンプルがもらえる」と明確なものだけ載せる。
 *             弱い表現は verified=false（UIで「要確認」表示）。曖昧すぎるものは除外。
 *  - 重複判定: 会場＋開催期間が同じならほぼ同じ（= id のキー）
 *  - 差分更新: 新規は足す / 既存は更新（初掲載日 firstSeen は保持）/ 終了分だけ消す
 *  - 異常検知: 収集0件なら異常終了（CIで通知できるように exit code を立てる）
 *
 * 収集元はアダプタ方式。今は PR TIMES。`sources` に追加すれば増やせます。
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "events.json");
const UA = "popupinfo/0.1 (+personal use; respects robots.txt) Mozilla/5.0";

/* ============== 都道府県（全国・近い順用の代表座標） ============== */

const PREFS = [
  ["北海道", 43.06, 141.35], ["青森県", 40.82, 140.74], ["岩手県", 39.7, 141.15],
  ["宮城県", 38.27, 140.87], ["秋田県", 39.72, 140.1], ["山形県", 38.24, 140.36],
  ["福島県", 37.75, 140.47], ["茨城県", 36.34, 140.45], ["栃木県", 36.57, 139.88],
  ["群馬県", 36.39, 139.06], ["埼玉県", 35.86, 139.65], ["千葉県", 35.61, 140.12],
  ["東京都", 35.69, 139.69], ["神奈川県", 35.45, 139.64], ["新潟県", 37.9, 139.02],
  ["富山県", 36.7, 137.21], ["石川県", 36.59, 136.63], ["福井県", 36.07, 136.22],
  ["山梨県", 35.66, 138.57], ["長野県", 36.65, 138.18], ["岐阜県", 35.39, 136.72],
  ["静岡県", 34.98, 138.38], ["愛知県", 35.18, 136.91], ["三重県", 34.73, 136.51],
  ["滋賀県", 35.0, 135.87], ["京都府", 35.02, 135.76], ["大阪府", 34.69, 135.52],
  ["兵庫県", 34.69, 135.18], ["奈良県", 34.69, 135.83], ["和歌山県", 34.23, 135.17],
  ["鳥取県", 35.5, 134.24], ["島根県", 35.47, 133.05], ["岡山県", 34.66, 133.93],
  ["広島県", 34.4, 132.46], ["山口県", 34.19, 131.47], ["徳島県", 34.07, 134.56],
  ["香川県", 34.34, 134.04], ["愛媛県", 33.84, 132.77], ["高知県", 33.56, 133.53],
  ["福岡県", 33.61, 130.42], ["佐賀県", 33.25, 130.3], ["長崎県", 32.74, 129.87],
  ["熊本県", 32.79, 130.74], ["大分県", 33.24, 131.61], ["宮崎県", 31.91, 131.42],
  ["鹿児島県", 31.56, 130.56], ["沖縄県", 26.21, 127.68],
];

const CITY_TO_PREF = [
  ["横浜", "神奈川県"], ["川崎", "神奈川県"], ["札幌", "北海道"], ["仙台", "宮城県"],
  ["さいたま", "埼玉県"], ["名古屋", "愛知県"], ["大阪市", "大阪府"], ["梅田", "大阪府"],
  ["難波", "大阪府"], ["心斎橋", "大阪府"], ["京都市", "京都府"], ["神戸", "兵庫県"],
  ["三宮", "兵庫県"], ["博多", "福岡県"], ["天神", "福岡県"], ["那覇", "沖縄県"],
];

function detectPrefecture(text) {
  for (const [name] of PREFS) if (text.includes(name)) return name;
  for (const s of ["東京", "大阪", "京都"]) {
    if (text.includes(s)) {
      const full = PREFS.find(([n]) => n.startsWith(s));
      if (full) return full[0];
    }
  }
  for (const [city, pref] of CITY_TO_PREF) if (text.includes(city)) return pref;
  return null;
}

function centroidOf(pref) {
  const p = PREFS.find(([n]) => n === pref);
  return p ? { lat: p[1], lng: p[2] } : {};
}

/* ============== 共通ユーティリティ ============== */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, "0");

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

function makeId(...parts) {
  return (
    "ev-" +
    parts.filter(Boolean).join("-").toLowerCase()
      .replace(/[^a-z0-9ぁ-んァ-ン一-龠ー]+/gi, "-")
      .replace(/^-+|-+$/g, "").slice(0, 90)
  );
}

async function fetchText(url, { timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.8" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s = "") {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : null;
}

/* ============== ジャンル・無料サンプル判定 ============== */

// コスメ＋日用品に限定
const COSME_DAILY_RE =
  /コスメ|化粧品|ビューティ|メイク|スキンケア|フレグランス|香水|リップ|ティント|ファンデ|アイシャドウ|マスカラ|チーク|美容液|化粧水|乳液|クレンジング|下地|日焼け止め|ヘアケア|シャンプー|トリートメント|ボディケア|ハンドクリーム|ネイル|マニキュア|オーラルケア|歯磨き|日用品|生活雑貨|トイレタリー|ドラッグストア|スキンケア|基礎化粧/;

// 「無料サンプルがもらえる」と明確（= verified true）
const SAMPLE_STRONG =
  /無料サンプル|サンプル無料|試供品|サンプリング|サンプルプレゼント|サンプルを?(?:配布|進呈|プレゼント)|無料で(?:お試し|サンプル|もらえ)|先着[^。]{0,24}(?:サンプル|プレゼント|配布)|来場[^。]{0,12}(?:サンプル|プレゼント)/;
// 弱い表現（= verified false, 「要確認」）
const SAMPLE_WEAK = /サンプル|ノベルティ|プレゼント|配布|お試し|もらえる|特典/;

function classifySample(text) {
  if (SAMPLE_STRONG.test(text)) return "confirmed";
  if (SAMPLE_WEAK.test(text)) return "needs_check";
  return "none";
}

/* ============== 期間・会場の抽出 ============== */

function extractPeriod(text) {
  const range =
    /(?:開催期間|開催日時|開催日程|会期|期間|開催)[^0-9]{0,8}?(\d{4})年(\d{1,2})月(\d{1,2})日[^0-9]{0,14}?[～〜~\-－—ー]+\s*(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/;
  const m = text.match(range);
  if (m) {
    const sy = +m[1], sm = +m[2], sd = +m[3];
    const ey = m[4] ? +m[4] : sy, em = +m[5], ed = +m[6];
    return { startDate: `${sy}-${pad(sm)}-${pad(sd)}`, endDate: `${ey}-${pad(em)}-${pad(ed)}` };
  }
  const single = text.match(
    /(?:開催期間|開催日時|開催日程|会期|開催日)[^0-9]{0,8}?(\d{4})年(\d{1,2})月(\d{1,2})日/
  );
  if (single) {
    const d = `${single[1]}-${pad(+single[2])}-${pad(+single[3])}`;
    return { startDate: d, endDate: d };
  }
  return null;
}

const VENUE_STOP = /^(?:で|でも|では|により|による|および|また|なお|その|この|当|各|※|お)/;

function extractVenue(text, fallback) {
  const m = text.match(
    /(?:会場|開催場所|開催store|開催店舗|開催地|場所|店舗|会場名)[：:　\s]*([^。、\n]{2,50})/
  );
  if (m) {
    let v = m[1]
      .replace(/(開催期間|開催日時|期間|住所|日時|詳しく|TEL|https?).*$/, "")
      .replace(/[（(].*$/, "")
      .replace(/^[」「』『、。\s　]+/, "")
      .replace(/[　\s]+/g, " ")
      .trim();
    if (
      v.length >= 3 &&
      !VENUE_STOP.test(v) &&
      !/場合|展開|異なる|意味|とは|について|です|ます/.test(v)
    )
      return v.slice(0, 44);
  }
  return fallback;
}

/* ============== PR TIMES アダプタ ============== */

const PRTIMES_KEYWORDS = [
  "無料サンプル コスメ",
  "化粧品 サンプル 配布",
  "日用品 サンプル 配布",
  "コスメ ポップアップ サンプル",
  "サンプリング 化粧品",
  "コスメ ノベルティ プレゼント",
  "化粧品 ポップアップ",
  "コスメ 体験 イベント",
];
const PER_KEYWORD = 18;
const TOTAL_LIMIT = 90;

async function prtimesSearch(keyword) {
  const url =
    "https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=" +
    encodeURIComponent(keyword);
  const $ = cheerio.load(await fetchText(url));
  const out = [];
  $('a[class^="release-card_link__"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("/main/html/rd/p/")) {
      out.push(href.startsWith("http") ? href : "https://prtimes.jp" + href);
    }
  });
  return out.slice(0, PER_KEYWORD);
}

async function prtimesParse(url) {
  const html = await fetchText(url);
  const title = metaContent(html, "og:title") || "";
  const image = (metaContent(html, "og:image") || "").replace(/&amp;/g, "&");
  const desc = metaContent(html, "og:description") || "";

  const $ = cheerio.load(html);
  let body = $(".press-release-body-v3-0-0").first().text();
  body = body ? body.replace(/\s+/g, " ").trim() : stripTags(html);

  // 企業紹介の定型文を除去（自己紹介の「化粧品を販売する○○社」での誤検出を防ぐ）
  const announcement = body
    .replace(
      /[^。]*?(?:を(?:中心に[^。]*?)?(?:販売|製造|展開|運営|提供)|を手がける|を手掛ける)[^。]*?(?:は[、,]|は )/g,
      ""
    )
    .trim();
  const lead = announcement.slice(0, 320);

  // ジャンル: コスメ＋日用品 のみ
  if (!COSME_DAILY_RE.test(title) && !COSME_DAILY_RE.test(lead)) return null;

  // 無料サンプル判定（信頼重視: 明確/要確認のみ採用、無しは除外）
  const sample = classifySample(`${title} ${announcement}`);
  if (sample === "none") return null;

  // 場所（全国・都道府県）
  const pref = detectPrefecture(`${title} ${body}`);
  if (!pref) return null;
  const { lat, lng } = centroidOf(pref);

  // 開催期間
  const period = extractPeriod(body) || extractPeriod(title);
  if (!period) return null;

  const venue = extractVenue(body, pref);
  const { company } = parseOgDesc(desc);

  return {
    id: makeId(venue, period.startDate, period.endDate),
    title: decodeEntities(title),
    brand: company || undefined,
    prefecture: pref,
    venue,
    address: undefined,
    lat,
    lng,
    startDate: period.startDate,
    endDate: period.endDate,
    url,
    source: "PR TIMES",
    image: image || undefined,
    description: (announcement.slice(0, 120) + "…").trim(),
    verified: sample === "confirmed",
    collectedAt: new Date().toISOString(),
  };
}

function parseOgDesc(desc) {
  if (!desc) return {};
  const m = desc.match(/^(.*?)のプレスリリース（/);
  return m ? { company: m[1].trim() } : {};
}

const sources = [
  {
    name: "PR TIMES (コスメ・日用品の無料サンプル)",
    enabled: true,
    run: async () => {
      const seen = new Set();
      const urls = [];
      for (const kw of PRTIMES_KEYWORDS) {
        try {
          const list = await prtimesSearch(kw);
          for (const u of list) if (!seen.has(u)) { seen.add(u); urls.push(u); }
          console.log(`     検索「${kw}」: ${list.length} 件`);
        } catch (e) {
          console.warn(`     検索「${kw}」失敗: ${e.message}`);
        }
        await sleep(400);
      }
      const limited = urls.slice(0, TOTAL_LIMIT);
      console.log(`     詳細解析: ${limited.length} 件`);
      const events = [];
      for (const u of limited) {
        try {
          const ev = await prtimesParse(u);
          if (ev) events.push(ev);
        } catch { /* 個別失敗はスキップ */ }
        await sleep(300);
      }
      return events;
    },
  },
];

/* ============== メイン（差分更新） ============== */

async function readExisting() {
  try {
    return JSON.parse(await fs.readFile(DATA_PATH, "utf-8"));
  } catch {
    return { updatedAt: new Date().toISOString(), events: [] };
  }
}

async function main() {
  console.log("🔎 popupinfo 収集を開始します...");
  const existing = await readExisting();
  const byId = new Map((existing.events || []).map((e) => [e.id, e]));
  const today = todayStr();

  let collected = [];
  for (const src of sources) {
    if (!src.enabled) continue;
    try {
      console.log(`  ▶️  ${src.name}`);
      const results = await src.run();
      collected = collected.concat(results);
      console.log(`  ✅ ${src.name}: ${results.length} 件`);
    } catch (err) {
      console.warn(`  ⚠️  ${src.name}: 失敗 (${err.message})`);
    }
  }

  // 差分更新: 新規は足す / 既存は更新（firstSeen は保持） / 終了分だけ消す
  let added = 0;
  for (const ev of collected) {
    const prev = byId.get(ev.id);
    if (prev) {
      byId.set(ev.id, { ...prev, ...ev, firstSeen: prev.firstSeen || today });
    } else {
      byId.set(ev.id, { ...ev, firstSeen: today });
      added++;
    }
  }

  const events = [...byId.values()]
    .filter((e) => e.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  await fs.writeFile(
    DATA_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), events }, null, 2) + "\n",
    "utf-8"
  );

  console.log(
    `\n💾 保存: 新規 ${added} 件 / 掲載中 ${events.length} 件 (収集 ${collected.length} 件)`
  );

  // 異常検知: 収集0件は異常としてCIに知らせる
  if (collected.length === 0) {
    console.error("❗ 収集0件: 収集元が壊れている可能性があります（要確認）");
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error("収集処理でエラー:", e);
  process.exit(1);
});
