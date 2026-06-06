"use client";

import { useState, type ElementType, type ReactNode } from "react";
import {
  Bell,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Clock,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";

import { UserSessionTopBarControls } from "../auth/user-session-client";

type IconComponent = ElementType;

function Badge({
  count,
  color = "red",
}: {
  readonly count: number;
  readonly color?: "red" | "blue";
}) {
  const cls = color === "red" ? "bg-red-500 text-white" : "bg-blue-500 text-white";

  return (
    <span
      className={`ml-auto min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold ${cls}`}
    >
      {count}
    </span>
  );
}

function SidebarMainItem({
  icon: Icon,
  label,
  active,
  badge,
  href = "#",
}: {
  readonly icon: IconComponent;
  readonly label: string;
  readonly active?: boolean;
  readonly badge?: number;
  readonly href?: string;
}) {
  return (
    <a
      href={href}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all ${
        active
          ? "bg-[#eef2ff] text-[#3b6ef8]"
          : "text-[#4a4f6a] hover:bg-gray-50 hover:text-[#1a1d2e]"
      }`}
    >
      <Icon size={16} className={active ? "text-[#3b6ef8]" : "text-[#7c8099]"} />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined ? <Badge count={badge} /> : null}
    </a>
  );
}

function ExpandableSidebarItem({
  icon: Icon,
  label,
  children,
  defaultOpen,
}: {
  readonly icon: IconComponent;
  readonly label: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#4a4f6a] transition-all hover:bg-gray-50 hover:text-[#1a1d2e]"
      >
        <Icon size={16} className="text-[#7c8099]" />
        <span className="flex-1 text-left">{label}</span>
        {open ? (
          <ChevronDown size={13} className="text-[#b0b4c8]" />
        ) : (
          <ChevronRight size={13} className="text-[#b0b4c8]" />
        )}
      </button>

      {open ? <div className="mt-0.5">{children}</div> : null}
    </div>
  );
}

function TreeItem({
  label,
  depth = 1,
  children,
  defaultOpen,
  href = "#",
}: {
  readonly label: string;
  readonly depth?: number;
  readonly children?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly href?: string;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const pl = depth === 1 ? "pl-9" : depth === 2 ? "pl-12" : "pl-[60px]";
  const textSize = depth === 1 ? "text-[12px] font-medium" : "text-[11.5px] font-normal";
  const textColor = depth === 1 ? "text-[#5a5f7a]" : "text-[#7c8099]";

  if (children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-3 ${pl} ${textSize} ${textColor} transition-all hover:bg-gray-50 hover:text-[#1a1d2e]`}
        >
          <span className="flex-1 text-left">{label}</span>
          {open ? (
            <ChevronDown size={11} className="text-[#c0c4d4]" />
          ) : (
            <ChevronRight size={11} className="text-[#c0c4d4]" />
          )}
        </button>

        {open ? <div>{children}</div> : null}
      </div>
    );
  }

  return (
    <a
      href={href}
      className={`flex w-full items-center rounded-md py-1.5 pr-3 ${pl} ${textSize} ${textColor} transition-all hover:bg-gray-50 hover:text-[#1a1d2e]`}
    >
      <span className="flex-1 text-left leading-tight">{label}</span>
    </a>
  );
}

export function GlobalSidebar() {
  return (
    <aside className="hidden w-[240px] flex-shrink-0 flex-col overflow-hidden border-r border-[rgba(0,0,0,0.07)] bg-white lg:flex">
      <div className="flex items-center gap-2.5 border-b border-[rgba(0,0,0,0.06)] px-4 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b6ef8] to-[#6f42f5]">
          <Sparkles size={14} className="text-white" />
        </div>
        <div>
          <div className="text-[15px] font-bold leading-none text-[#1a1d2e]">
            LifeOS
          </div>
          <div className="mt-0.5 text-[10px] leading-none text-[#9ca3b8]">
            Всё важное — в одном месте
          </div>
        </div>
      </div>

      <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        <SidebarMainItem icon={LayoutDashboard} label="Мой кабинет" active href="/" />

        <div className="pb-0.5 pt-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0b4c8]">
            Каталог и сервисы
          </p>
        </div>

        <ExpandableSidebarItem icon={ShoppingBag} label="Каталог" defaultOpen>
          <TreeItem label="Предприятия" depth={1} href="/organizations" />
          <TreeItem label="Авто" depth={1} defaultOpen>
            <TreeItem label="Продажа автомобилей" depth={2} href="/offers" />
            <TreeItem label="Аренда автомобилей" depth={2} href="/offers" />
            <TreeItem label="Ремонт автомобилей" depth={2} href="/offers" />
            <TreeItem label="Ремонт ходовой части" depth={2} href="/offers" />
            <TreeItem label="Ремонт двигателя" depth={2} href="/offers" />
            <TreeItem label="Ремонт коробки передач" depth={2} href="/offers" />
          </TreeItem>
          <TreeItem label="Предложения предприятий" depth={1} href="/offers" />
          <TreeItem label="Товары" depth={1} href="/offers" />
          <TreeItem label="Услуги" depth={1} href="/offers" />
          <TreeItem label="Подарочные сертификаты" depth={1} defaultOpen href="/certificates">
            <TreeItem label="Массаж" depth={2} href="/certificates" />
            <TreeItem label="Кино" depth={2} href="/certificates" />
            <TreeItem label="Кафе" depth={2} href="/certificates" />
          </TreeItem>
          <TreeItem label="Мероприятия" depth={1} href="/offers" />
        </ExpandableSidebarItem>

        <div className="pb-0.5 pt-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0b4c8]">
            Направления
          </p>
        </div>

        <SidebarMainItem icon={Clock} label="Время" href="/today" />

        <ExpandableSidebarItem icon={Wallet} label="Деньги" defaultOpen>
          <TreeItem label="Бизнес" depth={1} href="/organizations" />
          <TreeItem label="Предприятие А" depth={2} href="/organizations" />
          <TreeItem label="Предприятие Б" depth={2} href="/organizations" />
          <TreeItem label="Предприятие Ц" depth={2} href="/organizations" />
          <TreeItem label="Карьера" depth={1} href="/next" />
          <TreeItem label="Менеджер по продажам" depth={2} href="/next" />
          <TreeItem label="Усиление карьерных возможностей" depth={2} defaultOpen>
            <TreeItem label="Твёрдые навыки" depth={3} href="/value-objects" />
            <TreeItem label="Немецкий язык" depth={3} href="/value-objects" />
            <TreeItem label="Мягкие навыки" depth={3} href="/value-objects" />
          </TreeItem>
        </ExpandableSidebarItem>

        <SidebarMainItem icon={Heart} label="Здоровье" href="/analytics" />
        <SidebarMainItem icon={Home} label="Личное пространство" href="/value-objects" />

        <div className="pb-0.5 pt-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0b4c8]">
            Прочее
          </p>
        </div>

        <SidebarMainItem icon={MessageSquare} label="Сообщения" badge={3} href="/workspace" />
        <SidebarMainItem icon={Bell} label="Уведомления" badge={7} href="/workspace" />
        <SidebarMainItem icon={Settings} label="Настройки" href="/privacy-audit" />
        <SidebarMainItem icon={Bookmark} label="Избранное" href="/workspace" />
        <SidebarMainItem icon={HelpCircle} label="Помощь" href="/project-knowledge" />
      </nav>
    </aside>
  );
}

export function GlobalTopBar() {
  return (
    <header className="flex h-[56px] flex-shrink-0 items-center gap-4 border-b border-[rgba(0,0,0,0.07)] bg-white px-5">
      <div className="max-w-[480px] flex-1">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b4c8]"
          />
          <input
            type="text"
            placeholder="Поиск по платформе, людям, целям и возможностям"
            className="w-full rounded-lg border border-transparent bg-[#f5f6fb] py-2 pl-9 pr-4 text-[12.5px] text-[#4a4f6a] placeholder-[#b0b4c8] transition-all focus:border-[#3b6ef8] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-50"
          title="Уведомления"
        >
          <Bell size={16} className="text-[#7c8099]" />
          <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full border-2 border-white bg-red-500" />
        </button>

        <UserSessionTopBarControls />
      </div>
    </header>
  );
}
