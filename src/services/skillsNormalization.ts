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

  const systemPrompt = `You are a skills normalization expert. Your task is to normalize and standardize a list of skills, tools, technologies, business knowledge, and related items.

CRITICAL RULES:
1. Convert ALL text to English (translate if needed) - this is MANDATORY
2. Convert all text to LOWERCASE
3. PRESERVE ALL concrete tool names - keep them recognizable:
   - "HubSpot" → "hubspot" (NOT "hubspot crm" or "crm")
   - "Tableau" → "tableau" (NOT "tableau bi" or "bi tool")
   - "Klaviyo" → "klaviyo" (NOT "klaviyo email" or "email marketing")
   - "Power BI" → "power bi" (keep as two words)
   - "Google Analytics" → "google analytics" (keep as two words)
   - "Mailchimp" → "mailchimp"
   - "Figma" → "figma"
   - "SEMrush" → "semrush"
   - Keep ALL tool names as they are, just lowercase them
4. KEEP ALL types of skills:
   - Hard skills: programming languages, frameworks, technologies (e.g., "javascript", "react", "sql")
   - Soft skills: communication, leadership, teamwork, problem-solving, etc.
   - Business skills: business strategy, market analysis, financial planning, product management, etc.
   - Tools: all concrete tool names (hubspot, tableau, figma, etc.)
   - Methodologies: agile, scrum, kanban, etc.
5. Standardize skill names:
   - Remove version numbers (e.g., "React 18" -> "react", "Python 3.9" -> "python")
   - Standardize common variations (e.g., "React.js" -> "react", "JS" -> "javascript", "NodeJS" -> "node.js")
   - Use standard abbreviations (e.g., "JavaScript" -> "javascript", "TypeScript" -> "typescript")
   - Remove common prefixes/suffixes (e.g., "Proficient in" -> remove, "Expert at" -> remove)
6. Remove duplicates (including case variations)
7. Remove empty or meaningless entries
8. Keep ALL relevant skills: technical, soft, business, tools, platforms, systems
9. Return as a JSON array of strings, each skill as a separate item
10. Do NOT add any skills that were not in the input
11. Preserve the semantic meaning of each skill
12. IMPORTANT: If a tool name is in Russian or another language, translate it to English but keep the tool name recognizable (e.g., "Яндекс.Метрика" -> "yandex metrica", "АМО CRM" -> "amo crm")

Examples:
- Input: ["HubSpot", "Salesforce", "Leadership", "Business Strategy", "JavaScript", "Tableau"]
  Output: ["hubspot", "salesforce", "leadership", "business strategy", "javascript", "tableau"]

- Input: ["Klaviyo", "Mailchimp", "Communication", "Teamwork", "Figma", "Sketch"]
  Output: ["klaviyo", "mailchimp", "communication", "teamwork", "figma", "sketch"]

- Input: ["React.js", "JavaScript", "Problem-solving", "Market Analysis", "NodeJS", "Agile"]
  Output: ["react", "javascript", "problem-solving", "market analysis", "node.js", "agile"]

- Input: ["Яндекс.Метрика", "Google Analytics", "АМО CRM", "HubSpot", "Лидерство", "Бизнес-стратегия"]
  Output: ["yandex metrica", "google analytics", "amo crm", "hubspot", "leadership", "business strategy"]

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
 * Normalize skills for a single job description
 * Uses the same comprehensive prompt to extract skills with analogues from job descriptions
 */
export async function normalizeJobSkills(jobId: string | number, jobDescription: string): Promise<string[]> {
  if (!jobDescription || jobDescription.trim().length === 0) {
    return [];
  }

  // Extract skills from job description using comprehensive structured prompt
  const extractionPrompt = `Я дам тебе текст вакансии.

Твоя задача — вытащить абсолютно все хард-скиллы, инструменты, технологии, софт-скиллы, области знаний, производственные задачи и компетенции, которые прямо или косвенно упомянуты в вакансии.

Ты НЕ имеешь права пропустить ни один пункт.

Если сомневаешься — включай.

После того как сформируешь список — ты обязан сделать второй проход по тексту и проверить, что ты ничего не пропустил.

Добавь всё, что обнаружишь во втором проходе.

📌 ОБЯЗАТЕЛЬНО раздели результат на следующие категории:

1️⃣ HARD SKILLS

Включи ВСЕ навыки, которые:

- упомянуты буквально
- явно описаны через действия (например: «писать ТЗ», «проводить вебинары», «считать ROI»)
- логически вытекают из обязанностей (например: «координация отделов» → skill: cross-functional coordination)

⚠️ Ты обязан пройтись построчно по всему тексту и вынести ВСЁ.

2️⃣ SOFTWARE & TOOLS

Формат для каждого инструмента:

Название (из текста) — аналоги: X, Y, Z

Аналоги должны быть:
- рыночными конкурентами
- функционально эквивалентными
- взаимозаменяемыми для хард-скилла

Не добавляй в основной список то, чего нет в тексте — только в блок «аналоги».

3️⃣ KNOWLEDGE AREAS / DOMAINS / METHODOLOGIES

Включи ВСЁ, что связано с:

- EdTech
- SaaS
- Growth
- CJM
- лидогенерацией
- автоворонками
- мультиканальным маркетингом
- аналитикой
- startup environment
- международными рынками
- управлением контентом
- работой с блогерами, партнёрствами
и т.д.

⚠️ Если это область знаний — она должна быть включена.
⚠️ Если упомянуто в контексте — включай.

4️⃣ SOFT SKILLS

Включи ВСЁ, что:

- явно упомянуто
- вытекает из обязанностей (например: работа в условиях хаоса → adaptability)
- указывает на стиль работы (ownership, prioritization, communication, leadership, accountability)

5️⃣ JOB RESPONSIBILITIES (вытянуть дословно + привести к глаголу в инфинитиве)

Пройдись по ВСЕМ разделам вакансии:

- обязанности
- что нужно будет делать
- контекст
- вызовы
- типичный день

И собери ВСЕ задачи, включая повторяющиеся — но объединяя одинаковые по смыслу.

🔁 ДВОЙНАЯ ПРОВЕРКА ОБЯЗАТЕЛЬНА

1️⃣ Пройди текст построчно
2️⃣ Сформируй списки
3️⃣ Пройди текст повторно, сверяясь со списками
4️⃣ Добавь всё пропущенное

В конце напиши:

"Двойная проверка завершена — ничего не пропущено."

❗ Формат вывода

Структура:

1. Hard Skills
- …
- …

2. Software & Tools
- инструмент — аналоги: …
- инструмент — аналоги: …

3. Knowledge Areas
- …
- …

4. Soft Skills
- …
- …

5. Job Responsibilities
- …
- …

Двойная проверка завершена — ничего не пропущено.

Никаких длинных описаний. Только чёткие списки.

Текст вакансии:

${jobDescription}`;

  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Retry logic for rate limit errors
    const maxRetries = 5;
    let lastError: any = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a comprehensive skills extraction expert. Extract ABSOLUTELY ALL hard skills, tools, technologies, soft skills, knowledge areas, tasks, and competencies that are directly or indirectly mentioned in the job description. You MUST NOT skip any item. If in doubt, include it. After forming the list, you MUST do a second pass through the text and check that nothing was missed. Format your response in 5 sections: 1) Hard Skills (including those logically derived from responsibilities), 2) Software & Tools (with market competitors/analogues), 3) Knowledge Areas/Domains/Methodologies (all mentioned contexts), 4) Soft Skills (explicitly mentioned + derived from responsibilities), 5) Job Responsibilities (extract verbatim + convert to infinitive verbs). At the end, write: "Двойная проверка завершена — ничего не пропущено." Return only clear lists, no long descriptions. All skills should be in English, lowercase.',
            },
            { role: 'user', content: extractionPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        });
        
        // Success - process structured response with sections
        let skillsText = response.choices[0]?.message?.content?.trim() || '';
        
        console.log(`  → ChatGPT response length: ${skillsText.length} characters`);
        console.log(`  → ChatGPT response preview: ${skillsText.substring(0, 500)}...`);
        
        // Parse structured response with sections
        let extractedSkills: string[] = [];
        if (skillsText) {
          // Extract skills from all sections except "Job Responsibilities"
          const sections = skillsText.split(/(?:^|\n)(?:1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|1\.|2\.|3\.|4\.|5\.)/);
          
          sections.forEach((section, index) => {
            // Skip section 5 (Job Responsibilities) and first empty section
            if (index === 0 || section.includes('Job Responsibilities') || section.includes('Обязанности') || section.includes('Двойная проверка')) {
              return;
            }
            
            // Extract skills from this section
            let sectionSkills: string[] = [];
            
            // Remove section headers and verification message
            section = section
              .replace(/^(Hard Skills|HARD SKILLS|Software & Tools|SOFTWARE & TOOLS|Knowledge Areas|KNOWLEDGE AREAS|Methodologies|METHODOLOGIES|Soft Skills|SOFT SKILLS|Job Responsibilities|JOB RESPONSIBILITIES).*?$/gmi, '')
              .replace(/^[1-5]️⃣.*?$/gm, '')
              .replace(/^[1-5]\.\s*/gm, '')
              .replace(/Двойная проверка завершена.*$/gmi, '')
              .trim();
            
            // Parse lines with format "Tool — аналоги: Tool1, Tool2, Tool3"
            const lines = section.split(/\n/);
            lines.forEach(line => {
              line = line.trim();
              if (!line || line.length === 0) return;
              
              // Check if line has "— аналоги:" or "analogues:" or "analogs:"
              if (line.match(/[—–-]\s*(аналоги|analogues?|competitors?):?\s*/i)) {
                // Extract main tool and analogues
                const parts = line.split(/[—–-]\s*(аналоги|analogues?|competitors?):?\s*/i);
                if (parts.length >= 2) {
                  const mainTool = parts[0].trim();
                  const analogues = parts[parts.length - 1].split(',').map(s => s.trim());
                  
                  // Add main tool
                  if (mainTool && mainTool.length > 0 && mainTool.length < 100) {
                    sectionSkills.push(mainTool);
                  }
                  
                  // Add analogues
                  analogues.forEach(analogue => {
                    analogue = analogue.replace(/[.,;]$/, '').trim();
                    if (analogue && analogue.length > 0 && analogue.length < 100) {
                      sectionSkills.push(analogue);
                    }
                  });
                }
              } else {
                // Regular line - might be a skill or list of skills
                // Try splitting by comma
                const skillsInLine = line.split(',').map(s => s.trim());
                skillsInLine.forEach(skill => {
                  // Remove common prefixes/suffixes
                  skill = skill
                    .replace(/^[-•*]\s*/, '') // Remove bullet points
                    .replace(/[—–-]\s*аналог:?\s*/i, '') // Remove "— аналог:" suffix
                    .replace(/→\s*/g, '') // Remove arrow
                    .trim();
                  
                  if (skill && skill.length > 0 && skill.length < 100) {
                    // Skip if it's a header or description
                    if (!skill.match(/^(Hard Skills|Software|Tools|Methodologies|Soft Skills|Job Responsibilities|Responsibilities|Skills|Tools|Technologies|Platforms|Systems|Knowledge Areas).*?$/i)) {
                      sectionSkills.push(skill);
                    }
                  }
                });
              }
            });
            
            extractedSkills.push(...sectionSkills);
          });
          
          // If structured parsing didn't work well, fall back to simple parsing
          if (extractedSkills.length === 0) {
            // Remove any markdown code blocks, quotes, brackets
            skillsText = skillsText
              .replace(/```[\s\S]*?```/g, '') // Remove code blocks
              .replace(/\[|\]/g, '') // Remove brackets
              .replace(/"/g, '') // Remove quotes
              .replace(/'/g, '') // Remove single quotes
              .trim();
            
            // Try splitting by comma
            let skillsArray = skillsText.split(',');
            
            // If that didn't work well, try other delimiters
            if (skillsArray.length === 1 || (skillsArray.length === 1 && skillsArray[0].length > 500)) {
              // Try splitting by newlines or semicolons
              skillsArray = skillsText.split(/[\n;]/);
            }
            
            // Process each skill
            extractedSkills = skillsArray
              .map(s => s.trim())
              .filter(s => {
                // Remove empty strings
                if (!s || s.length === 0) return false;
                // Remove too long strings (likely not a skill name)
                if (s.length > 100) return false;
                // Remove common headers/prefixes
                if (s.match(/^(skills?|tools?|technologies?|platforms?|systems?|Hard Skills|Software|Tools|Methodologies|Soft Skills|Job Responsibilities|Responsibilities|Knowledge Areas):?\s*$/i)) return false;
                // Remove strings that are just numbers or special chars
                if (s.match(/^[\d\s\-_\.]+$/)) return false;
                return true;
              })
              .map(s => {
                // Remove leading/trailing punctuation and arrows
                return s.replace(/^[:\-\s→]+|[:\-\s→]+$/g, '').trim();
              })
              .filter(s => s.length > 0);
          }
          
          // Final processing
          extractedSkills = extractedSkills
            .map(s => {
              // Remove leading/trailing punctuation, arrows, bullet points
              return s.replace(/^[-•*→:\s]+|[-•*→:\s]+$/g, '').trim();
            })
            .filter(s => {
              // Remove empty strings
              if (!s || s.length === 0) return false;
              // Remove too long strings
              if (s.length > 100) return false;
              // Remove common headers/prefixes
              if (s.match(/^(Hard Skills|Software|Tools|Methodologies|Soft Skills|Job Responsibilities|Responsibilities|Skills|Tools|Technologies|Platforms|Systems|Knowledge Areas|аналоги|analogues?|competitors?):?\s*$/i)) return false;
              // Remove strings that are just numbers or special chars
              if (s.match(/^[\d\s\-_\.]+$/)) return false;
              return true;
            })
            .map(s => s.toLowerCase()) // Convert to lowercase
            .filter((skill, index, self) => self.indexOf(skill) === index); // Remove duplicates
          
          console.log(`  → Parsed ${extractedSkills.length} skills from response`);
          if (extractedSkills.length > 0) {
            console.log(`  → First 15 skills: ${extractedSkills.slice(0, 15).join(', ')}`);
          }
        }

        if (extractedSkills.length === 0) {
          console.warn(`  ⚠ No skills parsed from ChatGPT response`);
          return [];
        }

        // Normalize the extracted skills (translate to English, lowercase, standardize)
        console.log(`  → Normalizing ${extractedSkills.length} skills...`);
        const normalizedSkills = await normalizeSkills(extractedSkills);
        
        console.log(`  ✓ Final normalized skills count: ${normalizedSkills.length}`);
        
        return normalizedSkills;
        
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error
        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate limit') || error?.message?.includes('quota')) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 60000); // Exponential backoff, max 60 seconds
          console.warn(`  ⚠ Rate limit error (attempt ${attempt + 1}/${maxRetries}). Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry
        } else {
          // Not a rate limit error, throw immediately
          throw error;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('Failed after all retries');
  } catch (error) {
    console.error(`Error extracting skills for job ${jobId}:`, error);
    return [];
  }
}

/**
 * Normalize skills for a single candidate
 * Uses the same comprehensive prompt as resume parser to extract skills with analogues
 */
export async function normalizeCandidateSkills(candidateId: string, resumeText: string): Promise<string[]> {
  if (!resumeText || resumeText.trim().length === 0) {
    return [];
  }

  // Extract skills from resume using comprehensive structured prompt
  const extractionPrompt = `Ниже я дам тебе данные кандидата в поле resume_data.

Твоя задача — вытащить из резюме абсолютно все хард-скиллы, инструменты, технологии, обязанности, достижения, методологии и софт-скиллы, которые прямо или косвенно указаны в резюме.

Ты НЕ имеешь права пропустить ни один факт.

Если сомневаешься — включи.

После составления списков ты обязан сделать второй проход по полю resume_data и проверить, что ничего не пропущено.

📌 СТРОГО ВЫВОДИ РЕЗУЛЬТАТ В СЛЕДУЮЩИХ КАТЕГОРИЯХ:

1️⃣ HARD SKILLS (ТОЛЬКО то, что есть в резюме)

Включи ВСЕ навыки, которые:

- прямо перечислены
- описаны через действия (управлял → управление; анализировал → аналитика)
- явно вытекают из опыта (если в опыте «оптимизировал расходы» → skill: cost optimization)

⚠️ Построчно пройти резюме и вынести всё.

2️⃣ SOFTWARE & TOOLS

Формат:

Название инструмента (из резюме) — аналоги: X, Y, Z

Аналоги должны быть:

- реальными
- функционально близкими
- общерыночными
- взаимозаменяемыми

Примеры:
— SQL → аналоги: PostgreSQL, MySQL, BigQuery
— Salesforce → аналоги: HubSpot, Zoho, Pipedrive
— Figma → аналоги: Sketch, Adobe XD

⚠️ В основной список включай только то, что реально есть в данных кандидата.
Аналоги можно добавить свободно.

3️⃣ KNOWLEDGE AREAS / DOMAINS / METHODOLOGIES

Включи всё, что относится к:

- индустриям кандидата
- областям знаний
- методологиям (Agile, Scrum, Kanban…)
- направлениям экспертизы (growth, product analytics, operations, marketing, finance…)
- специфике домена (EdTech, SaaS, healthcare, e-commerce…)

⚠️ Если область знаний явно присутствует — включи.
⚠️ Если указано в контексте – тоже включи.

4️⃣ SOFT SKILLS

Включи только то, что можно точно определить из резюме:

- лидерство
- кросс-функциональное взаимодействие
- коммуникация
- управление командой
- приоритизация
- работа в неопределённости
- stakeholder management
- принятие решений
и т.п.

⚠️ Нельзя выдумывать — только то, что действительно следует из опыта кандидата.

5️⃣ JOB RESPONSIBILITIES (вытянуть из опыта кандидата)

Собери ВСЕ обязанности, описанные в резюме:

Правила:

- превратить описание опыта в список конкретных действий
- каждое действие должно быть выражено через глагол в инфинитиве:
  «управлял командой из 5 человек» → «управлять командой»
  «строил дашборды» → «создавать дашборды»
  «делал SQL-запросы» → «писать SQL-запросы»
- не пропускать ни одну обязанность

⚠️ Пройди весь опыт кандидата до последней точки.

6️⃣ ACHIEVEMENTS (всё, что связано с результатами кандидата)

Вытащить:

- количественные показатели (рост %, сокращение $, MRR, CAC…)
- внедрённые решения
- автоматизации
- процессы, которые кандидат улучшил
- проекты, которые привели к результатам

♻️ ДВОЙНАЯ ПРОВЕРКА ОБЯЗАТЕЛЬНА

После генерации всех категорий:

✔ Вернись к полю resume_data
✔ Пройдись ещё раз построчно
✔ Добавь всё, что забыл
✔ Напиши:

"Двойная проверка завершена — ничего не пропущено."

📌 ФОРМАТ ВЫВОДА

1. Hard Skills
- …
- …

2. Software & Tools
- инструмент — аналоги: …
- …

3. Knowledge Areas
- …

4. Soft Skills
- …

5. Job Responsibilities
- …

6. Achievements
- …

Двойная проверка завершена — ничего не пропущено.

Данные кандидата (resume_data):

${resumeText}`;

  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Retry logic for rate limit errors
    const maxRetries = 5;
    let lastError: any = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a comprehensive skills extraction expert. Extract ABSOLUTELY ALL hard skills, tools, technologies, responsibilities, achievements, methodologies, and soft skills that are directly or indirectly mentioned in the candidate resume. You MUST NOT skip any fact. If in doubt, include it. After forming the lists, you MUST do a second pass through resume_data and check that nothing was missed. Format your response in 6 sections: 1) Hard Skills (only from resume, including those derived from experience), 2) Software & Tools (with market analogues/competitors), 3) Knowledge Areas/Domains/Methodologies (all mentioned contexts), 4) Soft Skills (only what can be accurately determined from resume), 5) Job Responsibilities (extract from experience, convert to infinitive verbs), 6) Achievements (quantitative metrics, implemented solutions, automations, improved processes, projects with results). At the end, write: "Двойная проверка завершена — ничего не пропущено." Return only clear lists, no long descriptions. All skills should be in English, lowercase.',
            },
            { role: 'user', content: extractionPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        });
        
        // Success - process structured response with sections
        let skillsText = response.choices[0]?.message?.content?.trim() || '';
        
        console.log(`  → ChatGPT response length: ${skillsText.length} characters`);
        console.log(`  → ChatGPT response preview: ${skillsText.substring(0, 500)}...`);
        
        // Parse structured response with sections
        let extractedSkills: string[] = [];
        if (skillsText) {
          // Extract skills from all sections except "Job Responsibilities" and "Achievements"
          const sections = skillsText.split(/(?:^|\n)(?:1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|1\.|2\.|3\.|4\.|5\.|6\.)/);
          
          sections.forEach((section, index) => {
            // Skip section 5 (Job Responsibilities), section 6 (Achievements), and first empty section
            if (index === 0 || section.includes('Job Responsibilities') || section.includes('Обязанности') || section.includes('Achievements') || section.includes('Достижения') || section.includes('Двойная проверка')) {
              return;
            }
            
            // Extract skills from this section
            let sectionSkills: string[] = [];
            
            // Remove section headers and verification message
            section = section
              .replace(/^(Hard Skills|HARD SKILLS|Software & Tools|SOFTWARE & TOOLS|Knowledge Areas|KNOWLEDGE AREAS|Methodologies|METHODOLOGIES|Soft Skills|SOFT SKILLS|Job Responsibilities|JOB RESPONSIBILITIES|Achievements|ACHIEVEMENTS).*?$/gmi, '')
              .replace(/^[1-6]️⃣.*?$/gm, '')
              .replace(/^[1-6]\.\s*/gm, '')
              .replace(/Двойная проверка завершена.*$/gmi, '')
              .trim();
            
            // Parse lines with format "Tool — аналоги: Tool1, Tool2, Tool3"
            const lines = section.split(/\n/);
            lines.forEach(line => {
              line = line.trim();
              if (!line || line.length === 0) return;
              
              // Check if line has "— аналоги:" or "analogues:" or "analogs:"
              if (line.match(/[—–-]\s*(аналоги|analogues?|competitors?):?\s*/i)) {
                // Extract main tool and analogues
                const parts = line.split(/[—–-]\s*(аналоги|analogues?|competitors?):?\s*/i);
                if (parts.length >= 2) {
                  const mainTool = parts[0].trim();
                  const analogues = parts[parts.length - 1].split(',').map(s => s.trim());
                  
                  // Add main tool
                  if (mainTool && mainTool.length > 0 && mainTool.length < 100) {
                    sectionSkills.push(mainTool);
                  }
                  
                  // Add analogues
                  analogues.forEach(analogue => {
                    analogue = analogue.replace(/[.,;]$/, '').trim();
                    if (analogue && analogue.length > 0 && analogue.length < 100) {
                      sectionSkills.push(analogue);
                    }
                  });
                }
              } else {
                // Regular line - might be a skill or list of skills
                // Try splitting by comma
                const skillsInLine = line.split(',').map(s => s.trim());
                skillsInLine.forEach(skill => {
                  // Remove common prefixes/suffixes
                  skill = skill
                    .replace(/^[-•*]\s*/, '') // Remove bullet points
                    .replace(/[—–-]\s*аналог:?\s*/i, '') // Remove "— аналог:" suffix
                    .replace(/→\s*/g, '') // Remove arrow
                    .trim();
                  
                  if (skill && skill.length > 0 && skill.length < 100) {
                    // Skip if it's a header or description
                    if (!skill.match(/^(Hard Skills|Software|Tools|Methodologies|Soft Skills|Job Responsibilities|Responsibilities|Skills|Tools|Technologies|Platforms|Systems|Knowledge Areas|Achievements|Достижения).*?$/i)) {
                      sectionSkills.push(skill);
                    }
                  }
                });
              }
            });
            
            extractedSkills.push(...sectionSkills);
          });
          
          // If structured parsing didn't work well, fall back to simple parsing
          if (extractedSkills.length === 0) {
            // Remove any markdown code blocks, quotes, brackets
            skillsText = skillsText
              .replace(/```[\s\S]*?```/g, '') // Remove code blocks
              .replace(/\[|\]/g, '') // Remove brackets
              .replace(/"/g, '') // Remove quotes
              .replace(/'/g, '') // Remove single quotes
              .trim();
            
            // Try splitting by comma
            let skillsArray = skillsText.split(',');
            
            // If that didn't work well, try other delimiters
            if (skillsArray.length === 1 || (skillsArray.length === 1 && skillsArray[0].length > 500)) {
              // Try splitting by newlines or semicolons
              skillsArray = skillsText.split(/[\n;]/);
            }
            
            // Process each skill
            extractedSkills = skillsArray
              .map(s => s.trim())
              .filter(s => {
                // Remove empty strings
                if (!s || s.length === 0) return false;
                // Remove too long strings (likely not a skill name)
                if (s.length > 100) return false;
                // Remove common headers/prefixes
                if (s.match(/^(skills?|tools?|technologies?|platforms?|systems?|Hard Skills|Software|Tools|Methodologies|Soft Skills|Job Responsibilities|Responsibilities|Knowledge Areas|Achievements):?\s*$/i)) return false;
                // Remove strings that are just numbers or special chars
                if (s.match(/^[\d\s\-_\.]+$/)) return false;
                return true;
              })
              .map(s => {
                // Remove leading/trailing punctuation and arrows
                return s.replace(/^[:\-\s→]+|[:\-\s→]+$/g, '').trim();
              })
              .filter(s => s.length > 0);
          }
          
          // Final processing
          extractedSkills = extractedSkills
            .map(s => {
              // Remove leading/trailing punctuation, arrows, bullet points
              return s.replace(/^[-•*→:\s]+|[-•*→:\s]+$/g, '').trim();
            })
            .filter(s => {
              // Remove empty strings
              if (!s || s.length === 0) return false;
              // Remove too long strings
              if (s.length > 100) return false;
              // Remove common headers/prefixes
              if (s.match(/^(Hard Skills|Software|Tools|Methodologies|Soft Skills|Job Responsibilities|Responsibilities|Skills|Tools|Technologies|Platforms|Systems|Knowledge Areas|Achievements|Достижения|аналоги|analogues?|competitors?):?\s*$/i)) return false;
              // Remove strings that are just numbers or special chars
              if (s.match(/^[\d\s\-_\.]+$/)) return false;
              return true;
            })
            .map(s => s.toLowerCase()) // Convert to lowercase
            .filter((skill, index, self) => self.indexOf(skill) === index); // Remove duplicates
          
          console.log(`  → Parsed ${extractedSkills.length} skills from response`);
          if (extractedSkills.length > 0) {
            console.log(`  → First 15 skills: ${extractedSkills.slice(0, 15).join(', ')}`);
          }
        }

        if (extractedSkills.length === 0) {
          console.warn(`  ⚠ No skills parsed from ChatGPT response`);
          return [];
        }

        // Normalize the extracted skills (translate to English, lowercase, standardize)
        console.log(`  → Normalizing ${extractedSkills.length} skills...`);
        const normalizedSkills = await normalizeSkills(extractedSkills);
        
        console.log(`  ✓ Final normalized skills count: ${normalizedSkills.length}`);
        
        return normalizedSkills;
        
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error
        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate limit') || error?.message?.includes('quota')) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 60000); // Exponential backoff, max 60 seconds
          console.warn(`  ⚠ Rate limit error (attempt ${attempt + 1}/${maxRetries}). Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry
        } else {
          // Not a rate limit error, throw immediately
          throw error;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('Failed after all retries');

  } catch (error) {
    console.error(`Error extracting skills for candidate ${candidateId}:`, error);
    return [];
  }
}


