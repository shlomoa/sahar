// FSM Unit Tests (Task 4.13)
// Purpose: Verify authoritative state machine behavior in isolation (no sockets/processes),
// covering version bump rules, no-op suppression, navigation/control mutations, and error flow.
// Contract highlights:
// - version: Monotonic; increments only when a real state change is committed (commit())
// - snapshots: getSnapshot() returns a deep copy; tests rely on comparing snapshots, not internal state
// - navigation back behavior: backing from 'scenes' to 'videos' clears sceneId but retains videoId
// - control: play/pause/seek/volume/mute update only if values actually change (no-op suppressed)
// - actionConfirmation: failure sets error + fsmState='error'; success clears error and re-evaluates to 'ready' when both clients present

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { Fsm } from '../src/fsm';
import { ApplicationState } from 'shared';
import { ControlCommandPayload } from 'shared';

type Snapshot = ApplicationState;

// Helper: assert that a real mutation occurred and commit() advanced version
function expectVersionBump(prev: Snapshot, next: Snapshot) {
  assert.ok(next.version > prev.version, `expected version to bump: ${prev.version} -> ${next.version}`);
}

// Helper: assert that an operation was a no-op (no committed change)
function expectNoVersionChange(prev: Snapshot, next: Snapshot) {
  assert.equal(next.version, prev.version, `expected no version change: ${prev.version} == ${next.version}`);
}

// Smoke check: default initial conditions align with architecture (Section: ApplicationState)
test('Fsm: initializes with version >= 1 and default state', () => {
    const fsm = new Fsm();
    const s = fsm.getSnapshot();
    assert.ok(s.version >= 1);
    assert.equal(s.fsmState, 'initializing');
    assert.equal(s.player.isPlaying, false);
    assert.equal(s.navigation.currentLevel, 'performers');
});

// Register flow: one client → initializing; both clients → ready; duplicate type rejected (no version bump)
test('Fsm: registers tv and remote, transitions to ready once both present', () => {
    const fsm = new Fsm();
    const s0 = fsm.getSnapshot();
    let res = fsm.registerClient('tv', 'tv-1');
    assert.ok(res.ok);
    const s1 = fsm.getSnapshot();
    expectVersionBump(s0, s1);
    assert.equal(s1.fsmState, 'initializing');

    res = fsm.registerClient('remote', 'remote-1');
    assert.ok(res.ok);
    const s2 = fsm.getSnapshot();
    expectVersionBump(s1, s2);
    assert.equal(s2.fsmState, 'ready');

    // duplicate client type rejected and no version change
    const before = fsm.getSnapshot();
    const resDup = fsm.registerClient('tv', 'tv-2');
    assert.equal(resDup.ok, false);
    const after = fsm.getSnapshot();
    expectNoVersionChange(before, after);
});

// Deregister flow: losing either client regresses back to 'initializing'
test('Fsm: deregisters a client and regresses to initializing', () => {
    const fsm = new Fsm();
    fsm.registerClient('tv', 'tv-1');
    fsm.registerClient('remote', 'remote-1');
    const sReady = fsm.getSnapshot();
    assert.equal(sReady.fsmState, 'ready');

    fsm.deregisterClient('tv');
    const sAfter = fsm.getSnapshot();
    expectVersionBump(sReady, sAfter);
    assert.equal(sAfter.fsmState, 'initializing');
});

// Data seeding: first seed inserts data; identical re-seed is a no-op; real change bumps version
test('Fsm: seedData merges and only bumps on real change', () => {
    const fsm = new Fsm();
    const s0 = fsm.getSnapshot();

    fsm.seedData({ videos: [{ id: 'v1' }] });
    const s1 = fsm.getSnapshot();
    expectVersionBump(s0, s1);
    assert.ok(s1.data && s1.data.videos && s1.data.videos.length === 1);

    // idempotent re-seed
    fsm.seedData({ videos: [{ id: 'v1' }] });
    const s2 = fsm.getSnapshot();
    expectNoVersionChange(s1, s2);

    // real change
    fsm.seedData({ videos: [{ id: 'v1' }, { id: 'v2' }] });
    const s3 = fsm.getSnapshot();
    expectVersionBump(s2, s3);
});

// Navigation: performer→video→back preserves video context (scene cleared). Duplicate commands are suppressed.
test('Fsm: navigationCommand updates levels and breadcrumb with no-op suppression', () => {
    const fsm = new Fsm();
    const s0 = fsm.getSnapshot();

    fsm.navigationCommand('navigate_to_performer', 'p1');
    const s1 = fsm.getSnapshot();
    expectVersionBump(s0, s1);
    assert.equal(s1.navigation.currentLevel, 'videos');
    assert.equal(s1.navigation.performerId, 'p1');

    // no-op repeat
    fsm.navigationCommand('navigate_to_performer', 'p1');
    const s1b = fsm.getSnapshot();
    expectNoVersionChange(s1, s1b);

    fsm.navigationCommand('navigate_to_video', 'v1');
    const s2 = fsm.getSnapshot();
    expectVersionBump(s1b, s2);
    assert.equal(s2.navigation.currentLevel, 'scenes');
    assert.equal(s2.navigation.videoId, 'v1');

    fsm.navigationCommand('navigate_back');
    const s3 = fsm.getSnapshot();
    expectVersionBump(s2, s3);
    assert.equal(s3.navigation.currentLevel, 'videos');
    // Implementation keeps video context when backing out of scenes; only sceneId is cleared
    assert.equal((s3 as any).navigation.sceneId, undefined);
});

// Control: play/pause/seek/volume/mute update only on actual change; repeated same-op is suppressed
test('Fsm: controlCommand play/pause/seek/volume/mute toggles with no-op suppression', () => {
    const fsm = new Fsm();
    const s0 = fsm.getSnapshot();

    fsm.controlCommand({ action: 'play', youtubeId: 'yt1', startTime: 10 } as ControlCommandPayload);
    const s1 = fsm.getSnapshot();
    expectVersionBump(s0, s1);
    assert.equal(s1.player.isPlaying, true);
    assert.equal(s1.player.youtubeId, 'yt1');
    assert.equal(s1.player.currentTime, 10);

    // no-op repeat
    fsm.controlCommand({ action: 'play', youtubeId: 'yt1', startTime: 10 } as ControlCommandPayload);
    const s1b = fsm.getSnapshot();
    expectNoVersionChange(s1, s1b);

    fsm.controlCommand({ action: 'pause' } as ControlCommandPayload);
    const s2 = fsm.getSnapshot();
    expectVersionBump(s1b, s2);
    assert.equal(s2.player.isPlaying, false);

    fsm.controlCommand({ action: 'seek', seekTime: 42 } as ControlCommandPayload);
    const s3 = fsm.getSnapshot();
    expectVersionBump(s2, s3);
    assert.equal(s3.player.currentTime, 42);

    fsm.controlCommand({ action: 'set_volume', volume: 0.2 } as ControlCommandPayload);
    const s4 = fsm.getSnapshot();
    expectVersionBump(s3, s4);
    assert.equal(s4.player.volume, 0.2);

    fsm.controlCommand({ action: 'mute' } as ControlCommandPayload);
    const s5 = fsm.getSnapshot();
    expectVersionBump(s4, s5);
    assert.equal(s5.player.muted, true);

    fsm.controlCommand({ action: 'unmute' } as ControlCommandPayload);
    const s6 = fsm.getSnapshot();
    expectVersionBump(s5, s6);
    assert.equal(s6.player.muted, false);
});

// action_confirmation: failure drives error state; repeated same failure is no-op; success clears error and returns to ready
test('Fsm: actionConfirmation toggles error/ready state and only bumps on change', () => {
    const fsm = new Fsm();
    fsm.registerClient('tv', 'tv-1');
    fsm.registerClient('remote', 'remote-1');
    const sReady = fsm.getSnapshot();
    assert.equal(sReady.fsmState, 'ready');

    fsm.actionConfirmation('failure', 'oops');
    const sErr = fsm.getSnapshot();
    expectVersionBump(sReady, sErr);
    assert.equal(sErr.fsmState, 'error');
    assert.ok(sErr.error && sErr.error.code === 'COMMAND_FAILED');

    // same failure again is a no-op
    fsm.actionConfirmation('failure', 'oops');
    const sErr2 = fsm.getSnapshot();
    expectNoVersionChange(sErr, sErr2);

    fsm.actionConfirmation('success');
    const sBack = fsm.getSnapshot();
    expectVersionBump(sErr2, sBack);
    assert.equal(sBack.fsmState, 'ready');
});
