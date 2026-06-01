import {
  AIMessage,
  AuditRow,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Input,
  MetricWidget,
  NavItem,
  ProgressRing,
  QuickActionButton,
  SectionHeader,
  SemanticChip,
  Text,
  Textarea,
  TimelineItem,
} from ".";

export const UI_KIT_SMOKE_COMPONENT = "UI_KIT_SMOKE_COMPONENT_CREATED";

export function UiKitSmoke() {
  return (
    <div className="min-w-0 space-y-4 rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#f0f2f7] p-4">
      <SectionHeader
        eyebrow="UI-2 smoke"
        title="Minimal local UI kit"
        description="Non-route smoke component for checking project-local primitives and barrel exports."
        action={<Badge variant="green">Ready</Badge>}
      />

      <Card>
        <CardHeader
          title="Core primitives"
          description="Typography, buttons, badges, cards, form fields and layout atoms."
          action={<Avatar name="AI Navigator" initials="AI" />}
        />

        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Text tone="muted">
              This component is intentionally not connected to any route.
            </Text>

            <div className="flex flex-wrap gap-2">
              <Button>Primary action</Button>
              <QuickActionButton label="Quick action" description="Local primitive" />
              <SemanticChip label="semantic candidate" kind="candidate" confidence={0.82} />
            </div>
          </div>

          <div className="space-y-2">
            <Input placeholder="Smoke input" aria-label="Smoke input" />
            <Textarea placeholder="Smoke textarea" aria-label="Smoke textarea" rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricWidget
          label="UI primitives"
          value={18}
          unit="files"
          description="Local src/components/ui primitives."
        />

        <Card>
          <CardContent className="flex items-center justify-center p-4">
            <ProgressRing value={88} label="ready" />
          </CardContent>
        </Card>

        <EmptyState
          title="No route attached"
          description="This smoke component exists only as a local compile/reference surface."
          size="sm"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-4">
            <NavItem label="Workspace" description="Navigation primitive" active />
            <AIMessage role="assistant" author="AI Navigator">
              UI-kit primitives can be composed without database, API or runtime changes.
            </AIMessage>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <TimelineItem
              title="UI-2 smoke component"
              description="Created as a non-route local verification surface."
              time="UI-2.22"
              tone="primary"
              active
            />

            <AuditRow
              action="created"
              title="Barrel exports consumed"
              description="Smoke component imports primitives through src/components/ui/index.ts."
              entity="ui-kit"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
