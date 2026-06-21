export interface SampleEvent {
  /** タイトル＋会場＋開催期間から生成する一意キー（＝重複判定の基準） */
  id: string;
  title: string;
  brand?: string;
  /** 都道府県（例: 東京都 / 神奈川県）。エリア絞り込み・既定順に使う */
  prefecture: string;
  /** 市区町村など（任意） */
  city?: string;
  venue: string;
  address?: string;
  /** 近い順の計算に使う座標（都道府県・市の中心座標で代用） */
  lat?: number;
  lng?: number;
  /** 開催開始日 YYYY-MM-DD */
  startDate: string;
  /** 開催終了日 YYYY-MM-DD（これを過ぎたら自動で消える） */
  endDate: string;
  url?: string;
  source: string;
  description?: string;
  image?: string;
  /**
   * 「無料サンプルがもらえる」と明確に書かれていれば true。
   * 曖昧なものは false（UI上は「要確認」と表示）。
   */
  verified: boolean;
  /** このアプリに初めて載った日 YYYY-MM-DD（「今週の新着」に使う） */
  firstSeen: string;
  /** 最終収集日時 ISO */
  collectedAt: string;
}

export interface EventDataFile {
  updatedAt: string;
  events: SampleEvent[];
}
