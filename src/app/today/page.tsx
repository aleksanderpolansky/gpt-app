import {
  createTodayTimelineViewModel,
  TodayTimeline,
  todayTimelineDefaultFixture,
} from "@/components/workspace/today-timeline";

export default function TodayPage() {
  const viewModel = createTodayTimelineViewModel(todayTimelineDefaultFixture);

  return <TodayTimeline viewModel={viewModel} />;
}