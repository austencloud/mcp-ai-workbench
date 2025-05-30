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
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  language?: string;
  grammars?: any; // Changed from SpeechGrammarList to any for compatibility
}

export interface VoiceProcessingOptions {
  enableGrammarCorrection: boolean;
  enableContextCorrection: boolean;
  correctionSensitivity: "low" | "medium" | "high";
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
  type: "grammar" | "spelling" | "context" | "punctuation";
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface VoiceProfile {
  userId: string;
  speechPatterns: SpeechPattern[];
  vocabularyPreferences: VocabularyPreference[];
  correctionHistory: CorrectionHistory[];
  contextModels: ContextModel[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SpeechPattern {
  pattern: string;
  frequency: number;
  context: string[];
  accuracy: number;
}

export interface VocabularyPreference {
  term: string;
  preferredForm: string;
  domain: string;
  frequency: number;
}

export interface CorrectionHistory {
  original: string;
  corrected: string;
  userAccepted: boolean;
  timestamp: Date;
  context: string;
}

export interface ContextModel {
  domain: string;
  keywords: string[];
  phrases: string[];
  grammarRules: string[];
  weight: number;
}

export interface VoiceInputError {
  code: VoiceErrorCode;
  message: string;
  details?: any;
  recoverable: boolean;
}

export enum VoiceErrorCode {
  NOT_SUPPORTED = "NOT_SUPPORTED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  MICROPHONE_NOT_FOUND = "MICROPHONE_NOT_FOUND",
  NETWORK_ERROR = "NETWORK_ERROR",
  RECOGNITION_ERROR = "RECOGNITION_ERROR",
  PROCESSING_ERROR = "PROCESSING_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
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

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}

export interface VoiceInputService {
  isSupported(): boolean;
  startListening(config?: VoiceInputConfig): Promise<void>;
  stopListening(): void;
  onResult(callback: (result: VoiceRecognitionResult) => void): void;
  onError(callback: (error: string) => void): void;
  onEnd(callback: () => void): void;
}
