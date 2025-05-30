// Semantic Memory Service
// Knowledge graph and conceptual relationships

import { PrismaClient } from "@prisma/client";
import {
  KnowledgeNode,
  KnowledgeRelationship,
  MemoryType,
} from "../types/memory";
import { TextProcessor } from "../utils/textProcessor";
import { generateMemoryId } from "../utils/memoryUtils";

export class SemanticMemoryService {
  private prisma: PrismaClient;
  private textProcessor: TextProcessor;
  private conceptGraph: Map<string, KnowledgeNode> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.textProcessor = new TextProcessor();
    this.initializeConceptGraph();
  }

  /**
   * Add a new concept to the knowledge graph
   */
  async addConcept(concept: string, description: string): Promise<string> {
    try {
      const conceptId = generateMemoryId();
      const normalizedConcept = this.normalizeConcept(concept);

      // Check if concept already exists
      const existing = await this.prisma.knowledgeNode.findUnique({
        where: { concept: normalizedConcept },
      });

      if (existing) {
        // Update existing concept
        await this.prisma.knowledgeNode.update({
          where: { id: existing.id },
          data: {
            description: description,
            lastVerified: new Date(),
          },
        });
        return existing.id;
      }

      // Create new concept
      const knowledgeNode: KnowledgeNode = {
        id: conceptId,
        concept: normalizedConcept,
        description,
        relationships: [],
        confidence: 0.8,
        sources: ["user_input"],
        lastVerified: new Date(),
      };

      await this.prisma.knowledgeNode.create({
        data: {
          id: conceptId,
          concept: normalizedConcept,
          description,
          confidence: knowledgeNode.confidence,
          sources: knowledgeNode.sources,
          lastVerified: knowledgeNode.lastVerified,
          relationships: JSON.stringify([]),
        },
      });

      // Add to in-memory graph
      this.conceptGraph.set(normalizedConcept, knowledgeNode);

      // Auto-discover relationships
      await this.discoverRelationships(conceptId);

      return conceptId;
    } catch (error) {
      console.error("Error adding concept:", error);
      throw error;
    }
  }

  /**
   * Link two concepts with a relationship
   */
  async linkConcepts(
    conceptA: string,
    conceptB: string,
    relationship: KnowledgeRelationship
  ): Promise<void> {
    try {
      const normalizedA = this.normalizeConcept(conceptA);
      const normalizedB = this.normalizeConcept(conceptB);

      // Get or create concepts
      const nodeA = await this.getOrCreateConcept(normalizedA);
      const nodeB = await this.getOrCreateConcept(normalizedB);

      // Add relationship to A
      const relationshipsA = [...nodeA.relationships];
      const existingRelIndex = relationshipsA.findIndex(
        (rel) => rel.targetId === nodeB.id && rel.type === relationship.type
      );

      if (existingRelIndex >= 0) {
        // Update existing relationship
        relationshipsA[existingRelIndex] = {
          ...relationship,
          targetId: nodeB.id,
        };
      } else {
        // Add new relationship
        relationshipsA.push({
          ...relationship,
          targetId: nodeB.id,
        });
      }

      await this.prisma.knowledgeNode.update({
        where: { id: nodeA.id },
        data: { relationships: JSON.stringify(relationshipsA) },
      });

      // Add bidirectional relationship if specified
      if (relationship.bidirectional) {
        const relationshipsB = [...nodeB.relationships];
        const reverseRelIndex = relationshipsB.findIndex(
          (rel) => rel.targetId === nodeA.id && rel.type === relationship.type
        );

        if (reverseRelIndex >= 0) {
          relationshipsB[reverseRelIndex] = {
            ...relationship,
            targetId: nodeA.id,
          };
        } else {
          relationshipsB.push({
            ...relationship,
            targetId: nodeA.id,
          });
        }

        await this.prisma.knowledgeNode.update({
          where: { id: nodeB.id },
          data: { relationships: JSON.stringify(relationshipsB) },
        });
      }

      // Update in-memory graph
      await this.refreshConceptGraph();
    } catch (error) {
      console.error("Error linking concepts:", error);
      throw error;
    }
  }

  /**
   * Find related concepts
   */
  async findRelatedConcepts(
    concept: string,
    maxDepth: number = 2
  ): Promise<KnowledgeNode[]> {
    try {
      const normalizedConcept = this.normalizeConcept(concept);
      const startNode = this.conceptGraph.get(normalizedConcept);

      if (!startNode) {
        return [];
      }

      const visited = new Set<string>();
      const related: KnowledgeNode[] = [];

      await this.traverseGraph(startNode, maxDepth, visited, related);

      return related.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error("Error finding related concepts:", error);
      return [];
    }
  }

  /**
   * Infer new knowledge based on existing relationships
   */
  async inferKnowledge(premise: string): Promise<string[]> {
    try {
      const inferences: string[] = [];
      const entities = this.textProcessor.extractEntities(premise);

      for (const entity of entities) {
        const relatedConcepts = await this.findRelatedConcepts(entity.text, 2);

        for (const concept of relatedConcepts) {
          // Apply inference rules
          const conceptRelationships = concept.relationships;

          for (const rel of conceptRelationships) {
            const targetConcept = await this.getConceptById(rel.targetId);
            if (!targetConcept) continue;

            switch (rel.type) {
              case "IS_A":
                inferences.push(
                  `${entity.text} is a type of ${targetConcept.concept}`
                );
                break;
              case "PART_OF":
                inferences.push(
                  `${entity.text} is part of ${targetConcept.concept}`
                );
                break;
              case "CAUSES":
                inferences.push(
                  `${entity.text} may cause ${targetConcept.concept}`
                );
                break;
              case "IMPLIES":
                inferences.push(
                  `${entity.text} implies ${targetConcept.concept}`
                );
                break;
            }
          }
        }
      }

      return [...new Set(inferences)].slice(0, 10);
    } catch (error) {
      console.error("Error inferring knowledge:", error);
      return [];
    }
  }

  /**
   * Verify a fact against the knowledge graph
   */
  async verifyFact(statement: string): Promise<{
    verified: boolean;
    confidence: number;
    sources: string[];
  }> {
    try {
      const entities = this.textProcessor.extractEntities(statement);
      let totalConfidence = 0;
      let verificationCount = 0;
      const sources: string[] = [];

      for (const entity of entities) {
        const concept = this.conceptGraph.get(
          this.normalizeConcept(entity.text)
        );
        if (concept) {
          totalConfidence += concept.confidence;
          verificationCount++;
          sources.push(...concept.sources);
        }
      }

      const averageConfidence =
        verificationCount > 0 ? totalConfidence / verificationCount : 0;
      const verified = averageConfidence > 0.6;

      return {
        verified,
        confidence: averageConfidence,
        sources: [...new Set(sources)],
      };
    } catch (error) {
      console.error("Error verifying fact:", error);
      return {
        verified: false,
        confidence: 0,
        sources: [],
      };
    }
  }

  /**
   * Expand knowledge about a topic
   */
  async expandKnowledge(topic: string): Promise<void> {
    try {
      const relatedConcepts = await this.findRelatedConcepts(topic, 3);

      // This would typically integrate with external knowledge sources
      // For now, we'll create some basic relationships based on text analysis

      for (const concept of relatedConcepts) {
        await this.discoverRelationships(concept.id);
      }
    } catch (error) {
      console.error("Error expanding knowledge:", error);
    }
  }

  /**
   * Initialize the concept graph from database
   */
  private async initializeConceptGraph(): Promise<void> {
    try {
      const concepts = await this.prisma.knowledgeNode.findMany();

      for (const concept of concepts) {
        const relationships = this.parseRelationships(concept.relationships);

        const knowledgeNode: KnowledgeNode = {
          id: concept.id,
          concept: concept.concept,
          description: concept.description,
          relationships,
          confidence: concept.confidence,
          sources: concept.sources as string[],
          lastVerified: concept.lastVerified,
        };

        this.conceptGraph.set(concept.concept, knowledgeNode);
      }
    } catch (error) {
      console.error("Error initializing concept graph:", error);
    }
  }

  /**
   * Refresh the in-memory concept graph
   */
  private async refreshConceptGraph(): Promise<void> {
    this.conceptGraph.clear();
    await this.initializeConceptGraph();
  }

  /**
   * Normalize concept name
   */
  private normalizeConcept(concept: string): string {
    return concept.toLowerCase().trim().replace(/\s+/g, "_");
  }

  /**
   * Get or create a concept
   */
  private async getOrCreateConcept(concept: string): Promise<KnowledgeNode> {
    let node = this.conceptGraph.get(concept);

    if (!node) {
      const conceptId = await this.addConcept(
        concept,
        `Auto-generated concept: ${concept}`
      );
      const dbNode = await this.prisma.knowledgeNode.findUnique({
        where: { id: conceptId },
      });

      if (dbNode) {
        const relationships = this.parseRelationships(dbNode.relationships);

        node = {
          id: dbNode.id,
          concept: dbNode.concept,
          description: dbNode.description,
          relationships,
          confidence: dbNode.confidence,
          sources: dbNode.sources as string[],
          lastVerified: dbNode.lastVerified,
        };
        this.conceptGraph.set(concept, node);
      }
    }

    return node!;
  }

  /**
   * Get concept by ID
   */
  private async getConceptById(id: string): Promise<KnowledgeNode | null> {
    try {
      const concept = await this.prisma.knowledgeNode.findUnique({
        where: { id },
      });

      if (!concept) return null;

      const relationships = this.parseRelationships(concept.relationships);

      return {
        id: concept.id,
        concept: concept.concept,
        description: concept.description,
        relationships,
        confidence: concept.confidence,
        sources: concept.sources as string[],
        lastVerified: concept.lastVerified,
      };
    } catch (error) {
      console.error("Error getting concept by ID:", error);
      return null;
    }
  }

  /**
   * Traverse the knowledge graph to find related concepts
   */
  private async traverseGraph(
    node: KnowledgeNode,
    depth: number,
    visited: Set<string>,
    related: KnowledgeNode[]
  ): Promise<void> {
    if (depth <= 0 || visited.has(node.id)) {
      return;
    }

    visited.add(node.id);
    related.push(node);

    for (const relationship of node.relationships) {
      const targetNode = await this.getConceptById(relationship.targetId);
      if (targetNode && !visited.has(targetNode.id)) {
        await this.traverseGraph(targetNode, depth - 1, visited, related);
      }
    }
  }

  /**
   * Discover relationships for a concept
   */
  private async discoverRelationships(conceptId: string): Promise<void> {
    try {
      const concept = await this.getConceptById(conceptId);
      if (!concept) return;

      // Find potential relationships based on text analysis
      const keywords = this.textProcessor.extractKeywords(concept.description);
      const entities = this.textProcessor.extractEntities(concept.description);

      // Look for other concepts that might be related
      const allConcepts = Array.from(this.conceptGraph.values());

      for (const otherConcept of allConcepts) {
        if (otherConcept.id === conceptId) continue;

        const similarity = this.calculateConceptSimilarity(
          concept,
          otherConcept
        );

        if (similarity > 0.7) {
          // Create a RELATED_TO relationship
          const relationship: KnowledgeRelationship = {
            targetId: otherConcept.id,
            type: "RELATED_TO",
            strength: similarity,
            bidirectional: true,
          };

          await this.linkConcepts(
            concept.concept,
            otherConcept.concept,
            relationship
          );
        }
      }
    } catch (error) {
      console.error("Error discovering relationships:", error);
    }
  }

  /**
   * Calculate similarity between two concepts
   */
  private calculateConceptSimilarity(
    conceptA: KnowledgeNode,
    conceptB: KnowledgeNode
  ): number {
    const keywordsA = this.textProcessor.extractKeywords(conceptA.description);
    const keywordsB = this.textProcessor.extractKeywords(conceptB.description);

    const intersection = keywordsA.filter((k) => keywordsB.includes(k));
    const union = [...new Set([...keywordsA, ...keywordsB])];

    return union.length > 0 ? intersection.length / union.length : 0;
  }

  /**
   * Build the complete concept graph
   */
  private async buildConceptGraph(): Promise<void> {
    await this.refreshConceptGraph();

    // Discover relationships between all concepts
    const concepts = Array.from(this.conceptGraph.values());

    for (const concept of concepts) {
      await this.discoverRelationships(concept.id);
    }
  }

  /**
   * Detect contradictions in the knowledge graph
   */
  private async detectContradictions(): Promise<void> {
    try {
      const concepts = Array.from(this.conceptGraph.values());

      for (const concept of concepts) {
        for (const relationship of concept.relationships) {
          if (relationship.type === "CONTRADICTS") {
            const targetConcept = await this.getConceptById(
              relationship.targetId
            );
            if (targetConcept) {
              console.warn(
                `Contradiction detected: ${concept.concept} contradicts ${targetConcept.concept}`
              );

              // Lower confidence of both concepts
              await this.prisma.knowledgeNode.update({
                where: { id: concept.id },
                data: { confidence: Math.max(0.1, concept.confidence * 0.8) },
              });

              await this.prisma.knowledgeNode.update({
                where: { id: targetConcept.id },
                data: {
                  confidence: Math.max(0.1, targetConcept.confidence * 0.8),
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error detecting contradictions:", error);
    }
  }

  /**
   * Get knowledge graph statistics
   */
  async getGraphStats(): Promise<{
    totalConcepts: number;
    totalRelationships: number;
    averageConnections: number;
    topConcepts: KnowledgeNode[];
  }> {
    try {
      const concepts = Array.from(this.conceptGraph.values());
      const totalConcepts = concepts.length;
      const totalRelationships = concepts.reduce(
        (sum, concept) => sum + concept.relationships.length,
        0
      );
      const averageConnections =
        totalConcepts > 0 ? totalRelationships / totalConcepts : 0;

      const topConcepts = concepts
        .sort((a, b) => b.relationships.length - a.relationships.length)
        .slice(0, 10);

      return {
        totalConcepts,
        totalRelationships,
        averageConnections,
        topConcepts,
      };
    } catch (error) {
      console.error("Error getting graph stats:", error);
      return {
        totalConcepts: 0,
        totalRelationships: 0,
        averageConnections: 0,
        topConcepts: [],
      };
    }
  }

  /**
   * Parse relationships from database format
   */
  private parseRelationships(relationships: unknown): KnowledgeRelationship[] {
    if (Array.isArray(relationships)) {
      return relationships as KnowledgeRelationship[];
    }

    try {
      return JSON.parse(relationships as string) as KnowledgeRelationship[];
    } catch {
      return [];
    }
  }
}
