import { ApplicationState, ClientType, NavigationCommandPayload, ControlCommandPayload } from './shared/websocket/websocket-protocol.js';

export class SaharFsm {
  private state: ApplicationState;

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

  getSnapshot(): ApplicationState {
    return this.state;
  }

  registerClient(type: ClientType, deviceId: string, deviceName: string): { ok: boolean; reason?: string } {
    if (this.state.connectedClients[type]) {
      return { ok: false, reason: 'duplicate_client_type' };
    }
    this.state.connectedClients[type] = { deviceId, deviceName };
    this.recalcFsm();
    this.bumpVersion();
    return { ok: true };
  }

  deregisterClient(type: ClientType) {
    if (this.state.connectedClients[type]) {
      delete this.state.connectedClients[type];
      this.recalcFsm();
      this.bumpVersion();
    }
  }

  navigationCommand(action: NavigationCommandPayload['action'], targetId?: string) {
    const nav = this.state.navigation;
    switch (action) {
      case 'navigate_home':
        this.state.navigation = { currentLevel: 'performers', breadcrumb: [] };
        break;
      case 'navigate_back': {
        nav.breadcrumb.pop();
        if (nav.currentLevel === 'scenes') {
          nav.currentLevel = 'videos';
          delete nav.sceneId;
        } else if (nav.currentLevel === 'videos') {
          nav.currentLevel = 'performers';
          delete nav.videoId;
        }
        break;
      }
      case 'navigate_to_performer':
        nav.currentLevel = 'videos';
        nav.performerId = targetId;
        nav.breadcrumb.push(`performer:${targetId}`);
        break;
      case 'navigate_to_video':
        nav.currentLevel = 'scenes';
        nav.videoId = targetId;
        nav.breadcrumb.push(`video:${targetId}`);
        break;
      case 'navigate_to_scene':
        nav.sceneId = targetId;
        nav.breadcrumb.push(`scene:${targetId}`);
        break;
    }
    this.bumpVersion();
  }

  controlCommand(payload: ControlCommandPayload) {
    const { action, youtubeId, startTime, seekTime, volume } = payload;
    switch (action) {
      case 'play':
        if (youtubeId) this.state.player.youtubeId = youtubeId;
        this.state.player.isPlaying = true;
        if (typeof startTime === 'number') this.state.player.currentTime = startTime;
        this.state.fsmState = 'playing';
        break;
      case 'pause':
        this.state.player.isPlaying = false;
        this.state.fsmState = 'paused';
        break;
      case 'seek':
        if (typeof seekTime === 'number') this.state.player.currentTime = seekTime;
        break;
      case 'set_volume':
        if (typeof volume === 'number') this.state.player.volume = Math.max(0, Math.min(1, volume));
        break;
      case 'mute':
        this.state.player.muted = true;
        break;
      case 'unmute':
        this.state.player.muted = false;
        break;
    }
    this.bumpVersion();
  }

  actionConfirmation(status: 'success' | 'failure', errorMessage?: string) {
    if (status === 'failure') {
      this.state.error = { code: 'COMMAND_FAILED', message: errorMessage || 'Unknown failure' };
      this.state.fsmState = 'error';
    } else if (status === 'success' && this.state.error) {
      delete this.state.error;
    }
    this.bumpVersion();
  }

  private recalcFsm() {
    if (this.state.connectedClients.tv && this.state.connectedClients.remote) {
      if (this.state.fsmState === 'initializing') this.state.fsmState = 'ready';
    } else if (!this.state.connectedClients.tv || !this.state.connectedClients.remote) {
      this.state.fsmState = 'initializing';
    }
  }

  private bumpVersion() {
    this.state.version += 1;
  }
}
