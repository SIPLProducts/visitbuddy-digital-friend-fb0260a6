
# VisiGuard VMS - Proposal Document Generator

## Overview
Create a professional, print-ready proposal document page that showcases all VisiGuard VMS functionalities with company branding. The document will be accessible from within the application and can be printed or saved as PDF directly from the browser.

## Document Structure

### Page Layout (A4 Portrait - 210mm x 297mm)
The proposal document will consist of multiple sections designed for professional client presentations:

1. **Cover Page**
   - Company logo (RESL branding from assets)
   - Document title: "VisiGuard VMS - Product Proposal"
   - Tagline: "Enterprise Visitor Management System"
   - Date and version information
   - Powered by Sharvi Infotech footer

2. **Executive Summary** (Page 2)
   - Brief overview of VisiGuard VMS
   - Key value propositions
   - Target audience/use cases

3. **Core Features Section** (Pages 3-5)
   - Visitor Management
   - Vehicle Management  
   - Dashboard and Analytics
   - Badge and Pass System
   - Mobile and PWA Experience
   - Scheduling and Appointments

4. **Technical Specifications** (Page 6)
   - Technology stack
   - Security features
   - Integration capabilities
   - Deployment options

5. **Contact/CTA Page** (Page 7)
   - Company contact information
   - Next steps
   - Call to action

## Implementation Details

### New Files to Create

**1. `src/pages/ProposalDocument.tsx`**
- Main page component with all proposal content
- Structured sections with proper page breaks for print
- Print-optimized styling with @media print rules
- "Print" and "Save as PDF" action buttons (hidden during print)

**2. `src/components/proposal/ProposalCoverPage.tsx`**
- Cover page with RESL logo and branding
- Gradient header matching dashboard theme (Navy to Cyan to Emerald)
- Document metadata (date, version)

**3. `src/components/proposal/ProposalFeatureSection.tsx`**
- Reusable component for feature sections
- Icon, title, description, and bullet points
- Professional card-based layout

**4. `src/components/proposal/ProposalTechStack.tsx`**
- Technology stack visualization
- Architecture overview
- Integration diagram

### Files to Modify

**1. `src/App.tsx`**
- Add route: `/proposal-document`

**2. `src/index.css`**
- Add print styles for proposal document
- A4 page sizing for proper PDF export
- Page break rules for multi-page document

### Design Specifications

**Color Palette (matching existing branding):**
- Primary gradient: Navy (#1e3a8a) -> Cyan (#0891b2) -> Emerald (#10b981)
- Accent: Red (#dc2626) - RESL brand color
- Text: Dark gray (#1f2937)
- Backgrounds: White with subtle gray accents

**Typography:**
- Headings: Bold, larger sizes for hierarchy
- Body: Clean, readable 11-12pt for print
- Feature lists: Bullet points with icons

**Print Optimization:**
- A4 page size with 15mm margins
- Page breaks before major sections
- No background colors on print (optional toggle)
- QR code linking to live demo/website

## Feature Content Breakdown

### 1. Visitor Management
- Pre-registration and walk-in support
- Host approval workflow with notifications
- Photo capture and ID verification
- Asset tracking (laptops, devices)
- QR-based rapid check-in/check-out
- Multi-channel badge delivery (WhatsApp, SMS, Email)

### 2. Commercial Vehicle Management
- Vehicle registration with driver details
- In/Out trip logging and tracking
- Material and purpose documentation
- Vehicle-specific reporting

### 3. Analytics Dashboard
- Real-time KPI monitoring
- Daily activity trends (Area Charts)
- Location distribution (Pie Charts)
- Top 10 frequent visitors
- Exportable reports (CSV)

### 4. Badge and Pass System
- 100x150mm Safety Permit badges
- Dual QR codes (Check-out + Navigation)
- Company branding customization
- Emergency contact display
- Direct print and PDF export

### 5. Mobile and PWA Experience
- Installable Progressive Web App
- 4-step self-service visitor wizard
- Bottom navigation bar
- Pull-to-refresh functionality
- Haptic feedback on interactions
- Swipe actions on visitor cards
- iOS safe area support

### 6. Organization Management
- Multi-location facility support
- Department management
- Gate configuration with QR codes
- Employee/host directory
- Role-based access control (RBAC)

### 7. Security Features
- Supabase authentication
- Row-level security (RLS)
- Encrypted data storage
- Audit logging

## User Flow

1. User navigates to `/proposal-document` (accessible from Help page or Settings)
2. Document renders with all sections
3. User clicks "Print" or "Save as PDF" button
4. Browser print dialog opens
5. User can print directly or choose "Save as PDF" destination

## Technical Notes

- Use inline styles for maximum print compatibility (following PrintBadge.tsx pattern)
- Include CSS page-break-before/after for section control
- Use system fonts for consistent cross-platform rendering
- Optimize images for print resolution
- Keep file size minimal for fast loading
