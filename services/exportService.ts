import { Novel, Chapter } from '../types';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { jsPDF } from 'jspdf';

export const generateDocxBlob = async (chaptersToExport: Chapter[]): Promise<Blob> => {
  const doc = new Document({
    sections: chaptersToExport.map(chapter => ({
      properties: {
         page: {
           margin: {
             top: 1440, // 1 inch
             right: 1440,
             bottom: 1440,
             left: 1440,
           }
         }
      },
      children: [
        new Paragraph({
          text: chapter.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 }
        }),
        ...chapter.content.split('\n').map(p => new Paragraph({
          text: p,
          spacing: { after: 200 }
        }))
      ]
    }))
  });

  return await Packer.toBlob(doc);
};

export const generatePdfBlob = (chaptersToExport: Chapter[]): Blob => {
  const doc = new jsPDF();
  let y = 20;

  chaptersToExport.forEach((chapter, index) => {
    if (index > 0) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(22);
    doc.text(chapter.title, 20, y);
    y += 15;
    
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(chapter.content, 170); // A4 roughly
    
    splitText.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 7;
    });
  });

  return doc.output('blob');
};

export const generateTxtBlob = (novel: Novel, chaptersToExport: Chapter[]): Blob => {
  let content = `${novel.title.toUpperCase()}\n\n`;
  content += chaptersToExport.map(c => `${c.title}\n\n${c.content}`).join('\n\n\n');
  return new Blob([content], { type: 'text/plain;charset=utf-8' });
};
