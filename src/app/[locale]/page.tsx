import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import CitySearch from "@/components/CitySearch";
import PlacesPanel from "@/components/PlacesPanel";
import TimeGrid from "@/components/TimeGrid";
import SelectionBar from "@/components/SelectionBar";
import SettingsPanel from "@/components/SettingsPanel";
import ThemeToggle from "@/components/ThemeToggle";
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";
import PrintExport from "@/components/PrintExport";
import HeatmapLegend from "@/components/HeatmapLegend";
import NowButton from "@/components/NowButton";
import CursorBar from "@/components/CursorBar";
import DateJump from "@/components/DateJump";
import UrlStateSync from "@/components/UrlStateSync";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

type Props = {
  params: { locale: string };
};

export default function Home({ params }: Props) {
  // 启用静态渲染
  setRequestLocale(params.locale);
  const t = useTranslations("App");

  return (
    <div className="flex min-h-screen flex-col">
      <UrlStateSync />
      <KeyboardShortcuts />
      {/* 顶部导航栏：品牌、城市搜索、语言切换、设置（设置入口后续步骤补全） */}
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2 bg-white">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <span className="hidden sm:inline text-xs text-gray-500">{t("tagline")}</span>
        <div className="ml-auto flex items-center gap-3">
          <CitySearch />
          <LocaleSwitcher />
          <SettingsPanel />
          <ThemeToggle />
          <GoogleCalendarConnect />
        </div>
      </header>

      {/* 主体：左侧地点列表 + 右侧网格区域（网格在步骤 2.5 引入） */}
      <div className="flex flex-1 flex-col md:flex-row">
        <PlacesPanel />
        <main className="flex-1 overflow-hidden p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <HeatmapLegend />
            <div className="flex flex-wrap items-center gap-2">
              <DateJump />
              <CursorBar />
              <NowButton />
              <PrintExport />
            </div>
          </div>
          <TimeGrid />
        </main>
      </div>

      {/* 选区操作栏：仅在有选区时出现 */}
      <SelectionBar />
    </div>
  );
}
