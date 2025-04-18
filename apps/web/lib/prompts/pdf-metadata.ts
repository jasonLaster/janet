export const pdfMetadataPrompt = `
Please analyze this document and provide the following information:
1. Document type (statement, bill, notification, etc.)
2. Issuing organization/company
3. Primary date mentioned
4. Main account holder or addressee
5. Key financial or account details (do not redact)
6. Important deadlines or action items
7. Any monetary amounts mentioned
8. Brief summary (2-3 sentences capturing the main purpose)
9. Descriptive title for this document
10. Any other people mentioned besides the primary addressee
11. List of document labels to help me stay organized

Please organize this information in a structured format for easy reference and return it as JSON.
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
