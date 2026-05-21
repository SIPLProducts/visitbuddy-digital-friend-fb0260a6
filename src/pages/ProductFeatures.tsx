import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download, Users, Truck, BarChart3, CreditCard, Smartphone, Calendar, Building2, Shield, CheckCircle, Zap, Globe, Bell, Camera, QrCode, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import reslLogo from '@/assets/resl-logo.png';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PdfIcon = ({ icon: Icon, fallback, className = "h-5 w-5 text-primary" }: { icon: any; fallback: string; className?: string }) => (
  <>
    <Icon className={className} />
    <span className="pdf-icon-fallback" style={{ display: 'none', fontSize: 'inherit' }}>{fallback}</span>
  </>
);

const FeatureCard = ({ emoji, title, items }: { emoji: string; title: string; items: string[] }) => (
  <div className="border rounded-lg p-3" style={{ background: '#f8fafc' }}>
    <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5">
      <span>{emoji}</span> {title}
    </h4>
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-xs flex items-start gap-1.5">
          <span className="text-primary mt-0.5 shrink-0">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const ProductFeatures = () => {
  const navigate = useNavigate();

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    const element = document.getElementById('product-features-document');
    if (!element) return;
    toast.info('Generating PDF, please wait...');
    try {
      const allIcons = element.querySelectorAll('.lucide');
      const iconFallbacks = element.querySelectorAll('.pdf-icon-fallback');
      allIcons.forEach(el => (el as HTMLElement).style.display = 'none');
      iconFallbacks.forEach(el => (el as HTMLElement).style.display = 'inline');

      const sections = Array.from(element.querySelectorAll('[data-pdf-section]')) as HTMLElement[];
      if (sections.length === 0) return;

      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let isFirst = true;

      for (const section of sections) {
        const originalWidth = section.style.width;
        const originalMinHeight = section.style.minHeight;
        section.style.width = '794px';
        section.style.minHeight = 'auto';

        const canvas = await html2canvas(section, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, width: 794,
        });

        section.style.width = originalWidth;
        section.style.minHeight = originalMinHeight;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = A4_WIDTH_MM;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (!isFirst) pdf.addPage();
        isFirst = false;
        const finalHeight = Math.min(imgHeight, A4_HEIGHT_MM);
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, finalHeight);
      }

      allIcons.forEach(el => (el as HTMLElement).style.display = '');
      iconFallbacks.forEach(el => (el as HTMLElement).style.display = 'none');

      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        if (p > 1) {
          pdf.text(`© ${new Date().getFullYear()} Sharvi Infotech. All rights reserved.`, 105, 286, { align: 'center' });
          pdf.text('info@sharviinfotech.com | +91 88976 46530', 105, 290, { align: 'center' });
        }
        pdf.text(`Page ${p} of ${totalPages}`, 105, 294, { align: 'center' });
      }

      pdf.save('Re Sustainability-Product-Features-Specifications.pdf');
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      const allIcons = element?.querySelectorAll('.lucide');
      const iconFallbacks = element?.querySelectorAll('.pdf-icon-fallback');
      allIcons?.forEach(el => (el as HTMLElement).style.display = '');
      iconFallbacks?.forEach(el => (el as HTMLElement).style.display = 'none');
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div id="product-features-document" className="min-h-screen bg-muted/30">
      {/* Floating Action Bar */}
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPdf} className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="pt-20 print:pt-0">

        {/* Page 1 — Cover */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '0' }}>
          <div className="h-full flex flex-col" style={{ minHeight: '297mm' }}>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0891b2 100%)' }}>
              <div className="text-5xl mb-6 bg-white/90 rounded-lg px-6 py-3 font-bold" style={{ color: '#1e3a8a' }}>Sharvi</div>
              <h1 className="text-4xl font-bold text-white mb-4">Product Features & Specifications</h1>
              <h2 className="text-2xl text-white/90 mb-2">Re Sustainability VMS</h2>
              <p className="text-lg text-white/80 mb-8">Enterprise Visitor & Vehicle Management System</p>
              <div className="flex gap-6 mt-4">
                {[
                  { emoji: '👥', label: 'Visitor Mgmt' },
                  { emoji: '🚛', label: 'Vehicle Mgmt' },
                  { emoji: '📊', label: 'Analytics' },
                  { emoji: '📱', label: 'Mobile PWA' },
                ].map(item => (
                  <div key={item.label} className="bg-white/15 rounded-lg p-4 text-white text-center">
                    <span className="text-2xl block mb-1">{item.emoji}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 text-center border-t">
              <p className="text-sm text-muted-foreground">
                Document Version 2.0 — {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Confidential — Prepared by Sharvi Infotech</p>
            </div>
          </div>
        </div>

        {/* Page 2 — Visitor Management Features */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mt-8 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary">
            <PdfIcon icon={Users} fallback="👥" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Visitor Management</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Complete visitor lifecycle management — from pre-registration to checkout — with seamless host approval workflows and multi-channel communication.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <FeatureCard emoji="📝" title="Pre-Registration & Walk-in" items={[
              'Pre-register visitors with name, email, phone, company',
              'Walk-in visitor support with on-the-spot registration',
              'Bulk visitor import via CSV upload',
              'Recurring visitor profiles for frequent guests',
              'Auto-generated unique Visitor ID for each entry',
            ]} />
            <FeatureCard emoji="✅" title="Host Approval Workflow" items={[
              'Real-time host notification via WhatsApp / SMS / Email',
              'One-tap approve or reject from notification link',
              'Configurable auto-approval rules',
              'Escalation to alternate host on timeout',
              'Approval status tracking in dashboard',
            ]} />
            <FeatureCard emoji="📸" title="Photo & ID Verification" items={[
              'Live photo capture using device camera',
              'Government ID verification support',
              'Photo stored securely with visitor record',
              'Facial comparison for returning visitors',
              'GDPR-compliant image handling & retention',
            ]} />
            <FeatureCard emoji="💼" title="Asset & Laptop Tracking" items={[
              'Register laptops, bags & devices at entry',
              'Record brand, serial number & condition',
              'Mandatory asset checkout verification',
              'Asset mismatch alerts at exit',
              'Complete asset audit trail',
            ]} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureCard emoji="📲" title="QR-Based Check-in/Check-out" items={[
              'Unique QR code generated per visitor',
              'Scan to check-in at gate kiosk or tablet',
              'Scan to check-out with time logging',
              'QR code sent via WhatsApp, SMS & Email',
              'Reduces average check-in time by 70%',
            ]} />
            <FeatureCard emoji="🏷️" title="Multi-Channel Badge Delivery" items={[
              'Professional 100×150mm Safety Permit badge',
              'Dual QR (checkout + Google Maps location)',
              'Badge sent via WhatsApp, SMS & Email',
              'Direct thermal print at gate',
              'Company branding & emergency contacts on badge',
            ]} />
          </div>
        </div>

        {/* Page 3 — Vehicle Management & Analytics */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mt-8 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary">
            <PdfIcon icon={Truck} fallback="🚛" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Vehicle Management</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Comprehensive commercial vehicle entry tracking with driver details, material documentation, and automated gate operations.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <FeatureCard emoji="🚗" title="Vehicle Registration" items={[
              'Register vehicle number, type & driver details',
              'Record driver name, phone & company',
              'Material/purpose documentation per trip',
              'Vehicle photo capture at entry',
              'Unique Vehicle ID generation',
            ]} />
            <FeatureCard emoji="🔄" title="In/Out Trip Logging" items={[
              'Real-time entry & exit time tracking',
              'Gate-wise vehicle movement log',
              'Duration tracking with overstay alerts',
              'Multi-trip support for recurring vehicles',
              'Complete trip history per vehicle',
            ]} />
            <FeatureCard emoji="📡" title="ANPR & Automation" items={[
              'ANPR camera integration for auto plate capture',
              'Automatic boom barrier open on recognition',
              'RFID-based recurring vehicle identification',
              'Integration with NVR for video evidence',
              'Blacklist/whitelist vehicle matching',
            ]} />
            <FeatureCard emoji="📊" title="Vehicle Reports" items={[
              'Daily/weekly/monthly vehicle reports',
              'Gate-wise entry count breakdown',
              'Average dwell time analytics',
              'Export to CSV for external analysis',
              'Vehicle frequency tracking',
            ]} />
          </div>

          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-primary">
            <PdfIcon icon={BarChart3} fallback="📊" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Analytics & Reporting</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FeatureCard emoji="📈" title="Real-Time Dashboard" items={[
              'Live KPI cards (today\'s visitors, vehicles, active)',
              'Daily trend area charts',
              'Weekly comparison bar charts',
            ]} />
            <FeatureCard emoji="🗺️" title="Location Analytics" items={[
              'Location-wise visitor distribution (pie chart)',
              'Gate utilization heat map',
              'Department-wise visitor breakdown',
            ]} />
            <FeatureCard emoji="📋" title="Reports & Export" items={[
              'Top 10 frequent visitors/vehicles',
              'Custom date range filtering',
              'CSV export for all reports',
            ]} />
          </div>
        </div>

        {/* Page 4 — Mobile, Scheduling & Organization */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mt-8 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary">
            <PdfIcon icon={Smartphone} fallback="📱" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Mobile & PWA Experience</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Native-like mobile experience accessible on any device — no app store download required.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <FeatureCard emoji="📲" title="Progressive Web App (PWA)" items={[
              'Install directly from browser (Android & iOS)',
              'Offline-capable for critical operations',
              'Push notifications for visitor arrivals',
              'Home screen icon like a native app',
              'Auto-updates without app store',
            ]} />
            <FeatureCard emoji="🧭" title="Mobile-Optimized UI" items={[
              'Bottom navigation for quick access',
              'Pull-to-refresh on all list pages',
              'Haptic feedback on interactions',
              'Swipe actions on visitor/vehicle cards',
              'iOS safe area & notch support',
            ]} />
            <FeatureCard emoji="🪄" title="Self-Service Kiosk Mode" items={[
              '4-step visitor wizard (Details → Photo → Host → Confirm)',
              'Touchscreen-optimized large buttons',
              'Auto-reset after check-in completes',
              'Configurable welcome screen branding',
              'Guest Wi-Fi credentials display',
            ]} />
            <FeatureCard emoji="📅" title="Scheduling & Appointments" items={[
              'Calendar-based appointment management',
              'Pre-scheduled visitor arrivals with QR',
              'Automatic host notification before arrival',
              'Microsoft Teams meeting integration (optional)',
              'Recurring appointment scheduling',
            ]} />
          </div>

          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-primary">
            <PdfIcon icon={Building2} fallback="🏢" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Organization Management</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureCard emoji="🏭" title="Multi-Location Support" items={[
              'Manage multiple sites from single dashboard',
              'Location-specific settings & branding',
              'Cross-location visitor transfer',
              'Centralized HQ reporting across all sites',
            ]} />
            <FeatureCard emoji="🔐" title="Role-Based Access (RBAC)" items={[
              'Admin, Manager, Operator roles',
              'Location-specific permissions per user',
              'Screen-level access control',
              'HO Admin with global override access',
            ]} />
          </div>
        </div>

        {/* Page 5 — Security, Notifications & Technical Specs */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mt-8 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary">
            <PdfIcon icon={Shield} fallback="🛡️" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Security & Compliance</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <FeatureCard emoji="🔒" title="Authentication & Authorization" items={[
              'JWT-based secure authentication',
              'Row-Level Security (RLS) on all data tables',
              'Encrypted data at rest and in transit',
              'Session timeout & auto-logout',
              'Two-factor authentication support',
            ]} />
            <FeatureCard emoji="📜" title="Compliance & Audit" items={[
              'Complete audit trail for all actions',
              'GDPR-ready data handling & consent',
              'Configurable data retention policies',
              'Right to erasure (data deletion on request)',
              'Exportable compliance reports',
            ]} />
          </div>

          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-primary">
            <PdfIcon icon={Bell} fallback="🔔" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Notifications & Communication</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <FeatureCard emoji="💬" title="WhatsApp" items={[
              'Visitor badge with QR code',
              'Host approval request',
              'Vehicle entry notification',
              'Check-in/out confirmation',
            ]} />
            <FeatureCard emoji="📩" title="Email" items={[
              'Pre-registration confirmation',
              'Badge PDF attachment',
              'Daily summary reports',
              'Appointment reminders',
            ]} />
            <FeatureCard emoji="📱" title="SMS & Push" items={[
              'OTP for verification',
              'Check-in alert to host',
              'Overstay notifications',
              'Push via PWA service worker',
            ]} />
          </div>

          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-primary">
            <PdfIcon icon={Zap} fallback="⚡" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Technical Specifications</h2>
          </div>

          <table className="w-full border-collapse text-xs mb-4">
            <thead>
              <tr className="bg-primary/10">
                <th className="border p-2 text-left font-semibold">Parameter</th>
                <th className="border p-2 text-left font-semibold">Specification</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Frontend', 'React 18 + TypeScript + Vite + Tailwind CSS'],
                ['Backend / API', 'Edge Functions (Deno runtime)'],
                ['Database', 'PostgreSQL 15+ with Row-Level Security'],
                ['Authentication', 'JWT-based (email/password + social login)'],
                ['Hosting', 'Cloud-native (AWS / Azure / GCP) or On-Premise'],
                ['Mobile', 'Progressive Web App (PWA) — iOS & Android'],
                ['Notifications', 'Twilio (SMS/WhatsApp) + Resend (Email) + Web Push'],
                ['Badge Format', '100×150mm thermal print / PDF / A4 laser'],
                ['QR Standard', 'QR Code (ISO/IEC 18004) — check-in/out + maps'],
                ['Browser Support', 'Chrome 90+, Edge 90+, Firefox 90+, Safari 15+'],
                ['API Standard', 'RESTful JSON API with JWT auth headers'],
                ['Data Export', 'CSV, PDF (reports & badges)'],
                ['Uptime SLA', '99.9% (cloud) / per infra (on-premise)'],
                ['Concurrent Users', 'Up to 500 (scalable with load balancing)'],
              ].map(([param, spec], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="border p-2 font-medium">{param}</td>
                  <td className="border p-2">{spec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Page 6 — Feature Comparison Matrix */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mt-8 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary">
            <PdfIcon icon={CheckCircle} fallback="✅" className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Feature Comparison by Plan</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            All plans include core visitor management. Higher plans unlock vehicle management, advanced analytics, and enterprise integrations.
          </p>

          <table className="w-full border-collapse text-sm mb-6">
            <thead>
              <tr className="text-white" style={{ background: '#1e3a8a' }}>
                <th className="border border-blue-700 p-2.5 text-left font-semibold">Feature</th>
                <th className="border border-blue-700 p-2.5 text-center font-semibold">Starter</th>
                <th className="border border-blue-700 p-2.5 text-center font-semibold">Professional</th>
                <th className="border border-blue-700 p-2.5 text-center font-semibold">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Visitor Pre-Registration', '✓', '✓', '✓'],
                ['Walk-in Registration', '✓', '✓', '✓'],
                ['QR Check-in/Check-out', '✓', '✓', '✓'],
                ['Photo Capture & ID Verification', '✓', '✓', '✓'],
                ['Badge Printing (Thermal/PDF)', '✓', '✓', '✓'],
                ['Host Approval Workflow', '✓', '✓', '✓'],
                ['Email Notifications', '✓', '✓', '✓'],
                ['WhatsApp / SMS Notifications', '—', '✓', '✓'],
                ['Vehicle Management', '—', '✓', '✓'],
                ['ANPR Camera Integration', '—', '—', '✓'],
                ['RFID / Boom Barrier Integration', '—', '—', '✓'],
                ['Asset / Laptop Tracking', '—', '✓', '✓'],
                ['Analytics Dashboard', 'Basic', 'Advanced', 'Advanced'],
                ['Custom Reports & CSV Export', '—', '✓', '✓'],
                ['Multi-Location Support', '1 site', 'Up to 3', 'Unlimited'],
                ['Number of Gates', '2', '10', 'Unlimited'],
                ['Visitors per Month', '100', '500', 'Unlimited'],
                ['Self-Service Kiosk Mode', '—', '✓', '✓'],
                ['Appointment Scheduling', '—', '✓', '✓'],
                ['Role-Based Access (RBAC)', 'Basic', 'Full', 'Full + Custom'],
                ['API Access', '—', '✓', '✓'],
                ['SSO / LDAP Integration', '—', '—', '✓'],
                ['Dedicated Account Manager', '—', '—', '✓'],
                ['Support', 'Email', 'Priority Email', '24/7 Phone'],
              ].map(([feature, starter, pro, enterprise], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="border p-2 font-medium">{feature}</td>
                  <td className="border p-2 text-center">{starter}</td>
                  <td className="border p-2 text-center">{pro}</td>
                  <td className="border p-2 text-center">{enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-auto pt-6 text-center border-t" style={{ marginTop: 'auto' }}>
            <p className="text-sm font-semibold text-primary mb-1">Ready to get started?</p>
            <p className="text-xs text-muted-foreground">Contact us: info@sharviinfotech.com | +91 88976 46530</p>
            <p className="text-xs text-muted-foreground mt-1">© {new Date().getFullYear()} Sharvi Infotech. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductFeatures;
