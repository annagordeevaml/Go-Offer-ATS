import OpenAI from 'openai';
import { addRelatedTitles } from '../utils/unifiedTitlesMapping';

const apiKey = (import.meta.env as any).VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file');
}

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
});

export interface ParsedBasicJobData {
  job_title: string;
  company_name: string;
  location: string;
}

export interface ValidatedJobData {
  job_title: string;
  company_name: string;
  location: string;
  company_industry: string;
  hard_skills_mentioned_in_job_description: string;
  job_description: string;
  unified_titles?: string[]; // Array of standardized unified job titles
  workplace_type?: 'Remote' | 'On-site' | 'Hybrid';
  employment_type?: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship';
  seniority_level?: 'Internship' | 'Entry level' | 'Associate' | 'Mid-Senior level' | 'Director' | 'Executive' | 'Not Applicable';
}

export interface ParsedJobDescriptionData {
  company_industry: string;
  hard_skills_mentioned_in_job_description: string; // comma-separated
}

// First step: Parse basic info (title, company, location)
const BASIC_INFO_PARSING_PROMPT = `Read the job description and extract ONLY these 3 parameters:

- job title
- company name
- location

Give output as json with these exact keys: job_title, company_name, location

Format your response as valid JSON only, no additional text.`;

// Validation and standardization prompt
const VALIDATION_PROMPT = `You are given job posting information. Your task is to:
1. Check and correct any spelling errors in job title, company name, and location
2. Standardize the location format to LinkedIn-style format:
   - For US locations: "City, State" (e.g., "New York, NY", "San Francisco, CA")
   - For international: "City, Country" with full country name (e.g., "London, United Kingdom", "Berlin, Germany")
   - For US states without city: "State, United States" (e.g., "California, United States")
   - For remote: "Remote"
   - Use proper capitalization (Title Case for cities/states, full country names)
3. Ensure proper capitalization and formatting
4. Extract company industry - MANDATORY: Find the industry in which the company operates. If the industry is not mentioned in the description, you MUST find it through internet search. This is a required field and must not be empty. If you cannot find the industry, write "Unknown", but this is a last resort - first try to find it through internet search.
5. Extract all hard skills mentioned in the job description (list all technical skills, tools, technologies, use comma to separate)

Input data:
- Job Title: {JOB_TITLE}
- Company Name: {COMPANY_NAME}
- Location: {LOCATION}
- Job Description: {JOB_DESCRIPTION}

Return JSON with these exact keys:
- job_title (corrected and standardized)
- company_name (corrected and standardized)
- location (standardized LinkedIn-style format: "City, State" for US, "City, Country" for international, "Remote" for remote work)
- company_industry (comma-separated if multiple)
- hard_skills_mentioned_in_job_description (comma-separated)
- job_description (keep original, but you can fix obvious typos if needed)
- unified_titles (array) - Match the job title to one or more standardized unified categories from this list: CEO, COO, CTO, CPO, CMO, CFO, CHRO, Product Manager, Program Manager, Project Manager, Software Engineer, Backend Engineer, Frontend Engineer, Full-Stack Engineer, DevOps Engineer, Cloud Engineer, Cybersecurity Engineer, Data Engineer, Machine Learning Engineer, Analyst, BI Developer, Data Scientist, QA, UX/UI Designer, Product Designer, Graphic Designer, Motion Designer, Marketing Manager, Content Manager, Social Media Manager, Sales Manager, Business Development Manager, Account Manager, Customer Success Manager, Customer Support Manager, Operations Manager, Supply Chain Manager, Logistics Manager, Strategy Manager, Event Manager, Finance Manager, HR Manager, Mobile Engineer, Recruiter, Legal Counsel, SDET, Others. Return an array of matching unified titles.
- workplace_type (one of: "Remote", "On-site", "Hybrid") - Determine from job description. If remote work is mentioned, use "Remote". If both remote and office work, use "Hybrid". If only office/on-site, use "On-site".
- employment_type (one of: "Full-time", "Part-time", "Contract", "Temporary", "Internship") - Determine from job description. Default to "Full-time" if not specified.
- seniority_level (one of: "Internship", "Entry level", "Associate", "Mid-Senior level", "Director", "Executive", "Not Applicable") - Determine from job title and description. Look for keywords like "Senior", "Junior", "Lead", "Director", "VP", "C-level", etc.

Format your response as valid JSON only, no additional text.`;

// Second step: Parse industry and hard skills using basic info + description
const INDUSTRY_SKILLS_PARSING_PROMPT = `You have a job description with the following information:
- Job Title: {JOB_TITLE}
- Company Name: {COMPANY_NAME}
- Location: {LOCATION}
- Full Job Description: {JOB_DESCRIPTION}

Based on this information, extract:

- company industry (if not mentioned in the description, search the internet and find the company industry)
- hard skills mentioned in job description (list all technical skills, tools, technologies mentioned, use comma to separate)

Give output as json with these exact keys: company_industry, hard_skills_mentioned_in_job_description

Format your response as valid JSON only, no additional text.`;

export const parseBasicJobInfo = async (jobDescriptionText: string): Promise<{ data: ParsedBasicJobData; rawJson: string }> => {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    console.log('=== Parsing Basic Job Info with ChatGPT ===');
    console.log('Job description text length:', jobDescriptionText.length);

    const fullUserMessage = `${BASIC_INFO_PARSING_PROMPT}\n\nJob description content:\n${jobDescriptionText}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a job description parser. Extract basic job information and return only valid JSON without any additional text or explanations.',
        },
        {
          role: 'user',
          content: fullUserMessage,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    console.log('Raw response from ChatGPT (basic info):', content);

    // Parse JSON
    let rawParsed: any;
    try {
      rawParsed = JSON.parse(content);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        rawParsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse JSON response from ChatGPT');
      }
    }

    // Normalize keys
    const normalizeKey = (key: string): string => {
      const lowerKey = key.toLowerCase().trim();
      const keyMap: { [key: string]: string } = {
        'job title': 'job_title',
        'job_title': 'job_title',
        'jobtitle': 'job_title',
        'company name': 'company_name',
        'company_name': 'company_name',
        'companyname': 'company_name',
        'location': 'location',
      };
      return keyMap[lowerKey] || lowerKey;
    };

    // Normalize the parsed data
    const normalized: any = {};
    Object.keys(rawParsed).forEach(key => {
      const normalizedKey = normalizeKey(key);
      normalized[normalizedKey] = rawParsed[key];
    });

    const result: ParsedBasicJobData = {
      job_title: normalized.job_title || '',
      company_name: normalized.company_name || '',
      location: normalized.location || '',
    };

    console.log('=== Parsed Basic Job Info ===');
    console.log('Result:', result);

    return {
      data: result,
      rawJson: content,
    };
  } catch (error) {
    console.error('Error parsing basic job info with AI:', error);
    throw error;
  }
};

export const parseIndustryAndSkills = async (
  jobTitle: string,
  companyName: string,
  location: string,
  jobDescriptionText: string
): Promise<{ data: ParsedJobDescriptionData; rawJson: string }> => {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    console.log('=== Parsing Industry and Skills with ChatGPT ===');
    console.log('Job Title:', jobTitle);
    console.log('Company Name:', companyName);
    console.log('Location:', location);

    const prompt = INDUSTRY_SKILLS_PARSING_PROMPT
      .replace('{JOB_TITLE}', jobTitle)
      .replace('{COMPANY_NAME}', companyName)
      .replace('{LOCATION}', location)
      .replace('{JOB_DESCRIPTION}', jobDescriptionText);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a job description parser. Extract industry and skills information and return only valid JSON without any additional text or explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    console.log('Raw response from ChatGPT (industry & skills):', content);

    // Parse JSON
    let rawParsed: any;
    try {
      rawParsed = JSON.parse(content);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        rawParsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse JSON response from ChatGPT');
      }
    }

    // Normalize keys
    const normalizeKey = (key: string): string => {
      const lowerKey = key.toLowerCase().trim();
      const keyMap: { [key: string]: string } = {
        'company industry': 'company_industry',
        'company_industry': 'company_industry',
        'industry': 'company_industry',
        'hard skills mentioned in job description': 'hard_skills_mentioned_in_job_description',
        'hard_skills_mentioned_in_job_description': 'hard_skills_mentioned_in_job_description',
        'hard_skills': 'hard_skills_mentioned_in_job_description',
        'skills': 'hard_skills_mentioned_in_job_description',
      };
      return keyMap[lowerKey] || lowerKey;
    };

    // Normalize the parsed data
    const normalized: any = {};
    Object.keys(rawParsed).forEach(key => {
      const normalizedKey = normalizeKey(key);
      normalized[normalizedKey] = rawParsed[key];
    });

    // Process hard skills - convert to string
    let hardSkills = '';
    if (normalized.hard_skills_mentioned_in_job_description) {
      if (Array.isArray(normalized.hard_skills_mentioned_in_job_description)) {
        hardSkills = normalized.hard_skills_mentioned_in_job_description.join(', ');
      } else {
        hardSkills = String(normalized.hard_skills_mentioned_in_job_description);
      }
    }

    // Process industry - convert to string
    let industry = '';
    if (normalized.company_industry) {
      if (Array.isArray(normalized.company_industry)) {
        industry = normalized.company_industry.join(', ');
      } else {
        industry = String(normalized.company_industry);
      }
    }

    const result: ParsedJobDescriptionData = {
      company_industry: industry,
      hard_skills_mentioned_in_job_description: hardSkills,
    };

    console.log('=== Parsed Industry and Skills ===');
    console.log('Result:', result);
    console.log('Hard Skills String:', hardSkills);

    return {
      data: result,
      rawJson: content,
    };
  } catch (error) {
    console.error('Error parsing industry and skills with AI:', error);
    throw error;
  }
};

export const validateAndStandardizeJobData = async (
  jobTitle: string,
  companyName: string,
  location: string,
  jobDescription: string
): Promise<{ data: ValidatedJobData; rawJson: string }> => {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    console.log('=== Validating and Standardizing Job Data with ChatGPT ===');
    console.log('Input:', { jobTitle, companyName, location });

    const prompt = VALIDATION_PROMPT
      .replace('{JOB_TITLE}', jobTitle)
      .replace('{COMPANY_NAME}', companyName)
      .replace('{LOCATION}', location)
      .replace('{JOB_DESCRIPTION}', jobDescription);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a job posting validator and standardizer. Check for errors, standardize formats, and extract information. Return ONLY valid JSON without any additional text, explanations, or markdown formatting. The JSON must be complete and properly closed.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000, // Increased to prevent truncation
      response_format: { type: 'json_object' },
    });

    let content = response.choices[0]?.message?.content || '{}';
    console.log('Raw response from ChatGPT (validation):', content);
    console.log('Response type:', typeof content);
    console.log('Response length:', content.length);
    console.log('Finish reason:', response.choices[0]?.finish_reason);

    // Check if response was truncated
    if (response.choices[0]?.finish_reason === 'length') {
      console.warn('⚠️ Response was truncated due to token limit');
      // Try to fix incomplete JSON by closing it properly
      const lastBrace = content.lastIndexOf('}');
      if (lastBrace === -1) {
        // No closing brace, try to add one
        const lastComma = content.lastIndexOf(',');
        if (lastComma !== -1) {
          // Remove incomplete last property and close JSON
          content = content.substring(0, lastComma) + '}';
        } else {
          // Just add closing brace
          content = content.trim() + '}';
        }
      } else {
        // Check if there's an incomplete string value before the last brace
        const beforeLastBrace = content.substring(0, lastBrace);
        const lastQuote = beforeLastBrace.lastIndexOf('"');
        if (lastQuote !== -1) {
          const afterLastQuote = beforeLastBrace.substring(lastQuote + 1);
          // If there's an unclosed string, close it
          if (!afterLastQuote.includes('"') || afterLastQuote.trim().endsWith('...')) {
            // Remove incomplete property and close JSON
            const lastColon = beforeLastBrace.lastIndexOf(':');
            if (lastColon !== -1) {
              const propertyStart = beforeLastBrace.lastIndexOf('"', lastColon);
              if (propertyStart !== -1) {
                content = content.substring(0, propertyStart - 1) + '}';
              }
            }
          }
        }
      }
      console.log('Attempted to fix truncated JSON:', content);
    }

    // Parse JSON - try multiple strategies
    let rawParsed: any;
    try {
      // Strategy 1: Direct parse
      rawParsed = JSON.parse(content);
      console.log('✅ Direct JSON parse successful');
    } catch (error) {
      console.warn('Direct parse failed, trying alternative methods...', error);
      
      // Strategy 2: Remove any markdown formatting first
      let cleaned = content.trim();
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Strategy 3: Try to extract JSON from markdown code blocks
      const jsonMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          rawParsed = JSON.parse(jsonMatch[1]);
          console.log('✅ JSON extracted from code block');
        } catch (e) {
          console.warn('Failed to parse extracted JSON from code block', e);
        }
      }
      
      // Strategy 4: Try to find JSON object in the text
      if (!rawParsed) {
        const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch && jsonObjectMatch[0]) {
          try {
            rawParsed = JSON.parse(jsonObjectMatch[0]);
            console.log('✅ JSON extracted from text');
          } catch (e) {
            console.warn('Failed to parse extracted JSON from text', e);
            // Try to fix incomplete JSON
            let jsonStr = jsonObjectMatch[0];
            // If JSON is incomplete, try to close it
            if (!jsonStr.trim().endsWith('}')) {
              // Find the last complete property
              const lastCompleteProp = jsonStr.lastIndexOf('",');
              if (lastCompleteProp !== -1) {
                jsonStr = jsonStr.substring(0, lastCompleteProp + 2) + '}';
                try {
                  rawParsed = JSON.parse(jsonStr);
                  console.log('✅ JSON fixed and parsed');
                } catch (e2) {
                  console.warn('Failed to fix and parse JSON', e2);
                }
              }
            }
          }
        }
      }
      
      // Strategy 5: Try to parse cleaned content
      if (!rawParsed) {
        try {
          rawParsed = JSON.parse(cleaned);
          console.log('✅ JSON parsed after cleaning');
        } catch (e) {
          console.warn('Failed to parse after cleaning', e);
        }
      }
      
      // If all strategies failed, try to extract partial data
      if (!rawParsed) {
        console.error('All JSON parsing strategies failed');
        console.error('Content that failed to parse:', content);
        
        // Try to extract at least some fields manually
        const titleMatch = content.match(/"job_title"\s*:\s*"([^"]+)"/);
        const companyMatch = content.match(/"company_name"\s*:\s*"([^"]+)"/);
        const locationMatch = content.match(/"location"\s*:\s*"([^"]+)"/);
        const industryMatch = content.match(/"company_industry"\s*:\s*"([^"]+)"/);
        const skillsMatch = content.match(/"hard_skills_mentioned_in_job_description"\s*:\s*"([^"]*)"/);
        
        if (titleMatch || companyMatch || locationMatch) {
          rawParsed = {
            job_title: titleMatch?.[1] || '',
            company_name: companyMatch?.[1] || '',
            location: locationMatch?.[1] || '',
            company_industry: industryMatch?.[1] || '',
            hard_skills_mentioned_in_job_description: skillsMatch?.[1] || '',
            job_description: jobDescription,
          };
          console.log('✅ Extracted partial data manually:', rawParsed);
        } else {
          throw new Error(`Failed to parse JSON response from ChatGPT. Response: ${content.substring(0, 300)}...`);
        }
      }
    }

    // Normalize keys
    const normalizeKey = (key: string): string => {
      const lowerKey = key.toLowerCase().trim();
      const keyMap: { [key: string]: string } = {
        'job title': 'job_title',
        'job_title': 'job_title',
        'jobtitle': 'job_title',
        'company name': 'company_name',
        'company_name': 'company_name',
        'companyname': 'company_name',
        'location': 'location',
        'company industry': 'company_industry',
        'company_industry': 'company_industry',
        'industry': 'company_industry',
        'hard skills mentioned in job description': 'hard_skills_mentioned_in_job_description',
        'hard_skills_mentioned_in_job_description': 'hard_skills_mentioned_in_job_description',
        'hard_skills': 'hard_skills_mentioned_in_job_description',
        'skills': 'hard_skills_mentioned_in_job_description',
        'job description': 'job_description',
        'job_description': 'job_description',
        'jobdescription': 'job_description',
      };
      return keyMap[lowerKey] || lowerKey;
    };

    // Normalize the parsed data
    const normalized: any = {};
    Object.keys(rawParsed).forEach(key => {
      const normalizedKey = normalizeKey(key);
      normalized[normalizedKey] = rawParsed[key];
    });

    // Ensure industry is not empty - check if it was found
    let industry = normalized.company_industry || '';
    if (!industry || industry.trim() === '') {
      console.warn('⚠️ Industry not found in ChatGPT response. This should not happen as it is required.');
      // Even if empty, we'll pass it through - the prompt should have found it
    } else {
      console.log('✅ Industry found:', industry);
    }

    const result: ValidatedJobData = {
      job_title: normalized.job_title || jobTitle,
      company_name: normalized.company_name || companyName,
      location: normalized.location || location,
      company_industry: industry,
      hard_skills_mentioned_in_job_description: normalized.hard_skills_mentioned_in_job_description || '',
      job_description: normalized.job_description || jobDescription,
      unified_titles: normalized.unified_titles || [],
      workplace_type: normalized.workplace_type || undefined,
      employment_type: normalized.employment_type || 'Full-time',
      seniority_level: normalized.seniority_level || 'Not Applicable',
    };

    console.log('=== Validated Job Data ===');
    console.log('Result:', result);

    return {
      data: result,
      rawJson: content,
    };
  } catch (error) {
    console.error('Error validating job data with AI:', error);
    throw error;
  }
};
