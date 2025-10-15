import { ApplicationState, ActionConfirmationStatus, createLogger, NavigationAction } from 'shared';
import { ClientType, NavigationCommandPayload, ControlCommandPayload } from 'shared';

const logger = createLogger({ component: 'server-fsm' });
const logInfo = (event: string, meta?: any, msg?: string) => logger.info(event, meta, msg);
const logWarn = (event: string, meta?: any, msg?: string) => logger.warn(event, meta, msg);
const logError = (event: string, meta?: any, msg?: string) => logger.error(event, meta, msg);

/**
 * Authoritative Finite State Machine (Task 1.15)
 * - Owns canonical ApplicationState
 * - Ensures monotonic version only bumps on real mutations
 * - Provides pure snapshot (defensive copy) so callers cannot mutate internal state
 * - Central place to extend future invariants (heartbeat, recovery, etc.) without leaking details
 */

export class Fsm {
  private state: ApplicationState;
  private dirty = false; // tracks whether a mutation occurred in current handler

  constructor() {
    this.state = {
      version: 1,
      fsmState: 'initializing',
      connectedClients: {},
      // data field intentionally omitted until seeded (Task 1.17)
      navigation: {
        currentLevel: 'performers'
      },
      player: {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        muted: false
      }
    };
    logInfo('fsm_initialized', {}, 'Sahar FSM initialized with state: ' + JSON.stringify(this.state));
  }

  seedData(payload: any) {
    if (!payload || typeof payload !== 'object') {
      logError('fsm_seed_invalid', { payload }, 'Invalid seed data payload');
      return; // ignore invalid
    }
    if (!this.state.data) {
      logInfo('fsm_seed_data', { payload }, 'Seeding initial data');
      this.state.data = JSON.parse(JSON.stringify(payload));
      this.dirty = true;
      this.commit();
      return;
    }
    // Shallow merge: add/overwrite top-level keys; detect real change
    logInfo('fsm_seed_data_merge', { payload }, 'Merging seed data');
    const before = JSON.stringify(this.state.data);
    Object.assign(this.state.data, JSON.parse(JSON.stringify(payload)));
    if (JSON.stringify(this.state.data) !== before) {
      this.dirty = true;
      this.commit();
    }
  }

  /** Return a defensive deep copy so outside code cannot mutate internal state */
  getSnapshot(): ApplicationState {
    // Using JSON clone is acceptable here (state is simple / purely data). If performance becomes an issue
    // we can switch to structuredClone (Node >=17.0) or a handcrafted shallow+nested copy.
    logInfo('fsm_get_snapshot', { version: this.state.version }, 'FSM snapshot requested');
    return JSON.parse(JSON.stringify(this.state)) as ApplicationState;
  }

  registerClient(clientType: ClientType, deviceId: string): { ok: boolean; reason?: string } {
    if (this.state.connectedClients[clientType]) {
      logWarn('fsm_register_duplicate', { clientType, deviceId }, 'Client type already registered');
      return { ok: false, reason: 'duplicate_client_type' };
    }
    this.state.connectedClients[clientType] = { deviceId };
    this.dirty = true;
    this.recalcFsm();
    this.commit();
    logInfo('fsm_register_client', { clientType, deviceId }, 'Client registered');
    return { ok: true };
  }

  deregisterClient(clientType: ClientType) {
    logInfo('fsm_deregister_client', { clientType }, 'Deregistering client');
    if (this.state.connectedClients[clientType]) {
      delete this.state.connectedClients[clientType];
      this.dirty = true;
      this.recalcFsm();
      this.commit();
    }
  }

  navigationCommand(action: NavigationAction, targetId?: string) {
    logInfo('fsm_navigation_command', { action, targetId }, 'Processing navigation command');
    const before = JSON.stringify(this.state.navigation);
    const nav = this.state.navigation;
    switch (action) {
      case 'navigate_home': {
        if (nav.currentLevel !== 'performers' || nav.performerId || nav.videoId || nav.sceneId) {
          this.state.navigation = { currentLevel: 'performers' } as ApplicationState['navigation'];
        }
        break;
      }
      case 'navigate_back': {
        if (nav.currentLevel === 'scenes') {
          nav.currentLevel = 'videos';
          delete nav.sceneId;
        } else if (nav.currentLevel === 'videos') {
          nav.currentLevel = 'performers';
          delete nav.videoId;
          delete nav.performerId; // returning all the way up clears performer context
        }
        break;
      }
      case 'navigate_to_performer': {
        if (targetId && nav.performerId !== targetId) {
          nav.currentLevel = 'videos';
          nav.performerId = targetId;
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
            delete nav.sceneId;
        }
        break;
      }
      case 'navigate_to_scene': {
        if (targetId && nav.sceneId !== targetId) {
          nav.sceneId = targetId;
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
    logInfo('fsm_control_command', { payload }, 'Processing control command');
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

  actionConfirmation(status: ActionConfirmationStatus, errorMessage?: string) {
    logInfo('fsm_action_confirmation', { status, errorMessage }, 'Processing action confirmation');
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
    logInfo('fsm_recalc', {}, 'Recalculating FSM state based on connected clients');
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
