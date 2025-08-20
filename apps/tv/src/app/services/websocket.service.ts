import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  WebSocketMessage,
  DataMessage,
  ErrorMessage,
  WEBSOCKET_CONFIG
} from '@shared/websocket/websocket-protocol';
import { VideoNavigationService } from '@shared/services/video-navigation.service';
import { WebSocketBaseService } from '@shared/services/websocket-base.service';
import { WebSocketUtils } from '@shared/utils/websocket-utils';
import { NavigationState } from '@shared/models/video-navigation';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService extends WebSocketBaseService {
  //private discoverySocket: any = null; // UDP socket for discovery
  private discoveryTimer: unknown = null;

  // Discovered devices
  private devicesSubject = new BehaviorSubject<NetworkDevice[]>([]);
  public devices$ = this.devicesSubject.asObservable();

  // TV-specific message handling
  private messagesSubject = new Subject<RemoteMessage>();
  public tvMessages$ = this.messagesSubject.asObservable();

  // Phase 3 Step 2: Player state tracking for comprehensive status reporting
  private playerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 100,
    muted: false,
    buffered: 0,
    youtubeState: 'unstarted' as 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued'
  };

  // Phase 3 Step 2: Connection state tracking
  private connectionMetrics = {
    connected: true,
    lastHeartbeat: Date.now(),
    connectionQuality: 'excellent' as 'excellent' | 'good' | 'fair' | 'poor',
    messagesSent: 0,
    messagesReceived: 0,
    averageLatency: 0,
    lastMessageTime: Date.now()
  };

  // Phase 3 Step 2: Status update interval for real-time reporting
  private statusUpdateInterval: undefined;
  private readonly STATUS_UPDATE_INTERVAL = 1000; // 1 second for real-time updates

  // TV-specific errors
  private errorsSubject = new Subject<WebSocketError>();
  public tvErrors$ = this.errorsSubject.asObservable();

  constructor(private navigationService: VideoNavigationService) {
    super();
    this.deviceId = WebSocketUtils.generateDeviceId('tv');
    this.deviceName = 'Sahar TV';
    this.deviceType = 'tv';
    const ips: string[] = WebSocketUtils.generateLocalHostUrls();
    ips.forEach(ip => {
      if (this.connect(ip)) {
        this.subscribeToNavigationChanges();
      }
    }); 
    
  }

  // Abstract method implementations
  protected override handleMessage(message: WebSocketMessage): void {
    this.handleIncomingMessage(message as RemoteMessage);
  }

  protected override onConnected(): void {
    console.log('📺 TV WebSocket connected - sending initial status');
    this.connectionMetrics.connected = true;
    this.connectionMetrics.lastMessageTime = Date.now();
    
    // Phase 3 Step 2: Start real-time status updates
    this.startStatusUpdates();
    
    this.sendStatusUpdate();
  }

  protected override onDisconnected(): void {
    console.log('📺 TV WebSocket disconnected');
    this.connectionMetrics.connected = false;
    
    // Phase 3 Step 2: Stop real-time status updates
    this.stopStatusUpdates();
  }

  protected override onReconnect(): void {
    this.connect();
  }


  private async pingDevice(ip: string): Promise<void> {
    try {
      // Try to establish a quick WebSocket connection to detect devices
      const testWs = new WebSocket(`ws://${ip}:${WEBSOCKET_CONFIG.SERVER_PORT}`);

      const timeout = setTimeout(() => {
        testWs.close();
      }, 1000); // 1 second timeout

      testWs.onopen = () => {
        clearTimeout(timeout);
        // Send discovery message
        const discoveryMsg: DiscoveryMessage = {
          type: 'discovery',
          timestamp: Date.now(),
          payload: {
            deviceType: 'tv',
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            capabilities: ['navigation', 'playback', 'status'],
            networkInfo: {
              ip: window.location.hostname,
              port: WEBSOCKET_CONFIG.SERVER_PORT
            },
            protocolVersion: '2.0'
          }
        };
        testWs.send(JSON.stringify(discoveryMsg));
        testWs.close();
      };

      testWs.onerror = () => {
        clearTimeout(timeout);
      };

    } catch (error) {
      // Device not reachable, ignore
    }
  }

  // Connect to a specific remote device
  public connectToDevice(device: NetworkDevice): void {
    this.disconnect();
    this.connect(`ws://${device.ip}:${device.port}`);
  }

  // Connect to WebSocket server (for testing with localhost:8000)
  public override connect(url: string = `ws://localhost:${WEBSOCKET_CONFIG.SERVER_PORT}`): boolean {
    console.log(`📺 TV connecting to WebSocket at ${url}`);
    return super.connect(url);
  }  
  
  private handleIncomingMessage(message: any): void {
    console.log('📺 TV received message:', message);
    
    // Phase 3 Step 2: Update connection metrics for all incoming messages
    this.updateConnectionMetrics();
    
    this.messagesSubject.next(message);

    switch (message.type) {
      case 'broadcast':
        // Handle broadcast messages by extracting the original message
        if (message.original) {
          console.log('📺 Processing broadcast message:', message.original);
          this.handleIncomingMessage(message.original);
        }
        break;

      case 'navigation':
        this.handleNavigationMessage(message as NavigationMessage);
        break;

      case 'control':
        this.handleControlMessage(message as ControlMessage);
        break;

      case 'discovery':
        this.handleDiscoveryMessage(message as DiscoveryMessage);
        break;

      case 'discovery_response':
        this.handleDiscoveryResponseMessage(message as DiscoveryResponseMessage);
        break;

      case 'status':
        // Handle status updates from Remote (including data)
        this.handleStatusMessage(message as StatusMessage);
        break;

      case 'data':
        // Handle data transmission from Remote
        this.handleDataMessage(message as DataMessage);
        break;

      case 'data_confirmation':
        this.handleDataConfirmationMessage(message as DataConfirmationMessage);
        break;

      case 'error':
        this.handleErrorMessage(message as ErrorMessage);
        break;

      case 'heartbeat':
        this.handleHeartbeatMessage(message as HeartbeatMessage);
        break;
    }
  }

  private handleDataMessage(message: DataMessage): void {
    console.log('📺 TV receiving data from Remote:', message);

    if (message.payload && message.payload.performers) {
      // Convert Remote's data format to TV's expected format
      const performersData = message.payload.performers.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        thumbnail: p.thumbnail,
        description: p.description || '',
        videos: p.videos.map((v: any) => ({
          id: v.id.toString(),
          title: v.title,
          thumbnail: v.thumbnail,
          url: v.url, // Use the actual YouTube URL from the data
          duration: v.duration,
          description: v.description || '',
          likedScenes: v.likedScenes.map((s: any) => ({
            id: s.id.toString(),
            title: s.title,
            startTime: s.startTime,
            endTime: s.endTime || (s.startTime + 60), // Use endTime or default duration
            thumbnail: s.thumbnail,
            description: s.description || ''
          }))
        }))
      }));

      // Pass data to navigation service
      this.navigationService.setPerformersData(performersData);

      // Send confirmation back to Remote
      this.sendDataConfirmation();
    }
  }

  private handleStatusMessage(message: StatusMessage): void {
    // Remote is sending status updates, we can use this for synchronization
    console.log('📺 TV received status from Remote:', message.payload);
  }

  private sendDataConfirmation(): void {
    // Send proper data confirmation according to protocol
    const dataConfirmation: DataConfirmationMessage = {
      type: 'data_confirmation',
      timestamp: Date.now(),
      payload: {
        status: 'received',
        dataVersion: '1.0',
        checksum: 'abc123def456', // Should match the checksum from received data
        itemsReceived: {
          performers: this.navigationService.getPerformersData().length,
          videos: this.navigationService.getPerformersData().reduce((total, p) => total + p.videos.length, 0),
          scenes: this.navigationService.getPerformersData().reduce((total, p) => 
            total + p.videos.reduce((videoTotal, v) => videoTotal + v.likedScenes.length, 0), 0)
        }
      }
    };

    this.sendTvMessage(dataConfirmation);
    console.log('📺 TV sent data confirmation to Remote');

    // Also send status update to show current navigation state
    this.sendStatusUpdate();
  }

  private handleNavigationMessage(message: NavigationMessage): void {
    const { action, targetId, parentId, navigationPath, sceneData } = message.payload;
    console.log('📺 TV processing enhanced navigation command:', {
      action, 
      targetId, 
      parentId, 
      navigationPath,
      sceneData: sceneData ? `${sceneData.title} (${sceneData.startTime}-${sceneData.endTime}s)` : 'none'
    });

    try {
      switch (action) {
        case 'navigate_to_performer':
          this.navigationService.navigateToPerformer(targetId);
          break;

        case 'navigate_to_video':
          if (parentId) {
            console.log(`📺 Navigating to video ${targetId} under performer ${parentId}`);
          }
          this.navigationService.navigateToVideo(targetId);
          break;

        case 'navigate_to_scene':
          if (sceneData) {
            console.log(`📺 Playing scene with context: ${sceneData.title} at ${sceneData.startTime}s (YouTube: ${sceneData.youtubeId})`);
            // Could pass scene context to navigation service for enhanced playback
          }
          this.navigationService.playScene(targetId);
          break;

        case 'navigate_back':
          this.navigationService.goBack();
          break;

        case 'navigate_home':
          this.navigationService.goHome();
          break;
      }

      // Send acknowledgment to Remote first
      if (message.messageId) {
        this.sendAcknowledgment(message.messageId, 'success');
      }

      // Then send updated status
      console.log('📺 TV sending status update after navigation...');
      this.sendStatusUpdate();

    } catch (error) {
      console.error('📺 TV navigation error:', error);
      
      // Send error acknowledgment
      if (message.messageId) {
        this.sendAcknowledgment(message.messageId, 'error', error instanceof Error ? error.message : 'Navigation failed');
      }
    }
  }

  private sendAcknowledgment(messageId: string, status: 'success' | 'error', errorMessage?: string): void {
    const navState = this.navigationService.getCurrentState();
    
    const acknowledgment: StatusMessage = {
      type: 'status',
      timestamp: Date.now(),
      payload: {
        currentState: {
          level: navState.breadcrumb.length === 1 ? 'performers' :
                 navState.breadcrumb.length === 2 ? 'videos' : 'scenes',
          performerId: navState.currentPerformer?.id,
          performerName: navState.currentPerformer?.name,
          videoId: navState.currentVideo?.id,
          videoTitle: navState.currentVideo?.title,
          breadcrumb: navState.breadcrumb,
          canGoBack: navState.canGoBack,
          canGoHome: true
        },
        acknowledgment: {
          messageId,
          status,
          errorMessage
        }
      }
    };

    console.log(`📺 TV sending acknowledgment for message ${messageId}: ${status}`);
    this.sendTvMessage(acknowledgment);
  }

  private handleControlMessage(message: ControlMessage): void {
    const { action } = message.payload;
    console.log(`🎮 Phase 3: TV handling enhanced control command: ${action}`);

    switch (action) {
      case 'back':
        this.navigationService.goBack();
        break;

      case 'home':
        this.navigationService.goHome();
        break;

      case 'stop':
        // TODO: Implement video player stop
        console.log('Stop playback');
        break;

      case 'resume':
      case 'play':
        // TODO: Implement video player play/resume
        console.log('Resume/Play playback');
        break;

      case 'pause':
        // TODO: Implement video player pause
        console.log('Pause playback');
        break;

      // Phase 3 Step 1: Enhanced video control commands
      case 'play_video':
        this.handlePlayVideo(message.payload);
        break;

      case 'pause_video':
        this.handlePauseVideo(message.payload);
        break;

      case 'seek_video':
        this.handleSeekVideo(message.payload);
        break;

      case 'volume_change':
        this.handleVolumeChange(message.payload);
        break;

      case 'next_scene':
        this.handleNextScene(message.payload);
        break;

      case 'previous_scene':
        this.handlePreviousScene(message.payload);
        break;

      default:
        console.warn(`📺 TV: Unknown control action: ${action}`);
    }

    // Send updated status back to remote
    this.sendStatusUpdate();
  }

  // Phase 3 Step 1: Enhanced video control handlers
  private handlePlayVideo(payload: ControlCommand): void {
    const { sceneId, youtubeId, startTime = 0, autoplay = true } = payload;
    console.log(`🎬 TV: Playing video - Scene: ${sceneId}, YouTube: ${youtubeId}, Start: ${startTime}s`);
    
    // Phase 3 Step 2: Update player state for comprehensive status reporting
    this.updatePlayerState({
      isPlaying: autoplay,
      currentTime: startTime,
      youtubeState: autoplay ? 'playing' : 'cued'
    });
    
    // TODO: Integrate with YouTube player component
    // this.youtubePlayer.loadVideoById(youtubeId, startTime, autoplay);
    
    // For now, just log the action
    console.log(`📺 Would play YouTube video ${youtubeId} from ${startTime}s with autoplay: ${autoplay}`);
  }

  private handlePauseVideo(payload: ControlCommand): void {
    console.log('⏸️ TV: Pausing video playback');
    
    // Phase 3 Step 2: Update player state
    this.updatePlayerState({
      isPlaying: false,
      youtubeState: 'paused'
    });
    
    // TODO: Integrate with YouTube player component
    // this.youtubePlayer.pauseVideo();
    
    console.log('📺 Video playback paused');
  }

  private handleSeekVideo(payload: ControlCommand): void {
    const { time, seekType = 'absolute' } = payload;
    console.log(`⏩ TV: Seeking video - ${seekType} to ${time}s`);
    
    // Phase 3 Step 2: Update player state
    const newTime = seekType === 'absolute' ? time : this.playerState.currentTime + (time || 0);
    this.updatePlayerState({
      currentTime: newTime,
      youtubeState: 'buffering' // Temporarily set to buffering during seek
    });
    
    // TODO: Integrate with YouTube player component
    if (seekType === 'absolute') {
      // this.youtubePlayer.seekTo(time, true);
      console.log(`📺 Would seek to absolute time: ${time}s`);
    } else {
      // this.youtubePlayer.seekTo(this.youtubePlayer.getCurrentTime() + time, true);
      console.log(`📺 Would seek relative by: ${time}s`);
    }
  }

  private handleVolumeChange(payload: ControlCommand): void {
    const { volume, muted = false } = payload;
    console.log(`🔊 TV: Volume change - Volume: ${volume}, Muted: ${muted}`);
    
    // Phase 3 Step 2: Update player state
    this.updatePlayerState({
      volume: volume || this.playerState.volume,
      muted
    });
    
    // TODO: Integrate with YouTube player component
    if (muted !== undefined) {
      // this.youtubePlayer.mute();
      console.log(`📺 Would ${muted ? 'mute' : 'unmute'} video`);
    }
    if (volume !== undefined) {
      // this.youtubePlayer.setVolume(volume);
      console.log(`📺 Would set volume to: ${volume}`);
    }
  }

  private handleNextScene(payload: ControlCommand): void {
    const { currentSceneId, nextSceneId, sceneData } = payload;
    console.log(`⏭️ TV: Next scene - From: ${currentSceneId} to: ${nextSceneId}`);
    
    if (sceneData) {
      console.log(`📺 Scene data: ${sceneData.title} (${sceneData.startTime}s - ${sceneData.endTime}s)`);
      
      // Phase 3 Step 2: Update player state
      this.updatePlayerState({
        currentTime: sceneData.startTime,
        youtubeState: 'buffering'
      });
      
      // TODO: Integrate with YouTube player component
      // this.youtubePlayer.seekTo(sceneData.startTime, true);
      console.log(`📺 Would seek to scene start time: ${sceneData.startTime}s`);
    }
  }

  private handlePreviousScene(payload: ControlCommand): void {
    const { currentSceneId, previousSceneId, sceneData } = payload;
    console.log(`⏮️ TV: Previous scene - From: ${currentSceneId} to: ${previousSceneId}`);
    
    if (sceneData) {
      console.log(`📺 Scene data: ${sceneData.title} (${sceneData.startTime}s - ${sceneData.endTime}s)`);
      
      // Phase 3 Step 2: Update player state
      this.updatePlayerState({
        currentTime: sceneData.startTime,
        youtubeState: 'buffering'
      });
      
      // TODO: Integrate with YouTube player component
      // this.youtubePlayer.seekTo(sceneData.startTime, true);
      console.log(`📺 Would seek to scene start time: ${sceneData.startTime}s`);
    }
  }

  private handleDiscoveryMessage(message: DiscoveryMessage): void {
    const device = message.payload;

    console.log('📺 TV received discovery from Remote:', device.deviceId);

    if (device.deviceType === 'remote') {
      // Send discovery response to Remote
      const discoveryResponse: DiscoveryResponseMessage = {
        type: 'discovery_response',
        timestamp: Date.now(),
        payload: {
          deviceType: 'tv',
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          status: 'ready',
          capabilities: ['display', 'video', 'audio', 'navigation'],
          networkInfo: {
            ip: window.location.hostname,
            port: WEBSOCKET_CONFIG.SERVER_PORT
          },
          protocolVersion: '2.0'
        }
      };

      this.sendTvMessage(discoveryResponse);
      console.log('📺 TV sent discovery response to Remote');

      // Add discovered remote device to our list
      const networkDevice: NetworkDevice = {    
        deviceId: device.deviceId,       
        deviceName: device.deviceName,    
        deviceType: device.deviceType,
        ip: device.networkInfo.ip,
        port: device.networkInfo.port,
        lastSeen: Date.now(),
        capabilities: device.capabilities
      };

      const currentDevices = this.devicesSubject.value;
      const existingIndex = currentDevices.findIndex(d => d.deviceId === device.deviceId);

      if (existingIndex >= 0) {
        currentDevices[existingIndex] = networkDevice;
      } else {
        currentDevices.push(networkDevice);
      }

      this.devicesSubject.next([...currentDevices]);
    }
  }

  private handleDiscoveryResponseMessage(message: DiscoveryResponseMessage): void {
    console.log('📺 TV received discovery response:', message.payload);
    // TV typically doesn't need to handle discovery responses since it doesn't send discovery requests
    // This is mainly for Remote devices responding to TV discovery
  }

  private handleDataConfirmationMessage(message: DataConfirmationMessage): void {
    console.log('📺 TV received data confirmation from Remote:', message.payload);
    
    if (message.payload.status === 'received') {
      console.log('✅ Remote confirmed data receipt:', message.payload.itemsReceived);
    } else if (message.payload.status === 'error') {
      console.error('❌ Remote reported data error:', message.payload.errorMessage);
      // Could trigger data retransmission here
    }
  }

  private handleErrorMessage(message: ErrorMessage): void {
    console.error('📺 TV received error from Remote:', message.payload);
    
    const error: WebSocketError = {
      code: message.payload.errorCode,
      message: message.payload.errorMessage,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };
    
    this.errorsSubject.next(error);
    
    // Handle specific error types
    switch (message.payload.errorCode) {
      case 'INVALID_SCENE_ID':
      case 'INVALID_VIDEO_ID':
      case 'INVALID_PERFORMER_ID':
        console.log('📺 Navigation error - refreshing current state');
        this.sendStatusUpdate();
        break;
      case 'CONNECTION_LOST':
        console.log('📺 Connection error - attempting reconnection');
        // Base class will handle reconnection
        break;
    }
  }

  private handleHeartbeatMessage(message: HeartbeatMessage): void {
    console.log('📺 TV received heartbeat from Remote:', message.payload.deviceId);
    
    // Respond with our own heartbeat
    const response: HeartbeatMessage = {
      type: 'heartbeat',
      timestamp: Date.now(),
      payload: {
        deviceId: this.deviceId,
        status: 'alive'
      }
    };
    
    this.sendTvMessage(response);
  }

  // Send navigation/control commands to remote
  public sendNavigationCommand(action: string, targetId: string, targetType: string): void {
    const message: NavigationMessage = {
      type: 'navigation',
      timestamp: Date.now(),
      payload: {
        action: action as any,
        targetId,
        targetType: targetType as any
      }
    };

    this.sendTvMessage(message);
  }

  public sendControlCommand(action: string, targetId?: string): void {
    const message: ControlMessage = {
      type: 'control',
      timestamp: Date.now(),
      payload: {
        action: action as any,
        targetId
      }
    };

    this.sendTvMessage(message);
  }

  // Phase 3 Step 2: Real-time status update management
  private startStatusUpdates(): void {
    this.stopStatusUpdates(); // Clear any existing interval
    
    console.log('📺 Phase 3 Step 2: Starting real-time status updates');
    this.statusUpdateInterval = setInterval(() => {
      if (this.isConnected && this.playerState.isPlaying) {
        // Send status updates every second during video playback
        this.sendEnhancedStatusUpdate();
      }
    }, this.STATUS_UPDATE_INTERVAL);
  }

  private stopStatusUpdates(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
      console.log('📺 Phase 3 Step 2: Stopped real-time status updates');
    }
  }

  // Phase 3 Step 2: Update player state (to be called by YouTube player integration)
  updatePlayerState(state: {
    isPlaying?: boolean;
    currentTime?: number;
    duration?: number;
    volume?: number;
    muted?: boolean;
    buffered?: number;
    youtubeState?: 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';
  }): void {
    Object.assign(this.playerState, state);
    console.log('📺 Phase 3 Step 2: Player state updated:', this.playerState);
    
    // Send immediate status update for significant changes
    if (state.isPlaying !== undefined || state.youtubeState !== undefined) {
      this.sendEnhancedStatusUpdate();
    }
  }

  // Phase 3 Step 2: Update connection metrics
  private updateConnectionMetrics(): void {
    this.connectionMetrics.lastHeartbeat = Date.now();
    this.connectionMetrics.messagesReceived++;
    
    // Calculate connection quality based on recent activity
    const timeSinceLastMessage = Date.now() - this.connectionMetrics.lastMessageTime;
    if (timeSinceLastMessage < 1000) {
      this.connectionMetrics.connectionQuality = 'excellent';
    } else if (timeSinceLastMessage < 5000) {
      this.connectionMetrics.connectionQuality = 'good';
    } else if (timeSinceLastMessage < 10000) {
      this.connectionMetrics.connectionQuality = 'fair';
    } else {
      this.connectionMetrics.connectionQuality = 'poor';
    }
    
    this.connectionMetrics.lastMessageTime = Date.now();
  }

  // Send status updates to remote
  private subscribeToNavigationChanges(): void {
    this.navigationService.navigation$.subscribe((navState: NavigationState) => {
      this.sendStatusUpdate(navState);
    });
  }

  private sendStatusUpdate(navState?: NavigationState): void {
    this.sendEnhancedStatusUpdate(navState);
  }

  // Phase 3 Step 2: Enhanced status reporting with comprehensive player and connection state
  private sendEnhancedStatusUpdate(navState?: NavigationState): void {
    if (!navState) {
      navState = this.navigationService.getCurrentState();
    }

    const currentLevel = navState.breadcrumb.length === 1 ? 'performers' :
                        navState.breadcrumb.length === 2 ? 'videos' : 'scenes';

    const message: StatusMessage = {
      type: 'status',
      timestamp: Date.now(),
      payload: {
        currentState: {
          level: currentLevel as any,
          performerId: navState.currentPerformer?.id,
          performerName: navState.currentPerformer?.name,
          videoId: navState.currentVideo?.id,
          videoTitle: navState.currentVideo?.title,
          sceneId: navState.breadcrumb.length > 2 ? 'current-scene' : undefined,
          sceneTitle: navState.breadcrumb.length > 2 ? navState.breadcrumb[navState.breadcrumb.length - 1] : undefined,
          breadcrumb: navState.breadcrumb,
          canGoBack: navState.canGoBack,
          canGoHome: true
        },
        // Phase 3 Step 2: Comprehensive player state
        playerState: {
          isPlaying: this.playerState.isPlaying,
          currentTime: this.playerState.currentTime,
          duration: this.playerState.duration,
          volume: this.playerState.volume,
          muted: this.playerState.muted,
          buffered: this.playerState.buffered,
          youtubeState: this.playerState.youtubeState
        },
        // Phase 3 Step 2: Connection state tracking
        connectionState: {
          connected: this.connectionMetrics.connected,
          lastHeartbeat: this.connectionMetrics.lastHeartbeat
        }
      }
    };

    console.log('📺 Phase 3 Step 2: Sending enhanced status update:', {
      level: currentLevel,
      playerState: this.playerState,
      connectionQuality: this.connectionMetrics.connectionQuality
    });
    
    this.sendTvMessage(message);
  }

  private sendTvMessage(message: RemoteMessage): void {
    if (this.isConnected) {
      console.log('📺 TV WebSocket sending message:', message.type);
      super.sendMessage(message);
    } else {
      console.warn('📺 TV WebSocket not connected, message not sent:', message);
    }
  }

  // Update all sendMessage calls to use sendTvMessage

  public override disconnect(): void {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    super.disconnect();
  }


  public getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: 'tv' as const
    };
  }

  // Public getter for connection state
  public getConnectionState() {
    return this.connectionState$.asObservable();
  }

  private emitError(code: string, message: string): void {
    const error: WebSocketError = {
      code,
      message,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };

    this.errorsSubject.next(error);
  }
}
