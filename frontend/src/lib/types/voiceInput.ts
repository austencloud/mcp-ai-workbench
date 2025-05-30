export interface VoiceInputState {
  isRecording: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  hasPermission: boolean;
  currentTranscript: string;
  finalTranscript: string;
  confidence: number;
  error: string | null;
  language: string;
}

export interface VoiceInputConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: SpeechGrammarList;
}

export interface VoiceProcessingOptions {
  enableGrammarCorrection: boolean;
  enableContextCorrection: boolean;
  correctionSensitivity: 'low' | 'medium' | 'high';
  autoApplyCorrections: boolean;
  preserveUserIntent: boolean;
}

export interface VoiceTranscriptionResult {
  originalText: string;
  correctedText?: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: string[];
  timestamp: number;
  corrections?: VoiceCorrection[];
}

export interface VoiceCorrection {
  original: string;
  corrected: string;
  type: 'grammar' | 'spelling' | 'context' | 'punctuation';
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface VoiceInputError {
  code: VoiceErrorCode;
  message: string;
  details?: any;
  recoverable: boolean;
}

export enum VoiceErrorCode {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MICROPHONE_NOT_FOUND = 'MICROPHONE_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RECOGNITION_ERROR = 'RECOGNITION_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export interface VoiceInputEvents {
  onStart: () => void;
  onEnd: () => void;
  onResult: (result: VoiceTranscriptionResult) => void;
  onError: (error: VoiceInputError) => void;
  onPermissionChange: (hasPermission: boolean) => void;
  onSupportChange: (isSupported: boolean) => void;
}

export interface VoiceInputMetrics {
  sessionDuration: number;
  wordsTranscribed: number;
  correctionsApplied: number;
  userAcceptanceRate: number;
  averageConfidence: number;
  errorCount: number;
}

// Browser-specific interfaces for Web Speech API
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface WebSpeechAPI {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}

declare global {
  interface Window extends WebSpeechAPI {}
}
