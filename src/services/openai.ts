import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({ apiKey });

interface FileAnalysis {
  filename: string;
}

interface FilenameResponse {
  filename: string;
}

export async function suggestNewName(filename: string, content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are helping rename PDF files based on their content. Create descriptive, clean filenames that follow the format: YYYYMMDD_Description.pdf. Return your response as a JSON object with the schema: { \"filename\": string }"
        },
        {
          role: "user",
          content: `Please suggest a new filename for this PDF. 
          
Current filename: ${filename}

Suggestions:
- The filename should follow this exact format: YYYY-MM-DD Company Name - Description
- The company name should be at the beginning after the date
- The date must be in YYYY-MM-DD format (with dashes)
- Use a single dash (-) to separate the company name from the description
- Use spaces between other words, not underscores
- The description should be concise but informative, including:
  - Document type (e.g. W2, 1095C, Statement)
  - Document number if available
  - Key details about the content

Here are some examples of good filenames:
<examples>
2024-07-12 Octave Health Group - 1095C Form 10119982.pdf
2024-07-12 Pettinato Associates - Insurance Claim 10119982.pdf
2024-07-12 Chase - Credit Card Statement 03724.pdf
2024-07-12 Mozilla - W2 Form 203488.pdf
2024-07-12 Weight Watchers - W2 Form 156930.pdf
2024-07-12 OConnor Davies - Tax Organizer 756359.pdf
</examples>

Here are some examples of bad filenames:
<examples>
- 20240712 Sutter Health - Medical Statement.pdf
  (Date is not in YYYY-MM-DD format with dashes)

- 2024-07-12_Sutter_Health-Medical_Statement.pdf
  (Uses underscores instead of spaces)

- 2024-07-12 Sutter Health Medical Statement.pdf
  (Missing the dash separator after company name)
</examples>

<content>
${content.slice(0, 10000)}
</content>
          `
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
      response_format: { "type": "json_object" }
    });

    try {
      const suggestion = response.choices[0].message.content?.trim();
      const parsed: FilenameResponse | null = suggestion ? JSON.parse(suggestion) : null;
      return parsed?.filename || filename;
    } catch (error) {
      console.error('Error parsing suggestion:', error);
      return filename;
    }
  } catch (error) {
    console.error('Error suggesting name:', error);
    return filename;
  }
} 