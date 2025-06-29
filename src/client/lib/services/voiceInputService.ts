import { writable, type Writable } from "svelte/store";
import type {
  VoiceInputState,
  VoiceInputConfig,
  VoiceTranscriptionResult,
  VoiceInputError,
  VoiceErrorCode,
  VoiceInputEvents,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from "../types/voiceInput";

class VoiceInputService {
  private recognition: SpeechRecognition | null = null;
  private isInitialized = false;
  private config: VoiceInputConfig;
  private events: Partial<VoiceInputEvents> = {};

  // Reactive state store
  public state: Writable<VoiceInputState> = writable({
    isRecording: false,
    isProcessing: false,
    isSupported: false,
    hasPermission: false,
    currentTranscript: "",
    finalTranscript: "",
    confidence: 0,
    error: null,
    language: "en-US",
  });

  constructor(config?: Partial<VoiceInputConfig>) {
    this.config = {
      language: "en-US",
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      ...config,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Check browser support
      const isSupported = this.checkBrowserSupport();
      this.updateState({ isSupported });

      if (!isSupported) {
        throw this.createError(
          "NOT_SUPPORTED",
          "Speech recognition is not supported in this browser"
        );
      }

      // Check microphone permission
      const hasPermission = await this.checkMicrophonePermission();
      this.updateState({ hasPermission });

      if (hasPermission) {
        this.setupSpeechRecognition();
      }

      this.isInitialized = true;
    } catch (error) {
      this.handleError(error as VoiceInputError);
    }
  }

  private checkBrowserSupport(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private async checkMicrophonePermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.warn("Microphone permission check failed:", error);
      return false;
    }
  }

  private setupSpeechRecognition(): void {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    if (this.config.grammars) {
      this.recognition.grammars = this.config.grammars;
    }

    // Set up event handlers
    this.recognition.onstart = () => {
      this.updateState({ isRecording: true, error: null });
      this.events.onStart?.();
    };

    this.recognition.onend = () => {
      this.updateState({ isRecording: false, isProcessing: false });
      this.events.onEnd?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.handleRecognitionError(event);
    };

    this.recognition.onnomatch = () => {
      this.updateState({
        error: "No speech was recognized. Please try again.",
        isProcessing: false,
      });
    };

    this.recognition.onspeechstart = () => {
      this.updateState({ isProcessing: true });
    };

    this.recognition.onspeechend = () => {
      this.updateState({ isProcessing: false });
    };
  }

  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    let interimTranscript = "";
    let finalTranscript = "";
    let maxConfidence = 0;
    let hasNewFinal = false;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0;

      if (result.isFinal) {
        finalTranscript += transcript;
        maxConfidence = Math.max(maxConfidence, confidence);
        hasNewFinal = true;
      } else {
        interimTranscript += transcript;
      }
    }

    // Update state with current transcription
    this.updateState({
      currentTranscript: interimTranscript,
      finalTranscript: this.state.finalTranscript + finalTranscript,
      confidence: maxConfidence,
      error: null,
    });

    // Create transcription result for interim updates
    if (interimTranscript) {
      const interimResult: VoiceTranscriptionResult = {
        originalText: interimTranscript,
        confidence: maxConfidence,
        isFinal: false,
        timestamp: Date.now(),
        alternatives: this.extractAlternatives(
          event.results,
          event.resultIndex
        ),
      };
      this.events.onResult?.(interimResult);
    }

    // Create transcription result for final text
    if (hasNewFinal && finalTranscript.trim()) {
      const finalResult: VoiceTranscriptionResult = {
        originalText: finalTranscript.trim(),
        confidence: maxConfidence,
        isFinal: true,
        timestamp: Date.now(),
        alternatives: this.extractAlternatives(
          event.results,
          event.resultIndex
        ),
      };
      this.events.onResult?.(finalResult);
    }
  }

  private extractAlternatives(
    results: SpeechRecognitionResultList,
    startIndex: number
  ): string[] {
    const alternatives: string[] = [];

    for (let i = startIndex; i < results.length; i++) {
      const result = results[i];
      for (
        let j = 1;
        j < result.length && j < this.config.maxAlternatives;
        j++
      ) {
        if (result[j] && result[j].transcript) {
          alternatives.push(result[j].transcript);
        }
      }
    }

    return alternatives;
  }

  private handleRecognitionError(event: SpeechRecognitionErrorEvent): void {
    let errorCode: VoiceErrorCode;
    let message: string;

    switch (event.error) {
      case "not-allowed":
        errorCode = "PERMISSION_DENIED";
        message =
          "Microphone access was denied. Please allow microphone access and try again.";
        this.updateState({ hasPermission: false });
        break;
      case "no-speech":
        errorCode = "RECOGNITION_ERROR";
        message = "No speech was detected. Please try speaking again.";
        break;
      case "audio-capture":
        errorCode = "MICROPHONE_NOT_FOUND";
        message =
          "No microphone was found. Please check your microphone connection.";
        break;
      case "network":
        errorCode = "NETWORK_ERROR";
        message = "Network error occurred during speech recognition.";
        break;
      case "aborted":
        errorCode = "RECOGNITION_ERROR";
        message = "Speech recognition was aborted.";
        break;
      default:
        errorCode = "RECOGNITION_ERROR";
        message = `Speech recognition error: ${event.error}`;
    }

    const error = this.createError(errorCode, message, {
      originalError: event,
    });
    this.handleError(error);
  }

  private createError(
    code: VoiceErrorCode,
    message: string,
    details?: any
  ): VoiceInputError {
    return {
      code,
      message,
      details,
      recoverable: code !== "NOT_SUPPORTED" && code !== "PERMISSION_DENIED",
    };
  }

  private handleError(error: VoiceInputError): void {
    this.updateState({
      error: error.message,
      isRecording: false,
      isProcessing: false,
    });
    this.events.onError?.(error);
  }

  private updateState(updates: Partial<VoiceInputState>): void {
    this.state.update((current) => ({ ...current, ...updates }));
  }

  // Public API methods
  public async startRecording(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.recognition) {
      throw this.createError(
        "NOT_SUPPORTED",
        "Speech recognition is not available"
      );
    }

    try {
      // Clear previous transcripts
      this.updateState({
        currentTranscript: "",
        finalTranscript: "",
        error: null,
      });

      this.recognition.start();
    } catch (error: any) {
      const voiceError = this.createError(
        "RECOGNITION_ERROR",
        "Failed to start recording",
        error
      );
      this.handleError(voiceError);
      throw voiceError;
    }
  }

  public stopRecording(): void {
    if (this.recognition && this.recognition) {
      this.recognition.stop();
    }
  }

  public abortRecording(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
  }

  public setLanguage(language: string): void {
    this.config.language = language;
    this.updateState({ language });

    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  public addEventListener(events: Partial<VoiceInputEvents>): void {
    this.events = { ...this.events, ...events };
  }

  public removeEventListener(eventType: keyof VoiceInputEvents): void {
    delete this.events[eventType];
  }

  public async requestPermission(): Promise<boolean> {
    try {
      const hasPermission = await this.checkMicrophonePermission();
      this.updateState({ hasPermission });
      this.events.onPermissionChange?.(hasPermission);

      if (hasPermission && !this.recognition) {
        this.setupSpeechRecognition();
      }

      return hasPermission;
    } catch (error) {
      return false;
    }
  }

  public isSupported(): boolean {
    return this.checkBrowserSupport();
  }

  public destroy(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    this.events = {};
    this.isInitialized = false;
  }
}

export const voiceInputService = new VoiceInputService();
