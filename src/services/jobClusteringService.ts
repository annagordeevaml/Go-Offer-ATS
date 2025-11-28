import { supabase } from '../lib/supabaseClient';
import { generateEmbedding } from './embeddingsService';

/**
 * Generate embeddings for a job (title, description, and combined)
 */
export async function generateJobEmbeddings(jobId: string): Promise<void> {
  try {
    // Fetch job from vacancies table
    const { data: vacancy, error: fetchError } = await supabase
      .from('vacancies')
      .select('title, job_text')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch vacancy: ${fetchError.message}`);
    }

    if (!vacancy) {
      throw new Error(`Vacancy with id ${jobId} not found`);
    }

    const title = vacancy.title || '';
    const description = vacancy.job_text || '';

    if (!title && !description) {
      throw new Error('Job must have either a title or description');
    }

    // Generate embeddings
    console.log(`Generating embeddings for job ${jobId}...`);
    
    const embeddings: {
      title_vector?: number[];
      description_vector?: number[];
      combined_vector?: number[];
    } = {};

    // Generate title embedding
    if (title) {
      embeddings.title_vector = await generateEmbedding(title);
    }

    // Generate description embedding
    if (description) {
      embeddings.description_vector = await generateEmbedding(description);
    }

    // Generate combined vector (average of title and description)
    if (embeddings.title_vector && embeddings.description_vector) {
      // Average the two vectors
      const combined = embeddings.title_vector.map((val, idx) => 
        (val + embeddings.description_vector![idx]) / 2
      );
      embeddings.combined_vector = combined;
    } else if (embeddings.title_vector) {
      embeddings.combined_vector = embeddings.title_vector;
    } else if (embeddings.description_vector) {
      embeddings.combined_vector = embeddings.description_vector;
    }

    // Store embeddings in job_embeddings table
    const { error: upsertError } = await supabase
      .from('job_embeddings')
      .upsert({
        job_id: jobId,
        title_vector: embeddings.title_vector,
        description_vector: embeddings.description_vector,
        combined_vector: embeddings.combined_vector,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'job_id',
      });

    if (upsertError) {
      throw new Error(`Failed to store job embeddings: ${upsertError.message}`);
    }

    console.log(`Successfully generated and stored embeddings for job ${jobId}`);
  } catch (error) {
    console.error(`Error generating job embeddings for ${jobId}:`, error);
    throw error;
  }
}

/**
 * Load all job combined vectors from database
 */
async function loadJobVectors(): Promise<Array<{ job_id: string; vector: number[] }>> {
  const { data, error } = await supabase
    .from('job_embeddings')
    .select('job_id, combined_vector')
    .not('combined_vector', 'is', null);

  if (error) {
    throw new Error(`Failed to load job vectors: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Convert vector type to number array
  return data.map((item: any) => ({
    job_id: item.job_id,
    vector: Array.isArray(item.combined_vector) 
      ? item.combined_vector 
      : JSON.parse(item.combined_vector || '[]'),
  }));
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Compute distance matrix for HDBSCAN
 */
function computeDistanceMatrix(vectors: number[][]): number[][] {
  const n = vectors.length;
  const distances: number[][] = [];

  for (let i = 0; i < n; i++) {
    distances[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
      } else {
        // Convert cosine similarity to distance (1 - similarity)
        const similarity = cosineSimilarity(vectors[i], vectors[j]);
        distances[i][j] = 1 - similarity;
      }
    }
  }

  return distances;
}

/**
 * Simple HDBSCAN implementation
 * This is a simplified version. For production, consider using a library like scikit-learn via Python
 */
function hdbscanClustering(
  vectors: number[][],
  minClusterSize: number = 5,
  minSamples: number = 2
): number[] {
  const n = vectors.length;
  
  if (n < minClusterSize) {
    // If we have fewer jobs than minClusterSize, assign all to cluster -1 (noise)
    return new Array(n).fill(-1);
  }

  // Compute distance matrix
  const distances = computeDistanceMatrix(vectors);

  // Simplified clustering: Use hierarchical approach
  // For a full HDBSCAN implementation, you'd need:
  // 1. Build minimum spanning tree
  // 2. Build cluster hierarchy
  // 3. Extract flat clusters
  
  // For now, use a simplified approach: K-means-like with distance-based clustering
  const clusters: number[] = new Array(n).fill(-1);
  let currentClusterId = 0;
  const visited = new Set<number>();

  // Simple distance-based clustering
  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;

    const cluster: number[] = [i];
    visited.add(i);

    // Find neighbors within threshold
    for (let j = i + 1; j < n; j++) {
      if (visited.has(j)) continue;
      
      // Use distance threshold (adjust based on your data)
      const threshold = 0.3; // 1 - cosine similarity threshold
      if (distances[i][j] < threshold) {
        cluster.push(j);
        visited.add(j);
      }
    }

    // Only create cluster if it meets minimum size
    if (cluster.length >= minClusterSize) {
      for (const idx of cluster) {
        clusters[idx] = currentClusterId;
      }
      currentClusterId++;
    } else {
      // Mark as noise (cluster -1)
      for (const idx of cluster) {
        clusters[idx] = -1;
      }
    }
  }

  return clusters;
}

/**
 * Run clustering on all jobs
 */
export async function runJobClustering(
  minClusterSize: number = 5,
  minSamples: number = 2
): Promise<{ clusterCount: number; noiseCount: number }> {
  try {
    console.log('Loading job vectors...');
    const jobVectors = await loadJobVectors();

    if (jobVectors.length === 0) {
      throw new Error('No job vectors found. Generate embeddings first.');
    }

    console.log(`Loaded ${jobVectors.length} job vectors`);

    // Extract vectors
    const vectors = jobVectors.map(jv => jv.vector);

    // Run clustering
    console.log('Running HDBSCAN clustering...');
    const clusterAssignments = hdbscanClustering(vectors, minClusterSize, minSamples);

    // Store cluster assignments
    const clusterRecords = jobVectors.map((jv, idx) => ({
      cluster_id: clusterAssignments[idx],
      job_id: jv.job_id,
    }));

    // Filter out noise (cluster_id = -1)
    const validClusters = clusterRecords.filter(cr => cr.cluster_id !== -1);
    const noiseCount = clusterRecords.length - validClusters.length;

    // Clear existing clusters
    const { error: deleteError } = await supabase
      .from('job_clusters')
      .delete()
      .neq('cluster_id', -999); // Delete all

    if (deleteError) {
      console.warn('Failed to clear existing clusters:', deleteError);
    }

    // Insert new cluster assignments
    if (validClusters.length > 0) {
      const { error: insertError } = await supabase
        .from('job_clusters')
        .insert(validClusters);

      if (insertError) {
        throw new Error(`Failed to store cluster assignments: ${insertError.message}`);
      }
    }

    // Get unique cluster IDs
    const uniqueClusterIds = Array.from(new Set(clusterAssignments.filter(id => id !== -1)));
    const clusterCount = uniqueClusterIds.length;

    console.log(`Clustering complete: ${clusterCount} clusters, ${noiseCount} noise points`);

    // Derive cluster properties
    await deriveClusterProperties(uniqueClusterIds);

    return { clusterCount, noiseCount };
  } catch (error) {
    console.error('Error running job clustering:', error);
    throw error;
  }
}

/**
 * Derive cluster properties (titles, skills, industries)
 */
async function deriveClusterProperties(clusterIds: number[]): Promise<void> {
  for (const clusterId of clusterIds) {
    // Get all jobs in this cluster
    const { data: clusterJobs, error: clusterError } = await supabase
      .from('job_clusters')
      .select('job_id')
      .eq('cluster_id', clusterId);

    if (clusterError || !clusterJobs || clusterJobs.length === 0) {
      continue;
    }

    const jobIds = clusterJobs.map(cj => cj.job_id);

    // Fetch job details
    const { data: jobs, error: jobsError } = await supabase
      .from('vacancies')
      .select('title, skills_required, industry')
      .in('id', jobIds);

    if (jobsError || !jobs) {
      continue;
    }

    // Extract titles
    const titles = jobs.map(j => j.title).filter(Boolean) as string[];
    const titleFrequency = new Map<string, number>();
    titles.forEach(title => {
      titleFrequency.set(title, (titleFrequency.get(title) || 0) + 1);
    });
    const topTitles = Array.from(titleFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title]) => title);

    // Extract skills
    const allSkills: string[] = [];
    jobs.forEach(job => {
      if (job.skills_required && Array.isArray(job.skills_required)) {
        allSkills.push(...job.skills_required);
      }
    });
    const skillFrequency = new Map<string, number>();
    allSkills.forEach(skill => {
      skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + 1);
    });
    const topSkills = Array.from(skillFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill]) => skill);

    // Extract industries
    const industries = jobs.map(j => j.industry).filter(Boolean) as string[];
    const industryFrequency = new Map<string, number>();
    industries.forEach(industry => {
      industryFrequency.set(industry, (industryFrequency.get(industry) || 0) + 1);
    });
    const topIndustries = Array.from(industryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([industry]) => industry);

    // Store cluster properties
    await supabase
      .from('cluster_properties')
      .upsert({
        cluster_id: clusterId,
        representative_titles: topTitles,
        representative_skills: topSkills,
        representative_industries: topIndustries,
        job_count: jobs.length,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cluster_id',
      });
  }
}

/**
 * Get similar jobs from the same cluster
 */
export async function getSimilarJobs(jobId: string, limit: number = 10): Promise<any[]> {
  try {
    // Get cluster ID for this job
    const { data: clusterData, error: clusterError } = await supabase
      .from('job_clusters')
      .select('cluster_id')
      .eq('job_id', jobId)
      .single();

    if (clusterError || !clusterData) {
      // Job not in any cluster, return empty
      return [];
    }

    const clusterId = clusterData.cluster_id;

    // Get other jobs in the same cluster
    const { data: clusterJobs, error: jobsError } = await supabase
      .from('job_clusters')
      .select('job_id')
      .eq('cluster_id', clusterId)
      .neq('job_id', jobId)
      .limit(limit);

    if (jobsError || !clusterJobs || clusterJobs.length === 0) {
      return [];
    }

    const similarJobIds = clusterJobs.map(cj => cj.job_id);

    // Fetch job details
    const { data: jobs, error: fetchError } = await supabase
      .from('vacancies')
      .select('id, title, location, industry, skills_required, job_text')
      .in('id', similarJobIds);

    if (fetchError || !jobs) {
      return [];
    }

    // Compute similarity scores using combined vectors
    const { data: jobEmbedding, error: embeddingError } = await supabase
      .from('job_embeddings')
      .select('combined_vector')
      .eq('job_id', jobId)
      .single();

    if (!embeddingError && jobEmbedding?.combined_vector) {
      const sourceVector = Array.isArray(jobEmbedding.combined_vector)
        ? jobEmbedding.combined_vector
        : JSON.parse(jobEmbedding.combined_vector || '[]');

      // Get embeddings for similar jobs
      const { data: similarEmbeddings, error: similarEmbeddingsError } = await supabase
        .from('job_embeddings')
        .select('job_id, combined_vector')
        .in('job_id', similarJobIds);

      if (!similarEmbeddingsError && similarEmbeddings) {
        // Compute similarity scores
        const jobsWithScores = jobs.map(job => {
          const embedding = similarEmbeddings.find(e => e.job_id === job.id);
          if (!embedding?.combined_vector) {
            return { ...job, similarity: 0 };
          }

          const vector = Array.isArray(embedding.combined_vector)
            ? embedding.combined_vector
            : JSON.parse(embedding.combined_vector || '[]');

          const similarity = cosineSimilarity(sourceVector, vector);
          return { ...job, similarity };
        });

        // Sort by similarity descending
        jobsWithScores.sort((a, b) => b.similarity - a.similarity);
        return jobsWithScores.slice(0, limit);
      }
    }

    return jobs;
  } catch (error) {
    console.error(`Error getting similar jobs for ${jobId}:`, error);
    return [];
  }
}

/**
 * Get cluster reinforcement score for a candidate
 * If candidate matches other jobs in the same cluster, add bonus
 */
export async function getClusterReinforcementScore(
  jobId: string,
  candidateId: string
): Promise<number> {
  try {
    // Get cluster ID for this job
    const { data: clusterData, error: clusterError } = await supabase
      .from('job_clusters')
      .select('cluster_id')
      .eq('job_id', jobId)
      .single();

    if (clusterError || !clusterData) {
      return 0; // No cluster, no reinforcement
    }

    const clusterId = clusterData.cluster_id;

    // Get other jobs in the same cluster
    const { data: clusterJobs, error: jobsError } = await supabase
      .from('job_clusters')
      .select('job_id')
      .eq('cluster_id', clusterId)
      .neq('job_id', jobId);

    if (jobsError || !clusterJobs || clusterJobs.length === 0) {
      return 0;
    }

    // Check if candidate matches any other jobs in the cluster
    // This is a simplified check - in production, you'd want to check actual match scores
    // For now, return a fixed bonus if there are other jobs in the cluster
    const otherJobCount = clusterJobs.length;
    
    // Bonus increases with cluster size (up to 0.1 max)
    const bonus = Math.min(0.1, otherJobCount * 0.01);
    
    return bonus;
  } catch (error) {
    console.error(`Error computing cluster reinforcement for job ${jobId}, candidate ${candidateId}:`, error);
    return 0;
  }
}


