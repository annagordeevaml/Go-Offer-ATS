/**
 * Utility function to determine unified titles for a candidate based on their job title
 * This can be used to automatically categorize existing candidates
 */

const UNIFIED_TITLES = [
  'CEO',
  'COO',
  'CTO',
  'CPO',
  'CMO',
  'CFO',
  'CHRO',
  'Product Manager',
  'Program Manager',
  'Project Manager',
  'Software Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'Full-Stack Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Cybersecurity Engineer',
  'Data Engineer',
  'Machine Learning Engineer',
  'Analyst',
  'BI Developer',
  'Data Scientist',
  'QA',
  'UX/UI Designer',
  'Product Designer',
  'Graphic Designer',
  'Motion Designer',
  'Marketing Manager',
  'Content Manager',
  'Social Media Manager',
  'Sales Manager',
  'Business Development Manager',
  'Account Manager',
  'Customer Success Manager',
  'Customer Support Manager',
  'Operations Manager',
  'Supply Chain Manager',
  'Logistics Manager',
  'Strategy Manager',
  'Event Manager',
  'Finance Manager',
  'HR Manager',
  'Mobile Engineer',
  'Recruiter',
  'Legal Counsel',
  'SDET',
  'Others',
];

/**
 * Determines unified titles based on job title using simple keyword matching
 * For more accurate results, use ChatGPT API
 */
export function determineUnifiedTitlesSimple(jobTitle: string): string[] {
  if (!jobTitle) return [];
  
  const title = jobTitle.toLowerCase();
  const matches: string[] = [];
  
  // Executive titles
  if (title.includes('ceo') || title.includes('chief executive')) matches.push('CEO');
  if (title.includes('coo') || title.includes('chief operating')) matches.push('COO');
  if (title.includes('cto') || title.includes('chief technology')) matches.push('CTO');
  if (title.includes('cpo') || title.includes('chief product')) matches.push('CPO');
  if (title.includes('cmo') || title.includes('chief marketing')) matches.push('CMO');
  if (title.includes('cfo') || title.includes('chief financial')) matches.push('CFO');
  if (title.includes('chro') || title.includes('chief human')) matches.push('CHRO');
  
  // Product/Program/Project Managers
  if (title.includes('product manager') && !title.includes('marketing')) matches.push('Product Manager');
  if (title.includes('program manager')) matches.push('Program Manager');
  if (title.includes('project manager')) matches.push('Project Manager');
  
  // Engineers
  if (title.includes('software engineer') || title.includes('software developer')) {
    if (title.includes('backend') || title.includes('back-end')) matches.push('Backend Engineer');
    else if (title.includes('frontend') || title.includes('front-end') || title.includes('front end')) matches.push('Frontend Engineer');
    else if (title.includes('full') && title.includes('stack')) matches.push('Full-Stack Engineer');
    else matches.push('Software Engineer');
  }
  if (title.includes('devops') || title.includes('dev ops')) matches.push('DevOps Engineer');
  if (title.includes('cloud engineer')) matches.push('Cloud Engineer');
  if (title.includes('cybersecurity') || title.includes('cyber security') || title.includes('security engineer')) matches.push('Cybersecurity Engineer');
  if (title.includes('data engineer') && !title.includes('scientist')) matches.push('Data Engineer');
  if (title.includes('machine learning') || title.includes('ml engineer')) matches.push('Machine Learning Engineer');
  if (title.includes('mobile engineer') || title.includes('ios engineer') || title.includes('android engineer')) matches.push('Mobile Engineer');
  
  // Data/Analytics
  if (title.includes('data scientist')) matches.push('Data Scientist');
  if (title.includes('bi developer') || title.includes('business intelligence')) matches.push('BI Developer');
  if (title.includes('analyst') && !title.includes('data scientist')) matches.push('Analyst');
  
  // QA/Testing
  if (title.includes('qa') || title.includes('quality assurance') || title.includes('test engineer')) matches.push('QA');
  if (title.includes('sdet') || title.includes('software development engineer in test')) matches.push('SDET');
  
  // Designers
  if (title.includes('ux') || title.includes('ui') || title.includes('user experience') || title.includes('user interface')) matches.push('UX/UI Designer');
  if (title.includes('product designer') && !title.includes('manager')) matches.push('Product Designer');
  if (title.includes('graphic designer')) matches.push('Graphic Designer');
  if (title.includes('motion designer')) matches.push('Motion Designer');
  
  // Managers
  if (title.includes('marketing manager')) matches.push('Marketing Manager');
  if (title.includes('content manager')) matches.push('Content Manager');
  if (title.includes('social media manager')) matches.push('Social Media Manager');
  if (title.includes('sales manager')) matches.push('Sales Manager');
  if (title.includes('business development manager')) matches.push('Business Development Manager');
  if (title.includes('account manager')) matches.push('Account Manager');
  if (title.includes('customer success manager')) matches.push('Customer Success Manager');
  if (title.includes('customer support manager')) matches.push('Customer Support Manager');
  if (title.includes('operations manager')) matches.push('Operations Manager');
  if (title.includes('supply chain manager')) matches.push('Supply Chain Manager');
  if (title.includes('logistics manager')) matches.push('Logistics Manager');
  if (title.includes('strategy manager')) matches.push('Strategy Manager');
  if (title.includes('event manager')) matches.push('Event Manager');
  if (title.includes('finance manager')) matches.push('Finance Manager');
  if (title.includes('hr manager') || title.includes('human resources manager')) matches.push('HR Manager');
  
  // Other roles
  if (title.includes('recruiter') || title.includes('talent acquisition')) matches.push('Recruiter');
  if (title.includes('legal counsel') || title.includes('attorney') || title.includes('lawyer')) matches.push('Legal Counsel');
  
  // If no matches found, return empty array (or 'Others' if needed)
  return matches.length > 0 ? matches : [];
}

/**
 * Determines unified titles using ChatGPT API for more accurate results
 */
export async function determineUnifiedTitlesWithAI(
  jobTitle: string,
  industries?: string[],
  companyNames?: string[]
): Promise<string[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API key not found, using simple matching');
    return determineUnifiedTitlesSimple(jobTitle);
  }

  try {
    const openai = (await import('openai')).default;
    const client = new openai({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    const context = [
      `Job Title: ${jobTitle}`,
      industries && industries.length > 0 ? `Industries: ${industries.join(', ')}` : '',
      companyNames && companyNames.length > 0 ? `Companies: ${companyNames.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a job title classifier. Given a job title and context, determine which standardized unified titles from this list apply:

CEO, COO, CTO, CPO, CMO, CFO, CHRO, Product Manager, Program Manager, Project Manager, Software Engineer, Backend Engineer, Frontend Engineer, Full-Stack Engineer, DevOps Engineer, Cloud Engineer, Cybersecurity Engineer, Data Engineer, Machine Learning Engineer, Analyst, BI Developer, Data Scientist, QA, UX/UI Designer, Product Designer, Graphic Designer, Motion Designer, Marketing Manager, Content Manager, Social Media Manager, Sales Manager, Business Development Manager, Account Manager, Customer Success Manager, Customer Support Manager, Operations Manager, Supply Chain Manager, Logistics Manager, Strategy Manager, Event Manager, Finance Manager, HR Manager, Mobile Engineer, Recruiter, Legal Counsel, SDET, Others

Return ONLY a JSON array of matching unified titles. Example: ["Software Engineer", "Backend Engineer"]`,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return determineUnifiedTitlesSimple(jobTitle);

    // Try to parse JSON array
    try {
      const titles = JSON.parse(content);
      if (Array.isArray(titles)) {
        return titles.filter((t: string) => UNIFIED_TITLES.includes(t));
      }
    } catch (e) {
      console.warn('Failed to parse AI response, using simple matching');
    }

    return determineUnifiedTitlesSimple(jobTitle);
  } catch (error) {
    console.error('Error determining unified titles with AI:', error);
    return determineUnifiedTitlesSimple(jobTitle);
  }
}


