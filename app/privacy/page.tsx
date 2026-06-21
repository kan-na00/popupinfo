import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜popupinfo",
};

export default function Privacy() {
  return (
    <main>
      <header className="hero">
        <div className="hero-inner">
          <div className="brand-row">
            <h1>プライバシーポリシー</h1>
          </div>
          <p>popupinfo（以下「本サービス」）における情報の取り扱いについて。</p>
        </div>
      </header>

      <div className="wrap" style={{ maxWidth: 760, paddingTop: 28 }}>
        <h2>1. 位置情報について</h2>
        <p>
          本サービスは「近い順」並び替えのために、お使いの端末の位置情報を利用する場合があります。
          位置情報は<strong>お使いの端末（ブラウザ）の中でのみ利用</strong>し、
          本サービスのサーバーへ送信したり、保存することは<strong>一切ありません</strong>。
          位置情報の利用はブラウザの許可ダイアログで「許可」した場合のみ行われ、拒否しても他の機能はご利用いただけます。
        </p>

        <h2>2. アクセス解析（表示回数）について</h2>
        <p>
          本サービスは、利用状況の把握（ページの表示回数など）のためにアクセス解析を利用します。
          個人を特定する情報や、Cookieによる追跡は行いません。
        </p>

        <h2>3. 広告について</h2>
        <p>
          将来的に本サービスへ広告を掲載する場合があります。その際、広告配信事業者がCookie等を
          利用することがあります。導入時には本ポリシーを更新し、必要な説明・設定を提供します。
        </p>

        <h2>4. 掲載情報の出典について</h2>
        <p>
          本サービスのイベント情報は、公開されているプレスリリース等から自動で収集・要約したものです。
          各情報には出典・公式リンクを表示しています。内容は変わる場合があるため、
          お出かけ前に必ず公式情報をご確認ください。
        </p>

        <h2>5. お問い合わせ</h2>
        <p>本ポリシーに関するお問い合わせは、運営者までご連絡ください。</p>

        <p style={{ marginTop: 28 }}>
          <a className="link" href="/">
            ← トップに戻る
          </a>
        </p>
      </div>
    </main>
  );
}
