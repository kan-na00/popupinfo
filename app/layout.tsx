import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "popupinfo｜無料サンプルがもらえる場所を探す",
  description:
    "全国のコスメ・日用品の無料サンプル配布／ポップアップ情報を毎日自動収集。現在地から近い順・エリア・キーワードで探せます。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        {/* 表示回数の計測（プライバシー配慮・Cookieなし） */}
        <Analytics />
      </body>
    </html>
  );
}
