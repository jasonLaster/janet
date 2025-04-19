export const pdfMetadataPrompt = `
Please analyze this document and provide the following information:
1. Document type (statement, bill, notification, etc.)
2. Issuing organization/company
3. Primary date mentioned in the format "MM/DD/YYYY"
4. Main account holder or addressee
5. Key financial or account details (do not redact)
6. Important deadlines or action items
7. Financial details with the amounts and labels.
8. Brief summary (2-3 sentences capturing the main purpose)
9. Descriptive title for this document
10. Any other people mentioned besides the primary addressee
11. List of document labels to help me stay organized


Please analyze the document and return your analysis in the following JSON format, ensuring all fields are properly formatted:

{
  "documentType": "string - the type of document (statement, bill, notification, etc.)",
  "issuingOrganization": "string - the company or organization that issued the document",
  "primaryDate": "string - the most important date mentioned in the document",
  "accountHolder": "string - the main person or entity the document is addressed to",
  "accountDetails": "string - key financial or account details (account numbers, reference IDs, etc.)",
  "deadlines": "string - any important deadlines or action items mentioned",
  "monetaryAmounts": ["array of strings - all monetary amounts mentioned in the document"],
  "summary": "string - a 2-3 sentence summary capturing the main purpose of the document",
  "descriptiveTitle": "string - a concise descriptive title for the document",
  "otherPeople": ["array of strings - other individuals mentioned besides the primary addressee"],
  "labels": ["array of strings - 3-5 category labels to help organize this document"]
}

Try and use the following labels:
- Assessment
- Bank
- Bill
- Claims
- Debt
- Event
- Financial
- Form
- Government
- Health
- Healthcare
- Home
- Hospital
- House
- Insurance
- Investment
- Legal
- Local
- Medical
- Note
- Notice
- Payment
- Statement
- Tax

Try and use the following issuing organizations:
- Alameda County
- BASS Medical Group
- CMRE Financial Services
- California State Controller's Office
- CarelonRx
- City of Oakland False Alarm Reduction Program
- Computershare Trust Company
- Dartmouth Alumni
- East Bay Pediatrics
- Empire Blue Cross Blue Shield
- Employment Development Department
- Good To Go!
- Heirfinders Research Associates
- Internal Revenue Service
- J.P. Morgan Wealth Management
- Mozilla Corporation
- Office of Assessor
- PG&E
- Stanford Health Care
- Sutter Health Alta Bates Summit
- TD Ameritrade
- UMB Bank
- WageWorks

Try and use the following account holders:
- Jason 
- Diana

It's preferable to use the coloquial name for the company if it's well know. It's more important to use a simple name than the official more verbose name.

IMPORTANT: Provide ONLY the JSON object in your response with no additional text or explanations.

`;

export interface EnhancedPdfMetadata {
  documentType?: string;
  issuingOrganization?: string;
  primaryDate?: string;
  accountHolder?: string;
  accountDetails?: string;
  deadlines?: string;
  monetaryAmounts?: string[];
  summary?: string;
  descriptiveTitle?: string;
  otherPeople?: string[];
  labels?: string[];
}
