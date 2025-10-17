# remote video control graphics

This document outlines the graphics and UI elements used in the SAHAR TV Remote application for video control. It serves as a reference for developers and designers working on the project.
The application is intended for a child with hearing mobility and vision impairment, so the graphics should be designed to be simple colorful intuitive and accessible.

## Video Control Icons

The following icons are used for video control functionalities:
- **Play Icon**: Represents the action to start or resume video playback.
  - File: `assets/icons/play.svg`
  - Usage: Displayed on the play button in the video control panel when the video is paused or ready to play.
- **Pause Icon**: Represents the action to pause video playback.
  - File: `assets/icons/pause.svg`
  - Usage: Displayed on the pause button in the video control panel when the video is playing.
- **Forward Icon**: Represents the action to forward to the next scene in the video.
  - File: `assets/icons/forward.svg`
  - Usage: Displayed on the forward button in the video control panel.
- **Backward Icon**: Represents the action to get back to the previous scene in the video, highlighted when applicable.
  - File: `assets/icons/backward.svg`
  - Usage: Displayed on the backward button in the video control panel, highlighted when applicable.
- **Volume Increase Icon**: Represents the action to increase the volume of the video playback.
  - File: `assets/icons/volume-up.svg`
  - Usage: Displayed on the volume increase button in the video control panel.
- **Volume Decrease Icon**: Represents the action to decrease the volume of the video playback.
  - File: `assets/icons/volume-down.svg`
  - Usage: Displayed on the volume decrease button in the video control panel.
- **Exit Icon**: Represents the action to exit the video playback and return to the navigation screen.
  - File: `assets/icons/exit.svg`
  - Usage: Displayed on the exit button in the video control panel.
- **Fullscreen Icon**: Represents the action to toggle fullscreen mode for video playback.
  - File: `assets/icons/fullscreen.svg`
  - Usage: Displayed on the fullscreen button in the video control panel.
- **Mute Icon**: Represents the action to mute or unmute the video playback.
  - File: `assets/icons/mute.svg`
  - Usage: Displayed on the mute button in the video control panel.

## UI Elements

There are 3 main UI elements in the video control interface:
1. **Video Navigation Panel**: A horizontal panel containing video navigation control buttons.
   - Play and pause buttons are located in the same place.
   - From the right, there is a forward button while the backward button is on the left.
2. **Volume Control Panel**: A vertical panel containing volume control buttons ordered from top to bottom (volume increase, mute, volume decrease).
3. **Global Buttons Area**: A display area that shows the home full screen and exit buttons.
