import OpenAI from 'openai';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use jsdelivr CDN (most reliable)
// Note: In production, consider bundling the worker file locally
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

if (!apiKey) {
  console.warn('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file');
}

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
});

export interface ParsedResumeData {
  full_name: string;
  main_job_title: string;
  unified_titles?: string[]; // Array of standardized unified titles
  main_industries: string[];
  other_related_industries: string[];
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  total_work_experience_years: number;
  last_updated_date: string;
  phone_number: string;
  email: string;
  other_social_media: string;
  company_names: string[];
  skills?: string[]; // Array of normalized skills (hard skills, soft skills, tools, products, teams, levels, and semantically similar ones)
}

const RESUME_PARSING_PROMPT = `You are given a fixed resume template.

Your task is to take the candidate's resume and distribute its content into the correct template sections without rewriting, expanding, or mixing with template examples.

The template defines structure only, not content.

STRICT GLOBAL RULES (NO EXCEPTIONS)

1. You MUST:

Use only content from the candidate's resume.

Preserve role/company descriptions.

Preserve bullet points.

Preserve original meaning and order.

Use neutral plain English (if resume uses another language).

Present everything in clean text with no bold, no italics, unless it existed in resume.

2. You MUST NOT:

Copy any sample text from the template.

Mix template examples with candidate's content.

Invent or infer information.

Rephrase, shorten, or expand text.

Convert bullets into paragraphs (or vice versa), except where specified.

Output "insert content here" or any placeholder text.

Output explanations — only the final formatted resume.

3. Removing empty sections

If a section has no content extracted from the resume,

→ remove that entire section from the final output.

FORMATTING RULES

A) PROFESSIONAL EXPERIENCE (THIS IS THE MOST IMPORTANT PART)

For each separate role, follow this exact structure and order:

1. Dates (exactly as in resume)

2. Company Name

3. Job Title

4. Location (if present)

5. Role/Company Description (plain text — NOT a bullet)

• bullet point

• bullet point

• bullet point

Special Rules

If the candidate has multiple roles in the same company → output each role separately with its own dates/title/description.

If original text mixes description + bullets → separate them:

non-bullet text → Role/Company Description

bullet text → bullets

If original text has no bullets → convert responsibilities into bullets.

Always use real bullet points: •

Never bold or italicize titles unless resume already did.

B) ALL OTHER SECTIONS

Follow the template structure, preserving original formatting:

If content is list-like → bullets are allowed.

If content is paragraph-like → keep as paragraphs.

No bolding unless original resume used bold.

No merging or renaming sections.

C) EXTRA CONTENT

If the resume includes relevant info that does not fit any template section, place it into:

ADDITIONAL INFORMATION

TEMPLATE STRUCTURE TO FOLLOW

(Only include sections where you actually have content)

SUMMARY

[content]

KEY ACHIEVEMENTS

[content]

PROFESSIONAL EXPERIENCE

[structured roles]

PROJECTS

[content]

EDUCATION

[content]

RELATED PROJECTS

[content]

PROFESSIONAL DEVELOPMENT

[content]

EXECUTIVE STRENGTHS

[content]

TECHNICAL SKILLS

[content]

ADDITIONAL INFORMATION

[content]

FINAL OUTPUT REQUIREMENTS

Only output the filled template sections.

Remove empty sections completely.

No commentary, no explanations, no extra text.

Use clean spacing and readable formatting.

IMPORTANT: After filling the template, also extract the following information and return it as JSON:
- full_name
- main_job_title
- unified_titles (array) - Extract ALL job titles mentioned in the resume (from Professional Experience section and any other sections). For EACH job title found in the resume, match it to one or more standardized unified categories from this list: CEO, COO, CTO, CPO, CMO, CFO, CHRO, Product Manager, Program Manager, Project Manager, Software Engineer, Backend Engineer, Frontend Engineer, Full-Stack Engineer, DevOps Engineer, Cloud Engineer, Cybersecurity Engineer, Data Engineer, Machine Learning Engineer, Analyst, BI Developer, Data Scientist, QA, UX/UI Designer, Product Designer, Graphic Designer, Motion Designer, Marketing Manager, Content Manager, Social Media Manager, Sales Manager, Business Development Manager, Account Manager, Customer Success Manager, Customer Support Manager, Operations Manager, Supply Chain Manager, Logistics Manager, Strategy Manager, Event Manager, Finance Manager, HR Manager, Mobile Engineer, Recruiter, Legal Counsel, SDET, Others. IMPORTANT: A candidate can have multiple unified titles if they worked in different roles. Return ALL matching unified titles for ALL job titles found in the resume. Also note: CMO automatically includes Marketing Manager, CPO includes Product Manager, CFO includes Finance Manager, CHRO includes HR Manager, COO includes Operations Manager.
- main_industries (array)
- other_related_industries (array)
- location
- linkedin
- github
- portfolio
- total_work_experience_years (number)
- last_updated_date (YYYY-MM-DD format, use today's date)
- phone_number
- email
- other_social_media
- company_names (array)
- skills (array) - Extract ALL skills, tools, technologies, and related information from the resume. This includes:
  * Hard skills (programming languages, frameworks, technologies, methodologies)
  * Soft skills (communication, leadership, teamwork, etc.)
  * Tools and software (development tools, design tools, project management tools, etc.)
  * Products and platforms (specific products worked with, platforms, services)
  * Teams and methodologies (agile, scrum, team sizes, collaboration tools)
  * Levels and certifications (seniority levels, certifications, qualifications)
  * Also include semantically similar skills that are commonly used together with the found skills (e.g., if "React" is found, also include "JavaScript", "TypeScript", "Node.js" if they make sense in context)
  Return as an array of strings, with each skill as a separate item. Be comprehensive and include everything relevant.

Format your response as:

FORMATTED_RESUME:
[the filled template with resume content, only sections with content]

JSON_DATA:
[valid JSON with the extracted information]`;

const SUMMARY_GENERATION_PROMPT = `I will provide you with a resume. Create a concise professional summary under 1000 characters.

Structure strictly as follows (do not add anything extra):

Job title (take the most senior and relevant one from the resume).

". Total experience: X years."

"Industries:" and list core industries based on the resume.

Then add a block "Three recent experience:" and briefly describe only the last three roles in this format (one compact sentence per role):

Company name (industry), job title — responsible for… — describe main responsibilities in one short sentence.

Keep the tone simple, human, and business-focused. Avoid clichés, buzzwords, and generalities.

Do NOT exceed 1000 characters total. Do NOT add achievements, metrics, or adjectives — only factual responsibilities.

Write in English.`;

export const parseResumeWithAI = async (resumeText: string): Promise<{ data: ParsedResumeData; rawJson: string }> => {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    console.log('=== STEP 1: Preparing request to ChatGPT ===');
    console.log('System prompt:', 'You are a resume formatter. Place the candidate\'s resume content into the correct sections of the template without rewriting, improving, or mixing in template text. Use only content from the resume. Also extract candidate information and return it in JSON format.');
    console.log('Resume text length:', resumeText.length);
    console.log('Resume text preview (first 500 chars):', resumeText.substring(0, 500));
    
    // Construct the full user message with prompt and resume
    const fullUserMessage = `${RESUME_PARSING_PROMPT}\n\nResume content:\n${resumeText}`;
    
    console.log('=== STEP 2: Sending request to ChatGPT ===');
    console.log('Full user message length:', fullUserMessage.length);
    console.log('User message preview (first 1000 chars):', fullUserMessage.substring(0, 1000));
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a resume formatter. Place the candidate\'s resume content into the correct sections of the template without rewriting, improving, or mixing in template text. Use only content from the resume. Also extract candidate information and return it in JSON format.',
        },
        {
          role: 'user',
          content: fullUserMessage,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000, // Increased for formatted resume + JSON
    });

    const content = response.choices[0]?.message?.content || '';
    
    console.log('=== STEP 3: Received response from ChatGPT ===');
    console.log('Raw response content length:', content.length);
    console.log('Raw response content preview:', content.substring(0, 500));
    
    // Parse the response - it should contain both formatted resume and JSON
    let formattedResume = '';
    let rawParsed: any = {};
    
    // Try to extract JSON_DATA section
    const jsonMatch = content.match(/JSON_DATA:\s*(\{[\s\S]*\})/i) || content.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        rawParsed = JSON.parse(jsonMatch[1]);
        console.log('Successfully extracted JSON data');
        // Extract formatted resume (everything before JSON_DATA)
        const resumeMatch = content.match(/FORMATTED_RESUME:\s*([\s\S]*?)(?:JSON_DATA|$)/i);
        if (resumeMatch) {
          formattedResume = resumeMatch[1].trim();
        } else {
          // If no FORMATTED_RESUME section, take everything before JSON
          formattedResume = content.substring(0, jsonMatch.index || 0).replace(/FORMATTED_RESUME:\s*/i, '').trim();
        }
      } catch (error) {
        console.error('Error parsing JSON from response:', error);
        // Fallback: try to extract JSON from the end of the response
        const jsonAtEnd = content.match(/(\{[\s\S]*\})$/);
        if (jsonAtEnd) {
          try {
            rawParsed = JSON.parse(jsonAtEnd[1]);
            formattedResume = content.substring(0, jsonAtEnd.index || 0).trim();
          } catch (e) {
            console.error('Failed to parse JSON even from end:', e);
          }
        }
      }
    } else {
      // If no JSON found, the entire response might be the formatted resume
      formattedResume = content;
      console.warn('No JSON data found in response, will try to extract data from formatted resume');
    }
    
    console.log('=== EXTRACTED DATA ===');
    console.log('Formatted resume length:', formattedResume.length);
    console.log('Raw parsed object:', rawParsed);
    console.log('Raw parsed keys:', Object.keys(rawParsed));
    
    // Normalize keys - handle different formats from ChatGPT
    const normalizeKey = (key: string): string => {
      const lowerKey = key.toLowerCase().trim();
      const keyMap: { [key: string]: string } = {
        'full name': 'full_name',
        'fullname': 'full_name',
        'main job title': 'main_job_title',
        'mainjobtitle': 'main_job_title',
        'job title': 'main_job_title',
        'industries': 'main_industries',
        'main industries': 'main_industries',
        'other related industries': 'other_related_industries',
        'otherrelatedindustries': 'other_related_industries',
        'related industries': 'other_related_industries',
        'linkedin link': 'linkedin',
        'linkedin': 'linkedin',
        'github link': 'github',
        'github': 'github',
        'portfolio link': 'portfolio',
        'portfolio': 'portfolio',
        'total work experience in years': 'total_work_experience_years',
        'totalworkexperienceinyears': 'total_work_experience_years',
        'work experience': 'total_work_experience_years',
        'experience': 'total_work_experience_years',
        'last updated date': 'last_updated_date',
        'lastupdateddate': 'last_updated_date',
        'phone number': 'phone_number',
        'phonenumber': 'phone_number',
        'phone': 'phone_number',
        'email': 'email',
        'other social media': 'other_social_media',
        'othersocialmedia': 'other_social_media',
        'all companies names where the candidate worked': 'company_names',
        'company names': 'company_names',
        'companies': 'company_names',
        'companies names': 'company_names',
        'location': 'location',
        'skills': 'skills',
      };
      return keyMap[lowerKey] || lowerKey.replace(/\s+/g, '_');
    };
    
    // Normalize the parsed object
    const normalized: any = {};
    for (const key in rawParsed) {
      const normalizedKey = normalizeKey(key);
      normalized[normalizedKey] = rawParsed[key];
    }
    
    console.log('=== NORMALIZED DATA ===');
    console.log('Normalized object:', normalized);
    console.log('Normalized keys:', Object.keys(normalized));
    
    // Ensure all required fields have default values
    const result: ParsedResumeData = {
      full_name: normalized.full_name || normalized.fullname || '',
      main_job_title: normalized.main_job_title || normalized.job_title || '',
      unified_titles: Array.isArray(normalized.unified_titles) 
        ? normalized.unified_titles 
        : (Array.isArray(normalized.unifiedTitles) ? normalized.unifiedTitles : []),
      main_industries: Array.isArray(normalized.main_industries) 
        ? normalized.main_industries 
        : (Array.isArray(normalized.industries) ? normalized.industries : []),
      other_related_industries: Array.isArray(normalized.other_related_industries) 
        ? normalized.other_related_industries 
        : [],
      location: normalized.location || '',
      linkedin: normalized.linkedin || normalized.linkedin_link || 'Not found',
      github: normalized.github || normalized.github_link || 'Not found',
      portfolio: normalized.portfolio || normalized.portfolio_link || 'Not found',
      total_work_experience_years: normalized.total_work_experience_years || normalized.work_experience || normalized.experience || 0,
      last_updated_date: normalized.last_updated_date || normalized.last_updated || new Date().toISOString().split('T')[0],
      phone_number: normalized.phone_number || normalized.phone || 'Not found',
      email: normalized.email || 'Not found',
      other_social_media: normalized.other_social_media || 'Not found',
      company_names: Array.isArray(normalized.company_names) 
        ? normalized.company_names 
        : (Array.isArray(normalized.companies) ? normalized.companies : []),
      skills: Array.isArray(normalized.skills) 
        ? normalized.skills 
        : [],
    };
    
    console.log('=== FINAL NORMALIZED RESULT ===');
    console.log('Final result:', result);
    console.log('Full name:', result.full_name);
    console.log('Main job title:', result.main_job_title);
    console.log('Main industries:', result.main_industries);
    console.log('Related industries:', result.other_related_industries);
    console.log('Location:', result.location);
    console.log('Company names:', result.company_names);
    
    // Return both normalized data and raw response (which contains formatted resume)
    return {
      data: result,
      rawJson: formattedResume || content, // Return the formatted resume text
    };
  } catch (error) {
    console.error('Error parsing resume with AI:', error);
    throw error;
  }
};

// Generate summary with a specific GPT model
export const generateSummaryWithModel = async (
  resumeText: string,
  model: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  console.log(`=== Generating summary with ${model} ===`);
  console.log('Resume text length:', resumeText.length);

  try {
    const systemPrompt = 'You are a professional resume writer. Create concise candidate summaries following the exact structure provided. Write in simple, human, business-focused tone. Avoid clichés, buzzwords, and generalities. Do not exceed 1000 characters total. Do not add achievements, metrics, or adjectives — only factual responsibilities.';
    
    const userMessage = `${SUMMARY_GENERATION_PROMPT}\n\nResume content:\n${resumeText}`;

    // For o1 models, use different parameters (they don't support temperature)
    const isO1Model = model.startsWith('o1-');
    
    const requestParams: any = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 500,
    };

    // O1 models don't support temperature, top_p, etc.
    if (!isO1Model) {
      requestParams.temperature = 0.8;
      requestParams.top_p = 0.95;
    }

    const response = await openai.chat.completions.create(requestParams);

    const summary = response.choices[0]?.message?.content || '';
    
    // Ensure summary is not longer than 1000 characters
    const trimmedSummary = summary.length > 1000 ? summary.substring(0, 997) + '...' : summary;
    
    console.log(`Summary generated successfully with ${model}, length:`, trimmedSummary.length);
    return trimmedSummary.trim();
  } catch (error) {
    console.error(`Error generating summary with ${model}:`, error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      // For o1 models, if not available, return empty string instead of throwing
      if (error.message.includes('not found') || error.message.includes('not available')) {
        console.warn(`Model ${model} is not available, skipping...`);
        return '';
      }
    }
    throw error;
  }
};

// Generate summaries with all models in parallel
export const generateSummariesWithAllModels = async (
  resumeText: string
): Promise<Record<string, string>> => {
  // Use only GPT-3.5-turbo as requested
  const models = ['gpt-3.5-turbo'];

  console.log('=== Generating summaries with GPT-3.5-turbo ===');

  // Generate summaries in parallel
  const promises = models.map(async (model) => {
    try {
      const summary = await generateSummaryWithModel(resumeText, model);
      return { model, summary };
    } catch (error) {
      console.error(`Failed to generate summary with ${model}:`, error);
      return { model, summary: '' };
    }
  });

  const results = await Promise.all(promises);
  
  // Convert to record format
  const summariesByModel: Record<string, string> = {};
  results.forEach(({ model, summary }) => {
    if (summary) {
      summariesByModel[model] = summary;
    }
  });

  console.log('Summaries generated for models:', Object.keys(summariesByModel));
  return summariesByModel;
};

// Legacy function for backward compatibility - now uses GPT-3.5-turbo
export const generateSummaryWithAI = async (resumeText: string): Promise<string> => {
  return generateSummaryWithModel(resumeText, 'gpt-3.5-turbo');
};

/**
 * Converts PDF file to text
 */
export const convertPdfToText = async (file: File): Promise<string> => {
  try {
    console.log('=== Converting PDF to text ===');
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes');
    
    // Ensure worker is configured with correct path
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0 // Reduce console output
    });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('Text extracted successfully');
    console.log('Text length:', fullText.length);
    console.log('Text preview (first 500 chars):', fullText.substring(0, 500));
    
    return fullText;
  } catch (error) {
    console.error('Error converting PDF to text:', error);
    throw new Error('Failed to convert PDF to text. Please ensure the file is a valid PDF.');
  }
};

/**
 * Converts PDF file to HTML for display
 */
export const convertPdfToHtml = async (file: File): Promise<string> => {
  try {
    console.log('=== Converting PDF to HTML with precise formatting ===');
    const arrayBuffer = await file.arrayBuffer();
    
    // Ensure worker is configured
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0
    });
    const pdf = await loadingTask.promise;
    
    let htmlContent = '<div style="font-family: Arial, sans-serif; line-height: 1.4; color: #000; background: #fff; padding: 20px; max-width: 100%;">';
    
    // Extract text from all pages with precise positioning
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      
      htmlContent += `<div class="page" style="margin-bottom: 20px;">`;
      
      // Group text items by Y position to preserve line structure
      const lines: { [key: number]: Array<{ text: string; x: number; fontSize: number; fontName: string }> } = {};
      
      textContent.items.forEach((item: any) => {
        const transform = item.transform;
        const x = transform[4];
        const y = viewport.height - transform[5]; // Invert Y coordinate
        const fontSize = transform[0] || item.height || 12;
        const fontName = item.fontName || 'Arial';
        const text = item.str;
        
        // Round Y to group items on the same line
        const lineY = Math.round(y);
        
        if (!lines[lineY]) {
          lines[lineY] = [];
        }
        
        lines[lineY].push({ text, x, fontSize, fontName });
      });
      
      // Sort lines by Y position (top to bottom)
      const sortedLines = Object.keys(lines)
        .map(Number)
        .sort((a, b) => b - a); // Reverse sort (top to bottom)
      
      let lastY = Infinity;
      let currentBlock = '';
      
      sortedLines.forEach((lineY) => {
        const items = lines[lineY].sort((a, b) => a.x - b.x); // Sort by X position (left to right)
        
        // Check if this is a new paragraph (significant Y gap)
        const yGap = lastY - lineY;
        if (yGap > 15 && currentBlock) {
          htmlContent += `<div style="margin-bottom: ${Math.min(yGap / 3, 20)}px;">${currentBlock}</div>`;
          currentBlock = '';
        }
        
        // Build the line with preserved spacing
        let lineHtml = '';
        let lastX = 0;
        
        items.forEach((item, index) => {
          const xGap = item.x - lastX;
          
          // Add spacing if there's a gap (but not at the start)
          if (xGap > 5 && index > 0) {
            lineHtml += `<span style="margin-left: ${xGap / 2}px;"></span>`;
          }
          
          // Determine font weight and size
          const isBold = item.fontName.toLowerCase().includes('bold') || 
                       item.fontName.toLowerCase().includes('black') ||
                       item.fontSize > 14;
          const fontWeight = isBold ? 'bold' : 'normal';
          const fontSize = `${item.fontSize}px`;
          
          // Preserve text with styling
          lineHtml += `<span style="font-size: ${fontSize}; font-weight: ${fontWeight}; white-space: pre;">${escapeHtml(item.text)}</span>`;
          
          lastX = item.x + (item.text.length * item.fontSize * 0.6); // Approximate text width
        });
        
        if (lineHtml.trim()) {
          currentBlock += `<div style="line-height: 1.4; margin-bottom: 2px;">${lineHtml}</div>`;
        }
        
        lastY = lineY;
      });
      
      // Add remaining block
      if (currentBlock) {
        htmlContent += `<div style="margin-bottom: 10px;">${currentBlock}</div>`;
      }
      
      htmlContent += '</div>';
    }
    
    htmlContent += '</div>';
    
    return htmlContent;
  } catch (error) {
    console.error('Error converting PDF to HTML:', error);
    throw new Error('Failed to convert PDF to HTML. Please ensure the file is a valid PDF.');
  }
};

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export const convertDocxToText = async (file: File): Promise<string> => {
  try {
    console.log('=== Converting DOCX to text ===');
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes');
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);
    
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    console.log('Text extracted successfully');
    console.log('Text length:', text.length);
    console.log('Text preview (first 500 chars):', text.substring(0, 500));
    
    if (!text || text.trim().length === 0) {
      throw new Error('Extracted text is empty. Please check if the DOCX file is valid.');
    }
    
    return text;
  } catch (error) {
    console.error('Error converting DOCX to text:', error);
    throw error;
  }
};

/**
 * Resume template for formatting
 */
const RESUME_TEMPLATE = `XXX XXX	ML/AI PRODUCT MANAGER 

 Boston, MA│(xxx) xxx xxxx | Green Card Holder │ xxx@gmail.com │ https://www.linkedin.com/in/xxx/

ML Product Manager with x+ years of experience scaling AI/ML products from prototype to xxM+ users. 

Expertise in Computer Vision, Face Recognition, and ML infrastructure optimization. Led development of biometric payment systems and ML-powered recommendation engines. Launched AI products that enhance security while maintaining seamless user experience for companies:

[Cool Brand], global e-commerce leader with $xxx annual GMV and xxxM+ daily active users

[Cool Brand] (similar to JP Morgan Chase in scale), bank with $xxxB in assets, offering digital banking services and ML-powered solutions

[Cool Brand], dating app with xxxM+ registered users across xxx countries, pioneer in ML-powered matching algorithms and content moderation

[Cool Brand], market research firm serving Fortune xxx tech companies including Microsoft, Intel, and HP

[Cool Brand], IT distributor with xxx+ vendor partnerships including Apple, Samsung, and Lenovo

KEY ACHIEVEMENTS

Built enterprise-grade Face Recognition system processing xM+ daily transactions at scale, reducing fraud rate to near-zero 

Launched biometric payment solution integrated across Mobile App, ATMs and web platforms, now used by xxM+ users with adoption rate growing 3x in first x months

Developed ML-powered recommendation engine for global e-commerce platform, processing xxxK+ product suggestions per hour and improving user engagement metrics through A/B testing

Created automated ML testing framework that reduced model deployment time from x weeks to x days while ensuring quality standards

Implemented advanced liveness detection system using Computer Vision, reducing fraudulent authentication attempts by xx% and saving millions in potential losses

Expertise in ML product development, A/B testing, MLOps, computer vision, user research, analytics, agile product development, and cross-functional leadership. 

Green Card Holder. Authorized to work for any U.S. employer without visa sponsorship.

PROFESSIONAL EXPERIENCE

[Cool Brand], Boston, MA	July 2023 – Present

Global e-commerce leader with $xxxB annual GMV and xxxM+ daily active users

ML SENIOR PRODUCT MANAGER	

Led development of AI-powered recommendation systems and personalization features driving $xxxB+ in annual sales, serving xxxM+ active users:

Led development of personalized recommendation system that became the #1 GMV channel, driving more than half of company's total orders and significantly improved buyer retention rates

Built product discovery features used by xxxM+ shoppers daily, driving a x% uplift in conversion rate to buyer at the company's scale

Enhanced product discovery through data enrichment, new features, and advanced algorithms, resulting in a xx%+ increase in orders and a xx% boost in GMV at the company's scale

Launched ML-powered recommendation engine handling xxM+ product suggestions per hour during major sales events

Scaled A/B testing platform for recommendations team, running xxx+ experiments monthly to optimize buyer experience

Implemented real-time monitoring dashboard tracking key metrics across xxxM+ products, enabling quick response to performance issues

Collaborated with Data Science and Engineering teams to enhance recommendation quality for high-traffic events like Black Friday

[Cool Brand]	August 2022 – July 2023

Dating app with xxxM+ registered users across xxx countries, pioneer in ML-powered matching algorithms and content moderation

CONTENT PRODUCT MANAGER	 

Led Managed anti-fraud and content moderation products ensuring safe experience for xxxM+ users worldwide:

Built content moderation ML system that identified new fraud patterns for user protection

Enhanced anti-spam algorithms by adding xxxx+ pattern recognition rules

Contributed to user safety features for global dating platform with xxM monthly active users

[Cool Brand]	June 2020 – July 2022

Bank similar to JP Morgan Chase in scale with $xxxB in assets, offering digital banking services and ML-powered solutions

ML PRODUCT MANAGER	

Led end-to-end development of ML-powered payment systems and biometric authentication platforms used by xxM+ users:

Built enterprise ML system that processes xxxK+ face scans every hour, cutting response time from x seconds to xxxms while keeping high accuracy rates

Architected Face Recognition platform handling xM+ daily payments across Mobile Apps, ATMs and web, achieving accuracy rates matching industry leaders like Apple FaceID

Built anti-fraud AI system that spots fake photos and deepfakes in real-time, blocking thousands of fraudulent attempts daily and matching security standards of Apple Pay

Established MLOps practices reducing model deployment time from x weeks to x days through automated testing and monitoring

Created data collection pipeline gathering xxM+ facial images for model training while ensuring GDPR compliance

Led cross-functional team of xx ML Engineers, Data Scientists, Backend Developers across product development lifecycle

[Cool Brand]	November 2019 – June 2020

Market research firm serving Fortune xxx tech companies 

PRODUCT MANAGER	

Built market intelligence products and analytics solutions:

Built analytics dashboard tracking IT market trends used by Microsoft, Intel, and other enterprise clients

Developed predictive models and automated reporting system processing data from xxxx+ retail locations

Created market intelligence platform helping Fortune xxx tech companies optimize their go-to-market strategy

Delivered custom analytics solution for major retailer resulting in regional expansion strategy



[Cool Brand]	June 2016 – August 2019

IT distributor with xxx+ vendor partnerships including Apple, Samsung, and Lenovo

PRODUCT MANAGER	

Led product development and vendor relations for IT distribution company serving xxxx+ retail locations:

Launched x consumer electronics product lines from concept to market, including full go-to-market strategy

Organized annual B2B tech summit connecting xx+ vendors with key retail partners

Built vendor analytics platform tracking performance metrics across retail network

Managed relationships with major tech vendors including Samsung, Apple, and HP

Created product roadmap and marketing strategy for new electronics category

PROJECTS

xxx: Senior Product Manager

Mental health care and hypnotherapy app for women to help them manifest and embrace a life filled with confidence and fulfilment

https://xxxx



Medtech/wellness: Senior Product Manager

Building product strategy of a medical fertility device. Responsible for:

Product positioning strategy

Pricing

Promotion

Distribution channels

EDUCATION

Master's Degree in Marketing, University of London, xxx. Dissertation: "Understanding User Interaction with AI Systems" (Distinguished)

Bachelor's Degree in Computer Science and Global Economics, RF Trade Academy

LEADERSHIP

Conference speaker on ML Product Development

Mentor for aspiring ML Product Managers

Published research on Human-AI Interaction

PROFESSIONAL DEVELOPMENT 

Data-Driven Product Management, GoPractice Simulator 

Product Leader Certificate, Product School

Complete SQL Mastery	

GDPR Certified	

EXECUTIVE STRENGTHS

ML Product Strategy, Computer Vision Products, Recommendation Systems, A/B Testing, Data-Driven Decision Making, Product Analytics, User Research & Discovery, Product Development, Risk Management & Security, Product Requirements, Feature Prioritization, Agile Methodologies, Cross-Functional Leadership, Stakeholder Management, Go-to-Market Strategy, Product Metrics & KPIs, Business Analysis, Product Operations, Team Collaboration, Process Optimization

TECHNICAL SKILLS

Computer Vision, Face Recognition, PyTorch, SQL, Python, A/B Testing Framework, Statistical Analysis, Recommendation Engines, Amplitude, Google Analytics, Tableau, BigQuery, JIRA, Confluence, Miro, Figma, AWS SageMaker, Azure ML, GPT-4, Claude, MLflow, Git`;

/**
 * Reformats resume text according to the fixed template using ChatGPT
 */
export const reformatResumeWithTemplate = async (resumeText: string): Promise<string> => {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    console.log('=== Reformating resume with template ===');
    console.log('Resume text length:', resumeText.length);

    const systemPrompt = `You are given one fixed template.

Your task is to take any resume I provide and rewrite it strictly according to this template.

Rules:

Use only the information from the resume.

If a section in the template is missing information, leave that section empty. Do not invent anything.

If the resume contains relevant details that don't fit into any section of the template, put them into a new section called "Additional Information."

Keep the structure, section names, formatting, and order of the template exactly as provided.

Please, do not change the order of sections from the template.

And please - delete info from the header (number, linkedin link, email and other contact info, as well as name and last name).

Delete XXX XXX Title as well.

IMPORTANT! And please DO NOT CHANGE information from the resume. Just restructure it and put into appropriate sections.

Rewrite all content in clear, concise, natural English.

Do not add clichés, generic phrases, or assumptions.

After this message, I will send you:

The fixed template

A resume to convert

You will respond with the resume rewritten strictly inside that template.`;

    const userMessage = `Here is the fixed template:

${RESUME_TEMPLATE}

---

Here is the resume to convert:

${resumeText}

---

Please rewrite the resume strictly according to the template structure, formatting, and order.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const reformattedResume = response.choices[0]?.message?.content || '';
    
    console.log('Resume reformatted successfully');
    console.log('Reformatted resume length:', reformattedResume.length);
    
    return reformattedResume.trim();
  } catch (error) {
    console.error('Error reformatting resume:', error);
    throw error;
  }
};

