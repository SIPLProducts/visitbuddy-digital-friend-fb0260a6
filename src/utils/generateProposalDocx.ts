import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const createHeading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) => {
  return new Paragraph({
    heading: level,
    children: [
      new TextRun({
        text,
        bold: true,
        color: '1e3a8a',
      }),
    ],
    spacing: { before: 400, after: 200 },
  });
};

const createBulletPoint = (text: string) => {
  return new Paragraph({
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 100, after: 100 },
  });
};

const createSubHeading = (text: string) => {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text,
        bold: true,
        color: '0891b2',
        size: 26,
      }),
    ],
    spacing: { before: 300, after: 150 },
  });
};

const createParagraph = (text: string) => {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 100, after: 100 },
  });
};

export async function generateProposalDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Cover Page
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000 },
            children: [
              new TextRun({
                text: 'VisiGuard VMS',
                bold: true,
                size: 72,
                color: '1e3a8a',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: 'Enterprise Visitor Management System',
                size: 32,
                color: '0891b2',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: 'Product Proposal Document',
                size: 28,
                italics: true,
                color: '64748b',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1000 },
            children: [
              new TextRun({
                text: `Prepared: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                size: 22,
                color: '94a3b8',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: 'Version 2.0',
                size: 22,
                color: '94a3b8',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000 },
            children: [
              new TextRun({
                text: 'Powered by Sharvi Infotech',
                size: 20,
                color: 'dc2626',
              }),
            ],
          }),

          // Page Break
          new Paragraph({ pageBreakBefore: true }),

          // Executive Summary
          createHeading('Executive Summary'),
          createParagraph(
            'VisiGuard VMS is a comprehensive, enterprise-grade Visitor Management System designed to streamline and secure the visitor experience across organizations of all sizes. Built with modern cloud technologies, VisiGuard provides seamless visitor tracking, automated notifications, and comprehensive analytics—all accessible from any device.'
          ),
          createSubHeading('Key Value Propositions'),
          createBulletPoint('Reduce check-in time by up to 70% with QR-based rapid check-in'),
          createBulletPoint('Real-time visibility into visitor and vehicle activity across all locations'),
          createBulletPoint('Enhanced security with photo capture, ID verification, and asset tracking'),
          createBulletPoint('Multi-channel communication via WhatsApp, SMS, and Email'),
          createBulletPoint('Mobile-first PWA design for accessibility on any device'),
          createBulletPoint('Role-based access control for granular security management'),

          // Page Break
          new Paragraph({ pageBreakBefore: true }),

          // Core Features
          createHeading('Core Modules'),

          createSubHeading('1. Visitor Management'),
          createBulletPoint('Pre-registration and walk-in support'),
          createBulletPoint('Host approval workflow with real-time notifications'),
          createBulletPoint('Photo capture and ID verification'),
          createBulletPoint('Asset tracking for laptops and devices'),
          createBulletPoint('QR-based rapid check-in/check-out'),
          createBulletPoint('Multi-channel badge delivery (WhatsApp, SMS, Email)'),

          createSubHeading('2. Vehicle Management'),
          createBulletPoint('Vehicle registration with driver information'),
          createBulletPoint('In/Out trip logging and tracking'),
          createBulletPoint('Material and purpose documentation'),
          createBulletPoint('Gate-wise vehicle entry reports'),
          createBulletPoint('QR code-based vehicle passes'),
          createBulletPoint('WhatsApp notifications to drivers'),

          createSubHeading('3. Analytics Dashboard'),
          createBulletPoint('Real-time KPI monitoring'),
          createBulletPoint('Daily activity trends with area charts'),
          createBulletPoint('Location distribution with pie charts'),
          createBulletPoint('Top 10 frequent visitors tracking'),
          createBulletPoint('Exportable reports in CSV format'),
          createBulletPoint('Custom date range filtering'),

          createSubHeading('4. Badge & Pass System'),
          createBulletPoint('100x150mm Safety Permit badges'),
          createBulletPoint('Dual QR codes (Check-out + Google Maps)'),
          createBulletPoint('Company branding customization'),
          createBulletPoint('Emergency contact display'),
          createBulletPoint('Direct print and PDF export'),
          createBulletPoint('Email/WhatsApp badge delivery'),

          // Page Break
          new Paragraph({ pageBreakBefore: true }),

          createSubHeading('5. Mobile & PWA Experience'),
          createBulletPoint('Installable Progressive Web App'),
          createBulletPoint('4-step self-service visitor wizard'),
          createBulletPoint('Bottom navigation for quick access'),
          createBulletPoint('Pull-to-refresh functionality'),
          createBulletPoint('Haptic feedback on interactions'),
          createBulletPoint('Swipe actions on visitor cards'),
          createBulletPoint('iOS safe area support'),

          createSubHeading('6. Organization Management'),
          createBulletPoint('Multi-location facility support'),
          createBulletPoint('Department hierarchy management'),
          createBulletPoint('Gate configuration with QR codes'),
          createBulletPoint('Employee/host directory'),
          createBulletPoint('Role-based access control (RBAC)'),
          createBulletPoint('Location-specific permissions'),

          createSubHeading('7. Security & Compliance'),
          createBulletPoint('JWT-based authentication'),
          createBulletPoint('Row-level security (RLS) policies'),
          createBulletPoint('Encrypted data storage'),
          createBulletPoint('Complete audit logging'),
          createBulletPoint('GDPR-ready data handling'),
          createBulletPoint('Configurable data retention'),

          // Page Break
          new Paragraph({ pageBreakBefore: true }),

          // Pricing
          createHeading('Pricing Plans'),
          createParagraph('Flexible pricing options to suit organizations of all sizes.'),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Feature', bold: true })] })],
                    shading: { fill: '1e3a8a' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Starter', bold: true, color: 'FFFFFF' })] })],
                    shading: { fill: '1e3a8a' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Professional', bold: true, color: 'FFFFFF' })] })],
                    shading: { fill: '1e3a8a' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Enterprise', bold: true, color: 'FFFFFF' })] })],
                    shading: { fill: '1e3a8a' },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Price')] }),
                  new TableCell({ children: [new Paragraph('₹15,000/month')] }),
                  new TableCell({ children: [new Paragraph('₹35,000/month')] }),
                  new TableCell({ children: [new Paragraph('Custom')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Visitors/month')] }),
                  new TableCell({ children: [new Paragraph('Up to 100')] }),
                  new TableCell({ children: [new Paragraph('Up to 500')] }),
                  new TableCell({ children: [new Paragraph('Unlimited')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Locations')] }),
                  new TableCell({ children: [new Paragraph('1')] }),
                  new TableCell({ children: [new Paragraph('3')] }),
                  new TableCell({ children: [new Paragraph('Unlimited')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Gates')] }),
                  new TableCell({ children: [new Paragraph('2')] }),
                  new TableCell({ children: [new Paragraph('10')] }),
                  new TableCell({ children: [new Paragraph('Unlimited')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Vehicle Management')] }),
                  new TableCell({ children: [new Paragraph('—')] }),
                  new TableCell({ children: [new Paragraph('✓')] }),
                  new TableCell({ children: [new Paragraph('✓')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('WhatsApp/SMS')] }),
                  new TableCell({ children: [new Paragraph('—')] }),
                  new TableCell({ children: [new Paragraph('✓')] }),
                  new TableCell({ children: [new Paragraph('✓')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('API Access')] }),
                  new TableCell({ children: [new Paragraph('—')] }),
                  new TableCell({ children: [new Paragraph('✓')] }),
                  new TableCell({ children: [new Paragraph('✓')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Support')] }),
                  new TableCell({ children: [new Paragraph('Email')] }),
                  new TableCell({ children: [new Paragraph('Priority')] }),
                  new TableCell({ children: [new Paragraph('24/7 Phone')] }),
                ],
              }),
            ],
          }),

          // Page Break
          new Paragraph({ pageBreakBefore: true }),

          // Implementation Timeline
          createHeading('Implementation Timeline'),
          createParagraph('Typical 6-week implementation for a standard deployment.'),

          createSubHeading('Week 1: Discovery & Planning'),
          createBulletPoint('Requirements gathering workshop'),
          createBulletPoint('Infrastructure assessment'),
          createBulletPoint('Stakeholder interviews'),
          createBulletPoint('Project scope finalization'),

          createSubHeading('Week 2-3: Setup & Configuration'),
          createBulletPoint('System deployment'),
          createBulletPoint('Database configuration'),
          createBulletPoint('Location & gate setup'),
          createBulletPoint('Role & permission configuration'),

          createSubHeading('Week 3-4: Customization & Integration'),
          createBulletPoint('Badge template customization'),
          createBulletPoint('Notification setup (WhatsApp/SMS/Email)'),
          createBulletPoint('Third-party integrations'),
          createBulletPoint('Custom workflow implementation'),

          createSubHeading('Week 5: Training & UAT'),
          createBulletPoint('Admin training sessions'),
          createBulletPoint('End-user training'),
          createBulletPoint('User acceptance testing'),
          createBulletPoint('Feedback incorporation'),

          createSubHeading('Week 6: Go-Live'),
          createBulletPoint('Production deployment'),
          createBulletPoint('Data migration (if applicable)'),
          createBulletPoint('Live system verification'),
          createBulletPoint('Stakeholder handover'),

          createSubHeading('Ongoing: Post-Launch Support'),
          createBulletPoint('30-day hypercare support'),
          createBulletPoint('Performance monitoring'),
          createBulletPoint('Issue resolution'),
          createBulletPoint('Continuous improvement'),

          // Page Break
          new Paragraph({ pageBreakBefore: true }),

          // Contact
          createHeading('Contact Us'),
          createParagraph('Ready to transform your visitor management? Get in touch with our team.'),

          createSubHeading('Sharvi Infotech'),
          createParagraph('Email: sales@sharviinfotech.com'),
          createParagraph('Phone: +91 98765 43210'),
          createParagraph('Website: www.sharviinfotech.com'),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1000 },
            children: [
              new TextRun({
                text: 'Thank you for considering VisiGuard VMS',
                bold: true,
                size: 28,
                color: '1e3a8a',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `VisiGuard_VMS_Proposal_${new Date().toISOString().split('T')[0]}.docx`);
}
