import { ContextualAIColumn, getContextForRoute } from "@/components/workspace/contextual-ai";
import {
  createTodayTimelineViewModel,
  TodayTimeline,
  todayTimelineDefaultFixture,
} from "@/components/workspace/today-timeline";

export default function TodayPage() {
  const viewModel = createTodayTimelineViewModel(todayTimelineDefaultFixture);

  const todayAIContext = getContextForRoute("/today");


  return (

    <div className="grid min-h-0 gap-4 xl:grid-cols-3">

      <div className="min-w-0 xl:col-span-2">

        <TodayTimeline viewModel={viewModel} />

      </div>


      <ContextualAIColumn

        context={todayAIContext}

        className="hidden xl:flex"

      />

    </div>

  );
}
