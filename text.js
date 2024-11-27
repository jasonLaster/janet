import * as fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { createWorker } from 'tesseract.js';

const formatText = (text) => {
    // Split into sections based on clear dividers in content
    const sections = text.split(/(?=HEIRFINDERS|LAW OFFICES|Standard Investigator Agreement)/g);
    
    return sections.map(section => {
        // Clean up the text
        return section
            .replace(/\s+/g, ' ')
            .replace(/[^\x00-\x7F]/g, '')
            .replace(/[٠]/g, '')
            .replace(/\./g, '.')
            .trim();
    }).join('\n\n-------------------\n\n');
};

async function extractWithOCR(pdfPath) {
    try {
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(pdfPath);
        await worker.terminate();
        return formatText(text);
    } catch (error) {
        console.error('OCR Error:', error);
        return '';
    }
}

export async function extractTextFromPDF(pdfPath) {
    try {
        // Try primary PDF text extraction first
        const pdfBuffer = fs.readFileSync(pdfPath);
        const pdfData = new Uint8Array(pdfBuffer);
        
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDoc = await loadingTask.promise;

        let textContent = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            
            const items = content.items.map(item => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5]
            }));

            items.sort((a, b) => b.y - a.y);

            let currentY = items[0]?.y;
            let currentLine = [];
            let lines = [];

            items.forEach(item => {
                if (Math.abs(item.y - currentY) < 5) {
                    currentLine.push(item);
                } else {
                    if (currentLine.length > 0) {
                        currentLine.sort((a, b) => a.x - b.x);
                        lines.push(currentLine.map(i => i.text).join(' '));
                    }
                    currentLine = [item];
                    currentY = item.y;
                }
            });

            if (currentLine.length > 0) {
                currentLine.sort((a, b) => a.x - b.x);
                lines.push(currentLine.map(i => i.text).join(' '));
            }

            textContent += lines.join('\n') + '\n\n';
        }

        const formattedText = formatText(textContent);
        
        // If we got meaningful text, return it
        if (formattedText && formattedText.length > 50) {
            console.log('✅ Successfully extracted text using PDF parser');
            return formattedText;
        }

        // If PDF text extraction failed or returned too little text, try OCR
        console.log('⚠️ PDF text extraction failed or returned insufficient text, trying OCR...');
        const ocrText = await extractWithOCR(pdfPath);
        
        if (ocrText && ocrText.length > 50) {
            console.log('✅ Successfully extracted text using OCR');
            return ocrText;
        }

        console.log('❌ Both PDF extraction and OCR failed to get meaningful text');
        return '';

    } catch (error) {
        console.error('Error in primary PDF extraction:', error);
        
        // Try OCR as fallback
        console.log('⚠️ Attempting OCR fallback...');
        const ocrText = await extractWithOCR(pdfPath);
        
        if (ocrText && ocrText.length > 50) {
            console.log('✅ Successfully extracted text using OCR fallback');
            return ocrText;
        }
        
        console.error('❌ All text extraction methods failed');
        return '';
    }
}