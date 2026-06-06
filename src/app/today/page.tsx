import {
  createTodayTimelineViewModel,
  TodayTimeline,
  todayTimelineDefaultFixture,
} from "@/components/workspace/today-timeline";

export default function TodayPage() {
  const viewModel = createTodayTimelineViewModel(todayTimelineDefaultFixture);
  return (

    <div className="min-h-0">

      <div className="min-w-0">

        <TodayTimeline viewModel={viewModel} />

      </div>
</div>

  );
}

