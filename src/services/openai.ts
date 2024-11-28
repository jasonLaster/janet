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
- Include the company name at the beginning of the filename
- Use the date of the document as part of the filename. Convert the date to YYYY-MM-DD. 
- Use the document type as part of the filename
- Use the document number as part of the filename
- Include a description of the content of the document as part of the filename
- prefer spaces to underscores between words
- use a dash to separate the company name from the document type


          <content>
          ${content.slice(0, 10000)}
          </content>
          
          
          Here are some examples of good filenames:
          <examples>
          2024-07-12 Octave Health Group - 1095C Employer Provided Health Insurance Coverage.pdf
          2024-07-12 Pettinato Associates - Claim Confirmation 10119982.pdf
          2024-07-12 Chase Credit Card - Returned Payment Notice 03724.pdf
          2024-07-12 Mozilla - Earnings Summary W2 203488.pdf
          2024-07-12 Weight Watchers - W2 Earnings Summary 156930.pdf
          2024-07-12 OConnor Davies - Tax Organizer 756359.pdf
          </examples>

          Here are some examples of bad filenames:
          <examples>
          {
            "filename": "20210923 Sutter Health - Outpatient Perinatal Services Antepartum Testing Orders 60928.pdf",
            "reason": "The date is not in YYYY-MM-DD format."
          }

          {
            "filename": "2021-09-23 Sutter Health Outpatient Perinatal Services Antepartum Testing Orders 60928.pdf",
            "reason": "The company is missing the - separator."
          }

          {
            "filename": "20240712_AT&T - Direct TV Stream Setup and Installation Guide",
            "reason": "The date is not YYYY-MM-DD format. There is an underscore after the date. The // should be ::"
          }
          </example>
          </examples>


          Here are some example of bad renaming:
            From: 2024-07-01 Stanford Health Care - Monthly Statement 102800925.pdf
            To:   20240701_Stanford Health Care - Monthly Statement 102800925.pdf
            Reason: the date is not in YYYY-MM-DD format.

            From: 20230626 East Bay Pediatrics - Statement 33309.pdf
            To:   20230626_East Bay Pediatrics - Statement 33309.pdf
            Reason: the date is not in YYYY-MM-DD format. There is an underscore after the date.
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