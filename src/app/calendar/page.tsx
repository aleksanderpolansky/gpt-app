import { CalendarFreeWindows } from "../../components/workspace/calendar-free-windows/calendar-free-windows";
import { calendarFreeWindowsFixture } from "../../components/workspace/calendar-free-windows/calendar-free-windows.fixtures";

export const metadata = {
  title: "Calendar Free Windows | AI Navigator",
};

export default function CalendarPage() {
  return (
    <div className="min-h-0">
      <div className="min-w-0">
        <CalendarFreeWindows viewModel={calendarFreeWindowsFixture} />
      </div>
</div>
  );
}


