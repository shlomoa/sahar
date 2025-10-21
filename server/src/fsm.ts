import { 
  ApplicationState,
  ActionConfirmationStatus, 
  createLogger, 
  NavigationAction, 
  ClientInfo, 
  ClientType, 
  ClientsConnectionState, 
  ControlCommandPayload, 
  CatalogData 
} from 'shared';
import { catalogData } from './mock-data';

export type FsmState = 'initializing' | 'ready' | 'error';

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
 * 
 * Note: FsmState tracks system readiness only. Playback state (playing/paused) is tracked
 * in ApplicationState.player.isPlaying and should not be duplicated in FsmState.
 */

interface ConnectedClients {
  tv?: ClientInfo;
  remote?: ClientInfo;
}

export class Fsm {
  private state: ApplicationState;
  private dirty = false; // tracks whether a mutation occurred in current handler
  private connectedClients: ConnectedClients = {};
  fsmState: FsmState = 'initializing';
  
  // Phase 3: Catalog stored separately, not in ApplicationState
  private catalogData: CatalogData;

  constructor() {
    // Phase 3: Initialize catalog from mock data (not part of state)
    this.catalogData = catalogData;
    
    this.state = {
      version: 1,      
      clientsConnectionState: { tv: 'disconnected', remote: 'disconnected' } as ClientsConnectionState,
      // Phase 3: data field removed - catalog delivered via HTTP
      navigation: {
        currentLevel: 'performers'
      },
      player: {
        isPlaying: false,
        isFullscreen: false,
        isMuted: false,
        currentTime: 0,
        volume: 50  // Use 0-100 range to match Remote UI and YouTube API
      }
    };
    logInfo('fsm_initialized', {}, 'Sahar FSM initialized with state: ' + JSON.stringify(this.state));
  }

  // Phase 3: seedData method removed - catalog no longer part of ApplicationState
  // Catalog is now initialized from mock-data.ts in constructor and served via HTTP endpoint
  // seedData(payload: any) { ... }

  /** Return a defensive deep copy so outside code cannot mutate internal state,
   *  used for validation purposes */
  getSnapshot(): ApplicationState {
    // Using JSON clone is acceptable here (state is simple / purely data). If performance becomes an issue
    // we can switch to structuredClone (Node >=17.0) or a handcrafted shallow+nested copy.
    logInfo('fsm_get_snapshot', { version: this.state.version }, 'FSM snapshot requested');
    return JSON.parse(JSON.stringify(this.state)) as ApplicationState;
  }

  /** Return catalog data for HTTP API endpoint (Phase 3: Content Delivery Separation) */
  getCatalogData(): CatalogData {
    // Phase 3: Return catalog from internal field, not ApplicationState
    return this.catalogData;
  }

  registerClient(clientType: ClientType, deviceId: string): { ok: boolean; reason?: string } {
    if (this.connectedClients[clientType]) {
      logWarn('fsm_register_duplicate', { clientType, deviceId }, 'Client type already registered');
      return { ok: false, reason: 'duplicate_client_type' };
    }
    this.connectedClients[clientType] = { deviceId };
    this.state.clientsConnectionState[clientType] = 'connected';
    this.dirty = true;
    this.recalcFsm();
    this.commit();
    logInfo('fsm_register_client', { clientType, deviceId }, 'Client registered');
    return { ok: true };
  }

  deregisterClient(clientType: ClientType) {
    logInfo('fsm_deregister_client', { clientType }, 'Deregistering client');
    if (this.connectedClients[clientType]) {
      delete this.connectedClients[clientType];
      this.state.clientsConnectionState[clientType] = 'disconnected';
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
          // Keep currentLevel at 'scenes' - playback state tracked by PlayerState.isPlaying
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
    const { action, startTime, seekTime, volume } = payload;
    switch (action) {
      case 'play': {
        // youtubeId removed from PlayerState - derived from navigation.videoId in apps
        if (!this.state.player.isPlaying) this.state.player.isPlaying = true;
        if (typeof startTime === 'number' && this.state.player.currentTime !== startTime) this.state.player.currentTime = startTime;
        break; }
      case 'pause': {
        if (this.state.player.isPlaying) this.state.player.isPlaying = false;
        break; }
      case 'seek': {
        if (typeof seekTime === 'number' && this.state.player.currentTime !== seekTime) this.state.player.currentTime = seekTime;
        break; }
      case 'set_volume': {
        if (typeof volume === 'number') {
          if (this.state.player.volume !== volume) {
            this.state.player.volume = volume;
          }
        }
        break; }
      case 'mute': {
        if (!this.state.player.isMuted) this.state.player.isMuted = true;
        break; }
      case 'unmute': {
        if (this.state.player.isMuted) this.state.player.isMuted = false;
        break; }
      case 'enter_fullscreen': {
        // Note: Fullscreen state is managed by the TV client, but we can track it for consistency
        this.state.player.isFullscreen = true;
        logInfo('fsm_fullscreen_enter', {}, 'Entering fullscreen mode');
        break; }
      case 'exit_fullscreen': {
        // Note: Fullscreen state is managed by the TV client, but we can track it for consistency
        this.state.player.isFullscreen = false;
        logInfo('fsm_fullscreen_exit', {}, 'Exiting fullscreen mode');
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
    const beforeState = this.fsmState;
    if (status === 'failure') {
      logError('fsm_action_confirmation', { errorMessage }, 'Action confirmation indicates failure');
      this.state.error = { code: 'COMMAND_FAILED', message: errorMessage || 'Unknown failure' };
      this.fsmState = 'error';
    } else if (status === 'success' && this.state.error) {
      delete this.state.error;
      if (this.fsmState === 'error') this.fsmState = 'ready'; // revert to ready if both clients present
      this.recalcFsm();
    }
    if ((this.state.error ? this.state.error.code + this.state.error.message : 'none') !== beforeErr || beforeState !== this.fsmState) {
      this.dirty = true;
      this.commit();
    }
  }

  private recalcFsm() {
    logInfo('fsm_recalc', {}, 'Recalculating FSM state based on connected clients');
    const both = this.state.clientsConnectionState.tv === 'connected' && 
                 this.state.clientsConnectionState.remote === 'connected';
    if (both && this.fsmState === 'initializing') {
      logInfo('fsm_recalc', {}, 'Both clients connected, transitioning to ready state');
      this.fsmState = 'ready';
    } else if (!both && this.fsmState !== 'initializing' && this.fsmState !== 'error') {
      logInfo('fsm_recalc', {}, 'One or more clients disconnected, transitioning to initializing state');
      // Only regress to initializing if not in an error state (preserve error until cleared)
      this.fsmState = 'initializing';
    }
  }

  private commit() {
    if (this.dirty) {
      this.state.version += 1;
      this.dirty = false;
    }
  }
}
