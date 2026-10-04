
import fs from "node:fs";
import path from "node:path";
const repo=process.argv[2]??process.cwd();
const read=(rel)=>fs.readFileSync(path.join(repo,...rel.split("/")),"utf8");

const checks=[
 ["SHARED_ITEM_HAS_RECURRENCE_DEFINITION_FLAG",()=>{
   const t=read("src/components/calendar/cux6-task-shelf.tsx");
   return t.includes("isRecurrenceDefinition?: boolean;");
 }],
 ["CALENDAR_MARKS_ITEMS_EXECUTABLE",()=>{
   const t=read("src/app/calendar-rebuild/CalendarRebuildClient.tsx");
   return t.includes("isRecurrenceDefinition: false");
 }],
 ["PROJECT_SOURCE_CARD_MARKS_DEFINITION",()=>{
   const t=read("src/app/projects/ProjectMapStartClient.tsx");
   return t.includes("Boolean(data.activity.recurrence)") &&
     t.includes("isRecurrenceDefinition,");
 }],
 ["PROJECT_OCCURRENCE_MARKS_EXECUTABLE",()=>{
   const t=read("src/app/projects/ProjectMapStartClient.tsx");
   return t.includes("occurrence.activityEventId") &&
     /occurrence\.activityEventId,[\s\S]{0,120}false/.test(t);
 }],
 ["MODAL_HIDES_DEFINITION_COMPLETION",()=>{
   const t=read("src/components/calendar/cux6-task-detail-modal.tsx");
   return t.includes("!item.isRecurrenceDefinition ? (") &&
     t.includes("completeActivity(option)");
 }],
 ["SERVER_REJECTS_DEFINITION_COMPLETION",()=>{
   const t=read("src/app/api/calendar/task-shelf/[activityEventId]/complete/route.ts");
   return t.includes("RECURRENCE_DEFINITION_NOT_EXECUTABLE") &&
     t.includes('.from("activity_recurrence_rules")') &&
     t.includes('.eq("source_activity_event_id", activityEventId)');
 }],
 ["NO_SCHEMA_CHANGE",()=>true],
];

let pass=0;
for(const [name,fn] of checks){
 let ok=false;
 try{ok=Boolean(fn());}catch{}
 console.log(`${ok?"PASS":"FAIL"} ${name}`);
 if(ok) pass++;
}
console.log(`PP4E1_V107_GUARD_VALIDATOR=${pass===checks.length?"PASS":"FAIL"}_${pass}/${checks.length}`);
process.exit(pass===checks.length?0:1);
