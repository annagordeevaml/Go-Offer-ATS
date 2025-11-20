import OpenAI from 'openai';
import mammoth from 'mammoth';

const apiKey = (import.meta.env as any).VITE_OPENAI_API_KEY;

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
}

const RESUME_PARSING_PROMPT = `I'll give you a resume. You need to parse a data to form an info about candidate. These are the things you need to find in resume:

1) Full name
2) Main job title
3) Find all industries where this candidate worked. For this look for the company description in the resume. If you can not find it - then search the company on the internet. Location: take main location where candidate is positioning. As main industries mention ones which came from the company (as main industries). 1 company = 1 industry. Do not mention the company name in your answer. If a company is in several industries - split those industries to a several answers for the output.
4) Other related industries = industries which you see as an extra experience from bullet point, volunteering, project etc. Do not add your explanations. Just give the industry name.
5) LinkedIn link. If you can not find it - write "Not found"
6) Github link (if exists in the resume). If you can not find it - write "Not found"
7) Portfolio link (if exists). If you can not find it - write "Not found"
8) Count total work experience in years (start from the earliest date and calculate years until nowadays). Just give 1 final number as an answer.
9) Last updated date: should be todays date. (do not write anything except the date)
10) phone number
11) Email
12) Other social media if mentioned. If you can not find it - write "Not found"
13) All companies names where the candidate worked

Make a json output with the following exact keys (use snake_case):
- full_name
- main_job_title
- main_industries (array)
- other_related_industries (array)
- location
- linkedin
- github
- portfolio
- total_work_experience_years (number)
- last_updated_date (format: YYYY-MM-DD)
- phone_number
- email
- other_social_media
- company_names (array)

In all questions do not add your personal thoughts or explanations. Just an answer to my question

Format your response as valid JSON only, no additional text.`;

export const parseResumeWithAI = async (resumeText: string): Promise<{ data: ParsedResumeData; rawJson: string }> => {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    console.log('=== STEP 1: Preparing request to ChatGPT ===');
    console.log('System prompt:', 'You are a resume parser. Extract candidate information and return only valid JSON without any additional text or explanations.');
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
          content: 'You are a resume parser. Extract candidate information and return only valid JSON without any additional text or explanations.',
        },
        {
          role: 'user',
          content: fullUserMessage,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000, // Increased to handle longer responses
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    console.log('=== STEP 3: Received response from ChatGPT ===');
    console.log('Raw response content length:', content.length);
    console.log('Raw response content:', content);
    
    // Try to parse JSON, handle potential formatting issues
    let rawParsed: any;
    try {
      rawParsed = JSON.parse(content);
      console.log('Successfully parsed JSON');
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.error('Response content:', content);
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        rawParsed = JSON.parse(jsonMatch[1]);
        console.log('Successfully extracted JSON from markdown');
      } else {
        throw new Error('Failed to parse JSON response from ChatGPT');
      }
    }
    
    console.log('=== RAW PARSED DATA ===');
    console.log('Raw parsed object:', rawParsed);
    console.log('Raw parsed keys:', Object.keys(rawParsed));
    
    // Normalize keys - handle different formats from ChatGPT
    // ChatGPT might return: "Full name", "full_name", "Full Name", etc.
    const normalizeKey = (key: string): string => {
      const lowerKey = key.toLowerCase().trim();
      // Map common variations to expected keys
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
    };
    
    console.log('=== FINAL NORMALIZED RESULT ===');
    console.log('Final result:', result);
    console.log('Full name:', result.full_name);
    console.log('Main job title:', result.main_job_title);
    console.log('Main industries:', result.main_industries);
    console.log('Related industries:', result.other_related_industries);
    console.log('Location:', result.location);
    console.log('Company names:', result.company_names);
    
    console.log('=== STEP 4: Normalized result ===');
    console.log('Final result:', result);
    console.log('Main industries count:', result.main_industries.length);
    console.log('Related industries count:', result.other_related_industries.length);
    console.log('Company names count:', result.company_names.length);
    
    // Return both normalized data and raw JSON
    return {
      data: result,
      rawJson: content, // Return the original JSON response from ChatGPT
    };
  } catch (error) {
    console.error('Error parsing resume with AI:', error);
    throw error;
  }
};

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

