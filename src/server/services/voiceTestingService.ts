import { VoiceProcessingService } from './voiceProcessingService';
import { AIProviderService } from './aiProviderService';
import type { VoiceProcessingRequest, VoiceProcessingResponse } from './voiceProcessingService';

export interface VoiceTestCase {
  id: string;
  name: string;
  description: string;
  input: string;
  expectedImprovements: string[];
  category: 'punctuation' | 'grammar' | 'filler_words' | 'capitalization' | 'technical' | 'complex' | 'speed_clarity';
  sensitivity: 'low' | 'medium' | 'high';
}

export interface VoiceTestResult {
  testCase: VoiceTestCase;
  result: VoiceProcessingResponse;
  passed: boolean;
  score: number;
  feedback: string[];
  processingTime: number;
}

export interface VoiceTestSuite {
  name: string;
  description: string;
  testCases: VoiceTestCase[];
}

export class VoiceTestingService {
  private voiceProcessor: VoiceProcessingService;

  constructor() {
    const aiProvider = new AIProviderService();
    this.voiceProcessor = new VoiceProcessingService(aiProvider);
  }

  /**
   * Get comprehensive test suites for voice processing
   */
  public getTestSuites(): VoiceTestSuite[] {
    return [
      {
        name: 'Punctuation and Capitalization',
        description: 'Tests for proper punctuation and capitalization handling',
        testCases: [
          {
            id: 'punct_001',
            name: 'Basic Sentence Structure',
            description: 'Simple sentence without punctuation',
            input: 'hello world this is a test',
            expectedImprovements: ['capitalization', 'punctuation'],
            category: 'punctuation',
            sensitivity: 'medium'
          },
          {
            id: 'punct_002',
            name: 'Question Format',
            description: 'Question without question mark',
            input: 'what time is it right now',
            expectedImprovements: ['capitalization', 'question_mark'],
            category: 'punctuation',
            sensitivity: 'medium'
          },
          {
            id: 'punct_003',
            name: 'Multiple Sentences',
            description: 'Run-on sentences needing separation',
            input: 'i need to send an email to my boss about the meeting tomorrow then i have to prepare the presentation slides',
            expectedImprovements: ['sentence_separation', 'capitalization', 'punctuation'],
            category: 'punctuation',
            sensitivity: 'medium'
          },
          {
            id: 'punct_004',
            name: 'Exclamation',
            description: 'Excited statement needing exclamation',
            input: 'thats amazing news congratulations',
            expectedImprovements: ['capitalization', 'exclamation_mark', 'apostrophe'],
            category: 'punctuation',
            sensitivity: 'medium'
          }
        ]
      },
      {
        name: 'Grammar and Filler Words',
        description: 'Tests for grammar correction and filler word removal',
        testCases: [
          {
            id: 'gram_001',
            name: 'Filler Words Removal',
            description: 'Text with common filler words',
            input: 'um so like i was thinking you know that we should uh maybe consider this option',
            expectedImprovements: ['filler_removal', 'capitalization', 'punctuation'],
            category: 'filler_words',
            sensitivity: 'medium'
          },
          {
            id: 'gram_002',
            name: 'Subject-Verb Agreement',
            description: 'Incorrect subject-verb agreement',
            input: 'the team are working on the project and they is making good progress',
            expectedImprovements: ['subject_verb_agreement', 'capitalization', 'punctuation'],
            category: 'grammar',
            sensitivity: 'medium'
          },
          {
            id: 'gram_003',
            name: 'Tense Consistency',
            description: 'Mixed tenses in sentence',
            input: 'yesterday i go to the store and bought some groceries',
            expectedImprovements: ['tense_consistency', 'capitalization', 'punctuation'],
            category: 'grammar',
            sensitivity: 'medium'
          }
        ]
      },
      {
        name: 'Technical and Domain-Specific',
        description: 'Tests for technical terminology and domain-specific language',
        testCases: [
          {
            id: 'tech_001',
            name: 'Programming Terms',
            description: 'Technical programming vocabulary',
            input: 'we need to refactor the javascript code and implement the api endpoints using typescript',
            expectedImprovements: ['capitalization', 'punctuation', 'technical_terms'],
            category: 'technical',
            sensitivity: 'medium'
          },
          {
            id: 'tech_002',
            name: 'Business Terminology',
            description: 'Business and corporate language',
            input: 'the quarterly revenue exceeded our kpi targets and the roi looks promising',
            expectedImprovements: ['capitalization', 'punctuation', 'acronym_formatting'],
            category: 'technical',
            sensitivity: 'medium'
          },
          {
            id: 'tech_003',
            name: 'Medical Terms',
            description: 'Medical and healthcare terminology',
            input: 'the patient shows symptoms of hypertension and needs ecg monitoring',
            expectedImprovements: ['capitalization', 'punctuation', 'medical_terms'],
            category: 'technical',
            sensitivity: 'medium'
          }
        ]
      },
      {
        name: 'Complex Sentences',
        description: 'Tests for complex sentence structures and multiple clauses',
        testCases: [
          {
            id: 'complex_001',
            name: 'Multiple Clauses',
            description: 'Sentence with multiple dependent clauses',
            input: 'when i finish this project which should be done by friday i will start working on the next assignment that was given to me last week',
            expectedImprovements: ['comma_placement', 'capitalization', 'punctuation', 'clause_separation'],
            category: 'complex',
            sensitivity: 'high'
          },
          {
            id: 'complex_002',
            name: 'Conditional Statements',
            description: 'Complex conditional logic',
            input: 'if the weather is good tomorrow and if i dont have any meetings scheduled then i might go to the park',
            expectedImprovements: ['capitalization', 'punctuation', 'apostrophe', 'conditional_structure'],
            category: 'complex',
            sensitivity: 'high'
          }
        ]
      },
      {
        name: 'Sensitivity Level Testing',
        description: 'Tests for different correction sensitivity levels',
        testCases: [
          {
            id: 'sens_001_low',
            name: 'Low Sensitivity - Casual Speech',
            description: 'Casual speech that should preserve informal tone',
            input: 'hey whats up gonna grab some coffee later wanna come',
            expectedImprovements: ['basic_punctuation', 'minimal_capitalization'],
            category: 'speed_clarity',
            sensitivity: 'low'
          },
          {
            id: 'sens_001_high',
            name: 'High Sensitivity - Same Input',
            description: 'Same input with high sensitivity for formal output',
            input: 'hey whats up gonna grab some coffee later wanna come',
            expectedImprovements: ['formal_language', 'complete_sentences', 'professional_tone'],
            category: 'speed_clarity',
            sensitivity: 'high'
          }
        ]
      }
    ];
  }

  /**
   * Run a single test case
   */
  public async runTestCase(testCase: VoiceTestCase): Promise<VoiceTestResult> {
    const startTime = Date.now();

    const request: VoiceProcessingRequest = {
      originalText: testCase.input,
      options: {
        enableGrammarCorrection: true,
        enableContextCorrection: true,
        correctionSensitivity: testCase.sensitivity,
        autoApplyCorrections: false,
        preserveUserIntent: true
      }
    };

    const result = await this.voiceProcessor.processVoiceTranscription(request);
    const processingTime = Date.now() - startTime;

    const evaluation = this.evaluateResult(testCase, result);

    return {
      testCase,
      result,
      passed: evaluation.passed,
      score: evaluation.score,
      feedback: evaluation.feedback,
      processingTime
    };
  }

  /**
   * Run all test cases in a test suite
   */
  public async runTestSuite(testSuite: VoiceTestSuite): Promise<VoiceTestResult[]> {
    const results: VoiceTestResult[] = [];

    for (const testCase of testSuite.testCases) {
      try {
        const result = await this.runTestCase(testCase);
        results.push(result);
      } catch (error) {
        results.push({
          testCase,
          result: {
            correctedText: testCase.input,
            corrections: [],
            confidence: 0,
            processingTime: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          passed: false,
          score: 0,
          feedback: [`Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          processingTime: 0
        });
      }
    }

    return results;
  }

  /**
   * Run all test suites
   */
  public async runAllTests(): Promise<{ [suiteName: string]: VoiceTestResult[] }> {
    const testSuites = this.getTestSuites();
    const results: { [suiteName: string]: VoiceTestResult[] } = {};

    for (const testSuite of testSuites) {
      results[testSuite.name] = await this.runTestSuite(testSuite);
    }

    return results;
  }

  /**
   * Evaluate test result against expected improvements
   */
  private evaluateResult(testCase: VoiceTestCase, result: VoiceProcessingResponse): {
    passed: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;
    const maxScore = 100;

    if (!result.success) {
      return {
        passed: false,
        score: 0,
        feedback: ['Processing failed: ' + (result.error || 'Unknown error')]
      };
    }

    // Check if text was actually improved
    if (result.correctedText === testCase.input) {
      feedback.push('No corrections were applied');
      score -= 20;
    } else {
      feedback.push('Text was modified');
      score += 20;
    }

    // Check for basic improvements based on expected improvements
    for (const improvement of testCase.expectedImprovements) {
      const hasImprovement = this.checkImprovement(testCase.input, result.correctedText, improvement);
      if (hasImprovement) {
        feedback.push(`✓ ${improvement} improvement detected`);
        score += 20;
      } else {
        feedback.push(`✗ ${improvement} improvement missing`);
        score -= 10;
      }
    }

    // Check for proper sentence structure
    if (this.hasProperSentenceStructure(result.correctedText)) {
      feedback.push('✓ Proper sentence structure');
      score += 10;
    } else {
      feedback.push('✗ Poor sentence structure');
      score -= 10;
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(maxScore, score));
    const passed = score >= 60; // 60% threshold for passing

    return { passed, score, feedback };
  }

  /**
   * Check for specific improvements in the corrected text
   */
  private checkImprovement(original: string, corrected: string, improvement: string): boolean {
    switch (improvement) {
      case 'capitalization':
        return corrected.charAt(0).toUpperCase() === corrected.charAt(0) && 
               original.charAt(0).toLowerCase() === original.charAt(0);
      
      case 'punctuation':
        return /[.!?]$/.test(corrected) && !/[.!?]$/.test(original);
      
      case 'question_mark':
        return corrected.includes('?') && !original.includes('?');
      
      case 'exclamation_mark':
        return corrected.includes('!') && !original.includes('!');
      
      case 'filler_removal':
        const fillerWords = ['um', 'uh', 'like', 'you know', 'so'];
        return fillerWords.some(filler => 
          original.toLowerCase().includes(filler) && 
          !corrected.toLowerCase().includes(filler)
        );
      
      case 'sentence_separation':
        return corrected.split('.').length > original.split('.').length;
      
      default:
        return true; // Assume improvement exists for unknown types
    }
  }

  /**
   * Check if text has proper sentence structure
   */
  private hasProperSentenceStructure(text: string): boolean {
    // Basic checks for proper sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length === 0) continue;
      
      // Check if sentence starts with capital letter
      if (trimmed.charAt(0) !== trimmed.charAt(0).toUpperCase()) {
        return false;
      }
    }
    
    // Check if text ends with proper punctuation
    return /[.!?]$/.test(text.trim());
  }
}
