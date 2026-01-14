/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimensions must match: ${vecA.length} vs ${vecB.length}`);
  }

  if (vecA.length === 0) {
    return 0;
  }

  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  // Calculate magnitudes
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vecA.length; i++) {
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  // Cosine similarity
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate semantic similarity score between two embeddings
 * Returns a value between 0 and 1 (normalized from cosine similarity)
 */
export function semanticSimilarity(vecA: number[], vecB: number[]): number {
  const cosine = cosineSimilarity(vecA, vecB);
  // Normalize from [-1, 1] to [0, 1]
  return (cosine + 1) / 2;
}

/**
 * Calculate cosine similarity score between two embeddings
 * Returns a value from 0 to 100 (0-1 normalized and multiplied by 100)
 */
export function calculateEmbeddingScore(
  candidateEmbedding: number[] | null,
  jobEmbedding: number[] | null
): number {
  if (!candidateEmbedding || !jobEmbedding) {
    return 0;
  }

  try {
    const similarity = semanticSimilarity(candidateEmbedding, jobEmbedding);
    // Convert from 0-1 to 0-100
    return similarity * 100;
  } catch (error) {
    console.error('Error calculating embedding score:', error);
    return 0;
  }
}

/**
 * Calculate title score for matching (deprecated - use calculateEmbeddingScore)
 * Formula: title_score = 100 * semantic_similarity(candidate_title_vector, job_title_vector)
 */
export function calculateTitleScore(
  candidateTitleEmbedding: number[] | null,
  jobTitleEmbedding: number[] | null
): number {
  return calculateEmbeddingScore(candidateTitleEmbedding, jobTitleEmbedding);
}


