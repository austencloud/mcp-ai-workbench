// Web browsing related shared types

export interface WebSearchQuery {
  query: string;
  maxResults?: number;
  language?: string;
  region?: string;
  timeRange?: TimeRange;
  safeSearch?: boolean;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
  publishedDate?: Date;
  source: string;
  relevanceScore: number;
}

export interface WebPageContent {
  url: string;
  title: string;
  content: string;
  metadata: PageMetadata;
  extractedData: ExtractedData;
  screenshots?: string[];
}

export interface PageMetadata {
  description?: string;
  keywords?: string[];
  author?: string;
  publishedDate?: Date;
  modifiedDate?: Date;
  language?: string;
  charset?: string;
  contentType?: string;
  wordCount?: number;
}

export interface ExtractedData {
  headings: Heading[];
  links: Link[];
  images: Image[];
  tables: Table[];
  forms: Form[];
  scripts: string[];
  styles: string[];
}

export interface Heading {
  level: number;
  text: string;
  id?: string;
}

export interface Link {
  text: string;
  url: string;
  type: 'internal' | 'external';
  title?: string;
}

export interface Image {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface Table {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface Form {
  action: string;
  method: string;
  fields: FormField[];
}

export interface FormField {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  options?: string[];
}

export interface WebScrapingConfig {
  waitForSelector?: string;
  timeout?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  javascript?: boolean;
  images?: boolean;
  css?: boolean;
  maxDepth?: number;
  followRedirects?: boolean;
}

export interface WebAnalysisResult {
  url: string;
  summary: string;
  keyPoints: string[];
  sentiment: SentimentAnalysis;
  topics: Topic[];
  entities: Entity[];
  readabilityScore: number;
  trustScore: number;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface Topic {
  name: string;
  relevance: number;
  keywords: string[];
}

export interface Entity {
  text: string;
  type: EntityType;
  confidence: number;
  description?: string;
}

export enum EntityType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  DATE = 'date',
  MONEY = 'money',
  PERCENTAGE = 'percentage',
  PRODUCT = 'product',
  EVENT = 'event'
}

export enum TimeRange {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  ALL = 'all'
}

export interface WebBrowsingSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  pages: WebPageVisit[];
  searchQueries: WebSearchQuery[];
  totalTime: number;
  summary?: string;
}

export interface WebPageVisit {
  url: string;
  title: string;
  visitTime: Date;
  duration: number;
  actions: PageAction[];
}

export interface PageAction {
  type: ActionType;
  timestamp: Date;
  details: any;
}

export enum ActionType {
  CLICK = 'click',
  SCROLL = 'scroll',
  TYPE = 'type',
  SCREENSHOT = 'screenshot',
  EXTRACT = 'extract',
  ANALYZE = 'analyze'
}
