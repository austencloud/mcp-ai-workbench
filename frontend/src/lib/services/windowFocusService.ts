import { writable, type Writable } from 'svelte/store';

export interface WindowFocusState {
  hasFocus: boolean;
  wasVoiceActiveBeforeBlur: boolean;
  lastFocusChange: number;
}

class WindowFocusService {
  private state: Writable<WindowFocusState> = writable({
    hasFocus: true,
    wasVoiceActiveBeforeBlur: false,
    lastFocusChange: Date.now()
  });

  private focusCallbacks: Set<(hasFocus: boolean) => void> = new Set();
  private blurCallbacks: Set<() => void> = new Set();
  private isInitialized = false;

  /**
   * Initialize the window focus service
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Handle window focus events
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));

    // Handle page visibility changes (for tab switching)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Handle beforeunload to clean up voice recognition
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    this.isInitialized = true;
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    if (!this.isInitialized) return;

    window.removeEventListener('focus', this.handleFocus.bind(this));
    window.removeEventListener('blur', this.handleBlur.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    this.focusCallbacks.clear();
    this.blurCallbacks.clear();
    this.isInitialized = false;
  }

  /**
   * Get the current state
   */
  public getState(): WindowFocusState {
    let currentState: WindowFocusState;
    this.state.subscribe(state => currentState = state)();
    return currentState!;
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(callback: (state: WindowFocusState) => void): () => void {
    return this.state.subscribe(callback);
  }

  /**
   * Add callback for focus events
   */
  public onFocus(callback: (hasFocus: boolean) => void): () => void {
    this.focusCallbacks.add(callback);
    return () => this.focusCallbacks.delete(callback);
  }

  /**
   * Add callback for blur events
   */
  public onBlur(callback: () => void): () => void {
    this.blurCallbacks.add(callback);
    return () => this.blurCallbacks.delete(callback);
  }

  /**
   * Set voice active state before blur
   */
  public setVoiceActiveBeforeBlur(wasActive: boolean): void {
    this.state.update(state => ({
      ...state,
      wasVoiceActiveBeforeBlur: wasActive
    }));
  }

  /**
   * Check if voice should resume after focus
   */
  public shouldResumeVoice(): boolean {
    const state = this.getState();
    return state.wasVoiceActiveBeforeBlur && state.hasFocus;
  }

  /**
   * Handle window focus event
   */
  private handleFocus(): void {
    this.updateState(true);
    this.focusCallbacks.forEach(callback => callback(true));
  }

  /**
   * Handle window blur event
   */
  private handleBlur(): void {
    this.updateState(false);
    this.blurCallbacks.forEach(callback => callback());
    this.focusCallbacks.forEach(callback => callback(false));
  }

  /**
   * Handle page visibility change (tab switching)
   */
  private handleVisibilityChange(): void {
    const isVisible = !document.hidden;
    
    if (isVisible) {
      this.handleFocus();
    } else {
      this.handleBlur();
    }
  }

  /**
   * Handle before unload to clean up
   */
  private handleBeforeUnload(): void {
    this.blurCallbacks.forEach(callback => callback());
  }

  /**
   * Update internal state
   */
  private updateState(hasFocus: boolean): void {
    this.state.update(state => ({
      ...state,
      hasFocus,
      lastFocusChange: Date.now()
    }));
  }

  /**
   * Check if window currently has focus
   */
  public hasFocus(): boolean {
    return this.getState().hasFocus;
  }

  /**
   * Check if document is visible (not in background tab)
   */
  public isVisible(): boolean {
    return !document.hidden;
  }

  /**
   * Check if window is active (has focus and is visible)
   */
  public isActive(): boolean {
    return this.hasFocus() && this.isVisible();
  }
}

export const windowFocusService = new WindowFocusService();
