// Text Processing and NLP Utilities
import { NamedEntity, ExtractedInfo, UserPreference } from "../types/memory";

/**
 * Text processor class for NLP operations
 */
export class TextProcessor {
  constructor() {
    // No longer using natural library constructors
  }

  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .map((token) => token.toLowerCase().replace(/[^\w]/g, ""));
  }

  private stem(word: string): string {
    // Simple stemming rules
    word = word.toLowerCase();

    if (word.endsWith("ing") && word.length > 6) {
      word = word.slice(0, -3);
    } else if (word.endsWith("ed") && word.length > 5) {
      word = word.slice(0, -2);
    } else if (word.endsWith("er") && word.length > 5) {
      word = word.slice(0, -2);
    } else if (word.endsWith("ly") && word.length > 5) {
      word = word.slice(0, -2);
    } else if (word.endsWith("tion") && word.length > 7) {
      word = word.slice(0, -4);
    }

    return word;
  }

  /**
   * Analyze sentiment of text (-1 to 1 scale)
   */
  analyzeSentiment(text: string): number {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return 0;

    // Simple sentiment analysis using word lists
    const positiveWords = new Set([
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
      "love",
      "like",
      "happy",
      "pleased",
    ]);
    const negativeWords = new Set([
      "bad",
      "terrible",
      "awful",
      "horrible",
      "hate",
      "dislike",
      "sad",
      "angry",
      "disappointed",
      "upset",
    ]);

    let score = 0;
    tokens.forEach((token) => {
      if (positiveWords.has(token)) score += 1;
      if (negativeWords.has(token)) score -= 1;
    });

    return Math.max(-1, Math.min(1, score / tokens.length));
  }

  /**
   * Extract named entities from text
   */
  extractEntities(text: string): NamedEntity[] {
    const entities: NamedEntity[] = [];

    // Person names (capitalized words pattern)
    const personPattern = /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g;
    const personMatches: string[] = text.match(personPattern) || [];
    personMatches.forEach((match) => {
      entities.push({
        text: match,
        type: "PERSON" as const,
        confidence: 0.8,
      });
    });

    // Organizations
    const orgPattern =
      /\b[A-Z][a-zA-Z\s]+ (?:Inc|Corp|LLC|Ltd|Company|Organization|University|School|Hospital|Bank)\b/g;
    const orgMatches: string[] = text.match(orgPattern) || [];
    orgMatches.forEach((match) => {
      entities.push({
        text: match,
        type: "ORGANIZATION" as const,
        confidence: 0.7,
      });
    });

    // Locations
    const locationPattern =
      /\b[A-Z][a-z]+ (?:City|State|Country|Street|Avenue|Road|Boulevard|Drive|Lane)\b/g;
    const locationMatches: string[] = text.match(locationPattern) || [];
    locationMatches.forEach((match) => {
      entities.push({
        text: match,
        type: "LOCATION" as const,
        confidence: 0.7,
      });
    });

    // Dates
    const datePattern =
      /\b(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/g;
    const dateMatches: string[] = text.match(datePattern) || [];
    dateMatches.forEach((match) => {
      entities.push({
        text: match,
        type: "DATE" as const,
        confidence: 0.9,
      });
    });

    // Products/Concepts (capitalized terms)
    const conceptPattern = /\b[A-Z][a-zA-Z]{2,}\b/g;
    const conceptMatches: string[] = text.match(conceptPattern) || [];
    conceptMatches.forEach((match) => {
      if (!personMatches.includes(match) && !orgMatches.includes(match)) {
        entities.push({
          text: match,
          type: "CONCEPT" as const,
          confidence: 0.5,
        });
      }
    });

    return entities;
  }

  /**
   * Extract keywords using TF-IDF
   */
  extractKeywords(text: string, maxKeywords: number = 10): string[] {
    const tokens = this.tokenize(text);
    const filteredTokens = tokens.filter(
      (token) =>
        token.length > 2 && !this.isStopWord(token) && /^[a-zA-Z]+$/.test(token)
    );

    // Simple frequency-based keyword extraction
    const frequency: Record<string, number> = {};
    filteredTokens.forEach((token) => {
      const stemmed = this.stem(token);
      frequency[stemmed] = (frequency[stemmed] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Extract topics from text using simple clustering
   */
  extractTopics(text: string, maxTopics: number = 5): string[] {
    const keywords = this.extractKeywords(text, 20);
    const entities = this.extractEntities(text);

    const topics: string[] = [];

    // Add entity types as topics
    const entityTypes = [...new Set(entities.map((e) => e.type.toLowerCase()))];
    topics.push(...entityTypes);

    // Add top keywords as topics
    topics.push(...keywords.slice(0, maxTopics - entityTypes.length));

    return topics.slice(0, maxTopics);
  }

  /**
   * Extract facts from text
   */
  extractFacts(text: string): string[] {
    const facts: string[] = [];

    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();

      // Look for factual patterns
      if (this.isFactualSentence(trimmed)) {
        facts.push(trimmed);
      }
    });

    return facts;
  }

  /**
   * Extract user preferences from text
   */
  extractPreferences(text: string, userId: string): UserPreference[] {
    const preferences: UserPreference[] = [];
    const lowerText = text.toLowerCase();

    // Preference indicators
    const preferencePatterns = [
      {
        pattern: /i (?:like|love|prefer|enjoy|want) (.+?)(?:\.|,|$)/g,
        strength: 0.8,
      },
      {
        pattern: /i (?:dislike|hate|don't like|avoid) (.+?)(?:\.|,|$)/g,
        strength: 0.2,
      },
      { pattern: /my favorite (.+?) is (.+?)(?:\.|,|$)/g, strength: 0.9 },
      { pattern: /i usually (.+?)(?:\.|,|$)/g, strength: 0.6 },
      { pattern: /i always (.+?)(?:\.|,|$)/g, strength: 0.9 },
      { pattern: /i never (.+?)(?:\.|,|$)/g, strength: 0.1 },
    ];

    preferencePatterns.forEach(({ pattern, strength }) => {
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        const preference = match[1] || match[2];
        if (preference && preference.length > 3) {
          preferences.push({
            category: this.categorizePreference(preference),
            preference: preference.trim(),
            strength,
            source: "conversation",
            createdAt: new Date(),
          });
        }
      }
    });

    return preferences;
  }

  /**
   * Extract questions from text
   */
  extractQuestions(text: string): string[] {
    const questions: string[] = [];
    const sentences = text.split(/[.!?]+/);

    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (trimmed.includes("?") || this.isQuestionPattern(trimmed)) {
        questions.push(trimmed);
      }
    });

    return questions;
  }

  /**
   * Extract requests/commands from text
   */
  extractRequests(text: string): string[] {
    const requests: string[] = [];
    const lowerText = text.toLowerCase();

    const requestPatterns = [
      /(?:please|can you|could you|would you) (.+?)(?:\.|,|$)/g,
      /(?:help me|assist me|show me) (.+?)(?:\.|,|$)/g,
      /(?:create|make|build|generate) (.+?)(?:\.|,|$)/g,
      /(?:find|search|look for) (.+?)(?:\.|,|$)/g,
    ];

    requestPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        if (match[1] && match[1].length > 3) {
          requests.push(match[1].trim());
        }
      }
    });

    return requests;
  }

  /**
   * Extract emotional indicators from text
   */
  extractEmotions(text: string): string[] {
    const emotions: string[] = [];
    const lowerText = text.toLowerCase();

    const emotionKeywords = {
      happy: ["happy", "joy", "excited", "pleased", "delighted", "cheerful"],
      sad: ["sad", "depressed", "disappointed", "upset", "down", "blue"],
      angry: ["angry", "mad", "furious", "irritated", "annoyed", "frustrated"],
      anxious: [
        "anxious",
        "worried",
        "nervous",
        "stressed",
        "concerned",
        "uneasy",
      ],
      surprised: ["surprised", "shocked", "amazed", "astonished", "stunned"],
      confused: ["confused", "puzzled", "perplexed", "bewildered", "lost"],
    };

    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        emotions.push(emotion);
      }
    });

    return emotions;
  }

  /**
   * Comprehensive text analysis
   */
  analyzeText(text: string, userId?: string): ExtractedInfo {
    return {
      facts: this.extractFacts(text),
      preferences: userId ? this.extractPreferences(text, userId) : [],
      questions: this.extractQuestions(text),
      requests: this.extractRequests(text),
      emotions: this.extractEmotions(text),
      entities: this.extractEntities(text),
    };
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "among",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Check if sentence contains factual information
   */
  private isFactualSentence(sentence: string): boolean {
    const factualIndicators = [
      "is",
      "are",
      "was",
      "were",
      "has",
      "have",
      "had",
      "contains",
      "includes",
      "consists",
      "comprises",
      "located",
      "founded",
      "established",
      "created",
      "measures",
      "weighs",
      "costs",
      "equals",
    ];

    const lowerSentence = sentence.toLowerCase();
    return factualIndicators.some((indicator) =>
      lowerSentence.includes(indicator)
    );
  }

  /**
   * Check if text follows question patterns
   */
  private isQuestionPattern(text: string): boolean {
    const questionWords = [
      "what",
      "when",
      "where",
      "who",
      "why",
      "how",
      "which",
      "whose",
    ];
    const lowerText = text.toLowerCase();
    return questionWords.some((word) => lowerText.startsWith(word));
  }

  /**
   * Categorize user preferences
   */
  private categorizePreference(preference: string): string {
    const categories = {
      food: ["eat", "food", "meal", "restaurant", "cuisine", "dish"],
      music: ["music", "song", "artist", "band", "album", "genre"],
      technology: ["software", "app", "tool", "platform", "device", "tech"],
      work: ["work", "job", "career", "project", "task", "meeting"],
      entertainment: ["movie", "show", "game", "book", "video", "series"],
      lifestyle: ["exercise", "hobby", "activity", "sport", "travel"],
    };

    const lowerPreference = preference.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => lowerPreference.includes(keyword))) {
        return category;
      }
    }

    return "general";
  }
}
