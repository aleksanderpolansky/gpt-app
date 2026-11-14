import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const panel=readFileSync(new URL('../../src/components/workspace/value-objects/value-object-graph-neighbors-panel.tsx',import.meta.url),'utf8');
test('X04-025 V4 panel does not synchronously reset React state inside the effect',()=>{
  assert.match(panel,/const requestKey = JSON\.stringify\(\[valueObjectId, revision, refreshIndex\]\)/);
  assert.match(panel,/const phase = loadState\?\.key === requestKey \? loadState\.phase : "loading"/);
  assert.doesNotMatch(panel,/setPhase\(|setResult\(/);
  const effect = panel.split('  useEffect(() => {')[1]?.split('    void (async () => {')[0];
  assert.ok(effect);
  assert.doesNotMatch(effect,/setLoadState\(/);
});
test('X04-025 V4 graph panel keeps abort safety, refresh and bidirectional semantics',()=>{
  assert.match(panel,/const controller = new AbortController\(\)/);
  assert.match(panel,/if \(controller\.signal\.aborted\) return;/);
  assert.match(panel,/if \(!controller\.signal\.aborted\)/);
  assert.match(panel,/\[valueObjectId, requestKey\]/);
  assert.match(panel,/setRefreshIndex\(\(n\) => n \+ 1\)/);
  assert.match(panel,/resolveSemanticRelationTitleKey\(item\.semanticTitleKey \?\? null, locale\)/);
  assert.match(panel,/cache: "no-store"/);
});
