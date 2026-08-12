"use client";

import { useEffect, useState } from "react";

/**
 * 全局错误边界（兜底）。
 * 当**根布局本身**抛错（含 NextIntlClientProvider / ThemeProvider 初始化失败）时触发，
 * 此时所有 provider 与 globals.css 令牌都不可用，故必须自包含：
 * - 自带 <html><body>；
 * - 内联样式 + 系统字体；
 * - 极简内联本地化（从 URL 首段推断 locale，回退英文）。
 */
const STRINGS: Record<string, { title: string; description: string; reload: string }> = {
  en: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Try reloading the page.",
    reload: "Reload page",
  },
  zh: { title: "出错了", description: "发生了意外错误，请尝试刷新页面。", reload: "刷新页面" },
  "zh-Hant": { title: "發生錯誤", description: "發生了未預期的錯誤，請嘗試重新整理網頁。", reload: "重新整理" },
  ja: { title: "エラーが発生しました", description: "予期しないエラーが発生しました。ページを再読み込みしてください。", reload: "ページを再読み込み" },
  ko: { title: "문제가 발생했습니다", description: "예기치 않은 오류가 발생했습니다. 페이지를 새로고침 해보세요.", reload: "페이지 새로고침" },
  de: { title: "Etwas ist schiefgelaufen", description: "Ein unerwarteter Fehler ist aufgetreten. Laden Sie die Seite neu.", reload: "Seite neu laden" },
  es: { title: "Algo salió mal", description: "Ocurrió un error inesperado. Intente recargar la página.", reload: "Recargar página" },
  fr: { title: "Une erreur est survenue", description: "Une erreur inattendue s'est produite. Rechargez la page.", reload: "Recharger la page" },
  pt: { title: "Algo deu errado", description: "Ocorreu um erro inesperado. Tente recarregar a página.", reload: "Recarregar página" },
  ru: { title: "Что-то пошло не так", description: "Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.", reload: "Перезагрузить" },
  vi: { title: "Đã xảy ra lỗi", description: "Đã có lỗi bất ngờ. Hãy thử tải lại trang.", reload: "Tải lại trang" },
};

function pickLocale(): string {
  if (typeof window === "undefined") return "en";
  const seg = window.location.pathname.split("/").filter(Boolean)[0];
  return seg && STRINGS[seg] ? seg : "en";
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [loc, setLoc] = useState("en");
  useEffect(() => {
    setLoc(pickLocale());
    // eslint-disable-next-line no-console
    console.error("[WorldTime] global error:", error);
  }, [error]);

  const s = STRINGS[loc] ?? STRINGS.en;

  return (
    <html lang={loc}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
          backgroundColor: "#0b1120",
          color: "#e6ebf2",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40 }} aria-hidden>
          ⚠️
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{s.title}</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.8, maxWidth: 360 }}>{s.description}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 4,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            color: "#fff",
            backgroundColor: "#2563eb",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {s.reload}
        </button>
        {error.digest ? (
          <p style={{ marginTop: 8, fontSize: 11, opacity: 0.5, fontFamily: "monospace" }}>
            {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
