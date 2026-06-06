import { ContextualAIColumn, getContextForRoute } from "../../components/workspace/contextual-ai";
import { CalendarFreeWindows } from "../../components/workspace/calendar-free-windows/calendar-free-windows";
import { calendarFreeWindowsFixture } from "../../components/workspace/calendar-free-windows/calendar-free-windows.fixtures";

export const metadata = {
  title: "Calendar Free Windows | AI Navigator",
};

export default function CalendarPage() {
  const calendarAIContext = getContextForRoute("/calendar");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <CalendarFreeWindows viewModel={calendarFreeWindowsFixture} />
      </div>

      <ContextualAIColumn
        context={calendarAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}

