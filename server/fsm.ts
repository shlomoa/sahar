import { ApplicationState, ClientType, NavigationCommandPayload, ControlCommandPayload } 
from '@shared/websocket/websocket-protocol';

/**
 * Authoritative Finite State Machine (Task 1.15)
 * - Owns canonical ApplicationState
 * - Ensures monotonic version only bumps on real mutations
 * - Provides pure snapshot (defensive copy) so callers cannot mutate internal state
 * - Central place to extend future invariants (heartbeat, recovery, etc.) without leaking details
 */

export class SaharFsm {
  private state: ApplicationState;
  private dirty = false; // tracks whether a mutation occurred in current handler

  constructor() {
    this.state = {
      version: 1,
      fsmState: 'initializing',
      connectedClients: {},
      navigation: {
        currentLevel: 'performers',
        breadcrumb: []
      },
      player: {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        muted: false
      }
    };
  }

  /** Return a defensive deep copy so outside code cannot mutate internal state */
  getSnapshot(): ApplicationState {
    // Using JSON clone is acceptable here (state is simple / purely data). If performance becomes an issue
    // we can switch to structuredClone (Node >=17.0) or a handcrafted shallow+nested copy.
    return JSON.parse(JSON.stringify(this.state)) as ApplicationState;
  }

  registerClient(type: ClientType, deviceId: string, deviceName: string): { ok: boolean; reason?: string } {
    if (this.state.connectedClients[type]) {
      return { ok: false, reason: 'duplicate_client_type' };
    }
    this.state.connectedClients[type] = { deviceId, deviceName };
    this.dirty = true;
    this.recalcFsm();
    this.commit();
    return { ok: true };
  }

  deregisterClient(type: ClientType) {
    if (this.state.connectedClients[type]) {
      delete this.state.connectedClients[type];
      this.dirty = true;
      this.recalcFsm();
      this.commit();
    }
  }

  navigationCommand(action: NavigationCommandPayload['action'], targetId?: string) {
    const before = JSON.stringify(this.state.navigation);
    const nav = this.state.navigation;
    switch (action) {
      case 'navigate_home': {
        if (nav.currentLevel !== 'performers' || nav.breadcrumb.length) {
          this.state.navigation = { currentLevel: 'performers', breadcrumb: [] };
        }
        break;
      }
      case 'navigate_back': {
        if (nav.breadcrumb.length) {
          nav.breadcrumb.pop();
          if (nav.currentLevel === 'scenes') {
            nav.currentLevel = 'videos';
            delete nav.sceneId;
          } else if (nav.currentLevel === 'videos') {
            nav.currentLevel = 'performers';
            delete nav.videoId;
            delete nav.performerId; // returning all the way up clears performer context
          }
        }
        break;
      }
      case 'navigate_to_performer': {
        if (targetId && nav.performerId !== targetId) {
          nav.currentLevel = 'videos';
          nav.performerId = targetId;
          nav.breadcrumb.push(`performer:${targetId}`);
          // Clear deeper selections
          delete nav.videoId;
          delete nav.sceneId;
        }
        break;
      }
      case 'navigate_to_video': {
        if (targetId && nav.videoId !== targetId) {
          nav.currentLevel = 'scenes';
            nav.videoId = targetId;
            nav.breadcrumb.push(`video:${targetId}`);
            delete nav.sceneId;
        }
        break;
      }
      case 'navigate_to_scene': {
        if (targetId && nav.sceneId !== targetId) {
          nav.sceneId = targetId;
          nav.breadcrumb.push(`scene:${targetId}`);
        }
        break;
      }
    }
    if (JSON.stringify(this.state.navigation) !== before) {
      this.dirty = true;
      this.commit();
    }
  }

  controlCommand(payload: ControlCommandPayload) {
    const before = JSON.stringify(this.state.player);
    const { action, youtubeId, startTime, seekTime, volume } = payload;
    switch (action) {
      case 'play': {
        if (youtubeId && this.state.player.youtubeId !== youtubeId) this.state.player.youtubeId = youtubeId;
        if (!this.state.player.isPlaying) this.state.player.isPlaying = true;
        if (typeof startTime === 'number' && this.state.player.currentTime !== startTime) this.state.player.currentTime = startTime;
        if (this.state.fsmState !== 'playing') this.state.fsmState = 'playing';
        break; }
      case 'pause': {
        if (this.state.player.isPlaying) this.state.player.isPlaying = false;
        if (this.state.fsmState !== 'paused') this.state.fsmState = 'paused';
        break; }
      case 'seek': {
        if (typeof seekTime === 'number' && this.state.player.currentTime !== seekTime) this.state.player.currentTime = seekTime;
        break; }
      case 'set_volume': {
        if (typeof volume === 'number') {
          const v = Math.max(0, Math.min(1, volume));
          if (this.state.player.volume !== v) this.state.player.volume = v;
        }
        break; }
      case 'mute': {
        if (!this.state.player.muted) this.state.player.muted = true;
        break; }
      case 'unmute': {
        if (this.state.player.muted) this.state.player.muted = false;
        break; }
    }
    if (JSON.stringify(this.state.player) !== before) {
      this.dirty = true;
      this.commit();
    }
  }

  actionConfirmation(status: 'success' | 'failure', errorMessage?: string) {
    const beforeErr = this.state.error ? this.state.error.code + this.state.error.message : 'none';
    const beforeState = this.state.fsmState;
    if (status === 'failure') {
      this.state.error = { code: 'COMMAND_FAILED', message: errorMessage || 'Unknown failure' };
      this.state.fsmState = 'error';
    } else if (status === 'success' && this.state.error) {
      delete this.state.error;
      if (this.state.fsmState === 'error') this.state.fsmState = 'ready'; // revert to ready if both clients present
      this.recalcFsm();
    }
    if ((this.state.error ? this.state.error.code + this.state.error.message : 'none') !== beforeErr || beforeState !== this.state.fsmState) {
      this.dirty = true;
      this.commit();
    }
  }

  private recalcFsm() {
    const both = !!this.state.connectedClients.tv && !!this.state.connectedClients.remote;
    if (both && this.state.fsmState === 'initializing') {
      this.state.fsmState = 'ready';
    } else if (!both && this.state.fsmState !== 'initializing' && this.state.fsmState !== 'error') {
      // Only regress to initializing if not in an error state (preserve error until cleared)
      this.state.fsmState = 'initializing';
    }
  }

  private commit() {
    if (this.dirty) {
      this.state.version += 1;
      this.dirty = false;
    }
  }
}
