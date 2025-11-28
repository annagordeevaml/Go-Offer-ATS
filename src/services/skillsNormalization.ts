import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

if (!apiKey) {
  console.warn('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file');
}

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
}) : null;

/**
 * Normalize and standardize skills using ChatGPT
 * - Translates to English
 * - Converts to lowercase
 * - Standardizes naming (e.g., "React.js" -> "react", "JavaScript" -> "javascript")
 * - Removes duplicates
 * - Returns array of normalized skills
 */
export async function normalizeSkills(skills: string[]): Promise<string[]> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!skills || skills.length === 0) {
    return [];
  }

  // Join skills into a single string for processing
  const skillsString = skills.join(', ');

  const systemPrompt = `You are a skills normalization expert. Your task is to normalize and standardize a list of skills, tools, technologies, and related items.

CRITICAL RULES:
1. Convert all text to English (translate if needed)
2. Convert all text to LOWERCASE
3. Standardize skill names:
   - Remove version numbers (e.g., "React 18" -> "react", "Python 3.9" -> "python")
   - Standardize common variations (e.g., "React.js" -> "react", "JS" -> "javascript", "NodeJS" -> "node.js")
   - Use standard abbreviations (e.g., "JavaScript" -> "javascript", "TypeScript" -> "typescript")
   - Remove common prefixes/suffixes (e.g., "Proficient in" -> remove, "Expert at" -> remove)
4. Remove duplicates (including case variations)
5. Remove empty or meaningless entries
6. Keep only relevant technical and professional skills
7. Return as a JSON array of strings, each skill as a separate item
8. Do NOT add any skills that were not in the input
9. Preserve the semantic meaning of each skill

Examples:
- Input: ["React.js", "JavaScript", "JS", "TypeScript", "NodeJS", "Node.js"]
  Output: ["react", "javascript", "typescript", "node.js"]

- Input: ["Python 3.9", "Python", "Django Framework", "Django"]
  Output: ["python", "django"]

- Input: ["Agile Methodology", "Scrum", "Agile", "Kanban"]
  Output: ["agile", "scrum", "kanban"]

Return ONLY a valid JSON array, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Normalize these skills: ${skillsString}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    let normalizedSkillsJson = response.choices[0]?.message?.content?.trim() || '[]';
    
    // Remove markdown code blocks if present
    normalizedSkillsJson = normalizedSkillsJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to parse as JSON
    let normalizedSkills: string[] = [];
    try {
      normalizedSkills = JSON.parse(normalizedSkillsJson);
      if (!Array.isArray(normalizedSkills)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Error parsing normalized skills JSON:', parseError);
      console.error('Response:', normalizedSkillsJson);
      // Fallback: try to extract skills from text
      normalizedSkills = normalizedSkillsJson
        .replace(/[\[\]"]/g, '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);
    }

    // Additional post-processing
    normalizedSkills = normalizedSkills
      .map(skill => skill.trim().toLowerCase())
      .filter(skill => skill.length > 0 && skill.length < 100) // Remove empty and too long entries
      .filter((skill, index, self) => self.indexOf(skill) === index); // Remove duplicates

    return normalizedSkills;
  } catch (error) {
    console.error('Error normalizing skills:', error);
    // Fallback: return skills with basic normalization
    return skills
      .map(skill => skill.trim().toLowerCase())
      .filter(skill => skill.length > 0)
      .filter((skill, index, self) => self.indexOf(skill) === index);
  }
}

/**
 * Normalize skills for a single candidate
 */
export async function normalizeCandidateSkills(candidateId: string, resumeText: string): Promise<string[]> {
  if (!resumeText || resumeText.trim().length === 0) {
    return [];
  }

  // Extract skills from resume using ChatGPT
  const extractionPrompt = `Extract ALL skills, tools, technologies, and related information from this resume:

${resumeText}

Extract:
- Hard skills (programming languages, frameworks, technologies, methodologies)
- Soft skills (communication, leadership, teamwork, etc.)
- Tools and software (development tools, design tools, project management tools, etc.)
- Products and platforms (specific products worked with, platforms, services)
- Teams and methodologies (agile, scrum, team sizes, collaboration tools)
- Levels and certifications (seniority levels, certifications, qualifications)
- Also include semantically similar skills that are commonly used together with the found skills

Return as a JSON array of strings, each skill as a separate item. Be comprehensive and include everything relevant.`;

  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a skills extraction expert. Extract all relevant skills, tools, technologies, and related information from resumes. Return as a JSON array.',
        },
        { role: 'user', content: extractionPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    let skillsJson = response.choices[0]?.message?.content?.trim() || '[]';
    
    // Remove markdown code blocks if present
    skillsJson = skillsJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let extractedSkills: string[] = [];
    try {
      extractedSkills = JSON.parse(skillsJson);
      if (!Array.isArray(extractedSkills)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Error parsing extracted skills JSON:', parseError);
      // Fallback: try to extract from text
      extractedSkills = skillsJson
        .replace(/[\[\]"]/g, '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Normalize the extracted skills
    const normalizedSkills = await normalizeSkills(extractedSkills);
    
    return normalizedSkills;
  } catch (error) {
    console.error(`Error extracting skills for candidate ${candidateId}:`, error);
    return [];
  }
}


