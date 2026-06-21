"use client";

import { useEffect, useMemo, useState } from "react";
import type { SampleEvent } from "@/lib/types";
import { distanceKm, defaultRank } from "@/lib/geo";

const PAGE = 24;
const NEW_DAYS = 7;
const FAV_KEY = "popupinfo:favorites";
const WD = ["日", "月", "火", "水", "木", "金", "土"];

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function fmt(s: string) {
  const d = parseDate(s);
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
}
function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export default function Board({
  events,
  prefectures,
  updatedAt,
}: {
  events: SampleEvent[];
  prefectures: string[];
  updatedAt: string;
}) {
  const [today] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  });
  const [query, setQuery] = useState("");
  const [pref, setPref] = useState<string>("all");
  const [mode, setMode] = useState<"default" | "near">("default");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<
    "idle" | "loading" | "denied" | "on" | "unsupported"
  >("idle");
  const [visible, setVisible] = useState(PAGE);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [favOnly, setFavOnly] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  function toggleFav(id: string) {
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  function requestNear() {
    if (mode === "near") {
      setMode("default");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // 位置情報は端末内でのみ使用し、保存・送信はしません
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("on");
        setMode("near");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }

  const isNew = (e: SampleEvent) =>
    e.firstSeen ? daysBetween(today, parseDate(e.firstSeen)) <= NEW_DAYS : false;

  const newThisWeek = useMemo(
    () =>
      [...events]
        .filter((e) => isNew(e) && e.endDate >= toISO(today))
        .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
        .slice(0, 8),
    [events, today]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = events.filter((e) => {
      if (pref !== "all" && e.prefecture !== pref) return false;
      if (favOnly && !favs.has(e.id)) return false;
      if (q) {
        const hay = [e.title, e.brand, e.venue, e.prefecture, e.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (mode === "near" && loc) {
      list = list
        .map((e) => ({
          e,
          d:
            e.lat != null && e.lng != null
              ? distanceKm(loc.lat, loc.lng, e.lat, e.lng)
              : Number.POSITIVE_INFINITY,
        }))
        .sort((a, b) => a.d - b.d || a.e.startDate.localeCompare(b.e.startDate))
        .map((x) => x.e);
    } else {
      list = [...list].sort(
        (a, b) =>
          defaultRank(a.prefecture) - defaultRank(b.prefecture) ||
          a.startDate.localeCompare(b.startDate)
      );
    }
    return list;
  }, [events, query, pref, favOnly, favs, mode, loc]);

  const showNewSection =
    !query.trim() && pref === "all" && !favOnly && filtered.length > 0;

  function reset() {
    setQuery("");
    setPref("all");
    setFavOnly(false);
    setMode("default");
    setVisible(PAGE);
  }

  function distOf(e: SampleEvent) {
    if (mode !== "near" || !loc || e.lat == null || e.lng == null) return null;
    const km = distanceKm(loc.lat, loc.lng, e.lat, e.lng);
    return km < 1 ? "1km以内" : `約${Math.round(km)}km`;
  }

  return (
    <>
      <section className="panel">
        <div className="searchbar">
          <input
            className="search"
            placeholder="🔍 ブランド・会場・エリア・キーワードで検索"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE);
            }}
          />
          <button
            className={`near-btn ${mode === "near" ? "on" : ""}`}
            onClick={requestNear}
            disabled={locStatus === "loading"}
          >
            {mode === "near"
              ? "📍 近い順 ON"
              : locStatus === "loading"
              ? "取得中…"
              : "📍 近い順で見る"}
          </button>
        </div>

        <div className="row">
          <span className="label">エリア</span>
          <button
            className={`chip ${pref === "all" ? "active" : ""}`}
            onClick={() => {
              setPref("all");
              setVisible(PAGE);
            }}
          >
            全国
          </button>
          {prefectures.map((p) => (
            <button
              key={p}
              className={`chip ${pref === p ? "active" : ""}`}
              onClick={() => {
                setPref(p);
                setVisible(PAGE);
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="row">
          <button
            className={`chip ${favOnly ? "active" : ""}`}
            onClick={() => {
              setFavOnly((v) => !v);
              setVisible(PAGE);
            }}
          >
            ♥ お気に入りだけ表示
          </button>
        </div>

        {locStatus === "denied" && (
          <p className="note">
            位置情報がオフのため「近い順」は使えません。エリアで絞るか、既定の並び（東京→神奈川→大阪…）で表示しています。
          </p>
        )}
        {locStatus === "unsupported" && (
          <p className="note">
            このブラウザは位置情報に対応していません。エリアで絞ってご利用ください。
          </p>
        )}
        <p className="note">
          ※ 位置情報は「近い順」の計算に端末内でのみ使用し、保存・送信はしません。
        </p>
      </section>

      {/* 今週の新着（既定表示のとき） */}
      {showNewSection && newThisWeek.length > 0 && (
        <>
          <div className="section-h">
            <span className="pill">NEW</span> 今週の新着
          </div>
          <div className="grid">
            {newThisWeek.map((e) => (
              <Card
                key={"new-" + e.id}
                e={e}
                today={today}
                isNew={isNew(e)}
                fav={favs.has(e.id)}
                onFav={() => toggleFav(e.id)}
                dist={distOf(e)}
              />
            ))}
          </div>
        </>
      )}

      <div className="toolbar">
        <span className="count">
          <strong>{filtered.length}</strong> 件
          {mode === "near" ? "（近い順）" : ""}
          {pref !== "all" ? `・${pref}` : ""}
        </span>
        <button className="reset" onClick={reset}>
          条件をリセット
        </button>
      </div>

      {filtered.length === 0 ? (
        <>
          <div className="empty">
            <div className="big">🫧</div>
            <p>
              {pref !== "all"
                ? `${pref}で該当するイベントは現在0件です。`
                : "該当するイベントは現在0件です。"}
            </p>
            <p>代わりに、全国の「今週の新着」を表示します。</p>
          </div>
          {newThisWeek.length > 0 && (
            <div className="grid">
              {newThisWeek.map((e) => (
                <Card
                  key={"fb-" + e.id}
                  e={e}
                  today={today}
                  isNew={isNew(e)}
                  fav={favs.has(e.id)}
                  onFav={() => toggleFav(e.id)}
                  dist={null}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid">
            {filtered.slice(0, visible).map((e) => (
              <Card
                key={e.id}
                e={e}
                today={today}
                isNew={isNew(e)}
                fav={favs.has(e.id)}
                onFav={() => toggleFav(e.id)}
                dist={distOf(e)}
              />
            ))}
          </div>
          {visible < filtered.length && (
            <div className="more-wrap">
              <button className="more" onClick={() => setVisible((v) => v + PAGE)}>
                もっと見る（残り {filtered.length - visible} 件）
              </button>
            </div>
          )}
        </>
      )}

      <footer className="footer">
        最終更新: {new Date(updatedAt).toLocaleString("ja-JP")}
        <br />
        ※ 情報は自動収集のため、内容が変わる場合があります。お出かけ前に公式情報をご確認ください。
        <br />
        <a href="/privacy">プライバシーポリシー</a>
      </footer>
    </>
  );
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function Card({
  e,
  today,
  isNew,
  fav,
  onFav,
  dist,
}: {
  e: SampleEvent;
  today: Date;
  isNew: boolean;
  fav: boolean;
  onFav: () => void;
  dist: string | null;
}) {
  return (
    <article className="card">
      <button
        className={`fav ${fav ? "on" : ""}`}
        onClick={onFav}
        aria-label="お気に入り"
        title="お気に入り（端末内に保存）"
      >
        {fav ? "♥" : "♡"}
      </button>

      {e.image && (
        <a className="thumb" href={e.url || "#"} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.image} alt={e.title} loading="lazy" />
        </a>
      )}

      <div className="card-top">
        <span className="pref">📍 {e.prefecture}</span>
        <div className="badges-top">
          {dist && <span className="bdg dist">{dist}</span>}
          {isNew && <span className="bdg new">NEW</span>}
          {e.verified ? (
            <span className="bdg ok">🎁 無料サンプル</span>
          ) : (
            <span className="bdg check">要確認</span>
          )}
        </div>
      </div>

      {e.brand && <span className="brand">{e.brand}</span>}
      <h3>{e.title}</h3>
      <p className="meta">🏬 {e.venue}</p>
      <p className="meta">
        🗓️ {fmt(e.startDate)} 〜 {fmt(e.endDate)}
      </p>
      {e.description && <p className="desc">{e.description}</p>}

      <div className="card-foot">
        {e.url && (
          <a className="link" href={e.url} target="_blank" rel="noreferrer">
            詳細・公式情報を見る →
          </a>
        )}
        <div className="source">出典: {e.source}</div>
      </div>
    </article>
  );
}
