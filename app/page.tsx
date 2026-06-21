import { loadEvents } from "@/lib/events";
import Board from "@/components/EventBoard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { events, updatedAt } = await loadEvents();
  const prefectures = Array.from(
    new Set(events.map((e) => e.prefecture))
  ).sort();

  return (
    <main>
      <header className="hero">
        <div className="hero-inner">
          <div className="brand-row">
            <h1>🎁 popupinfo</h1>
            <span className="tag">無料サンプルがもらえる場所を探す</span>
          </div>
          <p>
            全国のコスメ・日用品の無料サンプル配布／ポップアップ情報を、毎日自動で収集。
            現在地から近い順・エリア・キーワードで探せます。
          </p>
          <div className="hero-chips">
            <span>📍 全国対応</span>
            <span>💄 コスメ・日用品</span>
            <span>🗓️ 毎日自動更新</span>
            <span>掲載中 {events.length} 件</span>
          </div>
        </div>
      </header>

      <div className="wrap">
        <Board events={events} prefectures={prefectures} updatedAt={updatedAt} />
      </div>
    </main>
  );
}
