import { Button } from '@/components/ui/button';
import { Printer, Download, ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProposalCoverPage } from '@/components/proposal/ProposalCoverPage';
import { ProposalExecutiveSummary } from '@/components/proposal/ProposalExecutiveSummary';
import { ProposalFeatureSection } from '@/components/proposal/ProposalFeatureSection';
import { ProposalTechStack } from '@/components/proposal/ProposalTechStack';
import { ProposalContactPage } from '@/components/proposal/ProposalContactPage';
import { ProposalPricing } from '@/components/proposal/ProposalPricing';
import { ProposalTimeline } from '@/components/proposal/ProposalTimeline';
import { generateProposalDocx } from '@/utils/generateProposalDocx';
import { toast } from 'sonner';
import { 
  Users, 
  Truck, 
  BarChart3, 
  CreditCard, 
  Smartphone, 
  Calendar,
  Building2,
  Shield
} from 'lucide-react';

const visitorManagementFeatures = [
  {
    title: 'Visitor Management',
    description: 'Complete visitor lifecycle management from pre-registration to check-out with seamless host approval workflows.',
    bullets: [
      'Pre-registration and walk-in support',
      'Host approval workflow with real-time notifications',
      'Photo capture and ID verification',
      'Asset tracking for laptops and devices',
      'QR-based rapid check-in/check-out',
      'Multi-channel badge delivery (WhatsApp, SMS, Email)'
    ],
    icon: Users
  },
  {
    title: 'Vehicle Management',
    description: 'Comprehensive commercial vehicle entry tracking with driver details and material documentation.',
    bullets: [
      'Vehicle registration with driver information',
      'In/Out trip logging and tracking',
      'Material and purpose documentation',
      'Gate-wise vehicle entry reports',
      'QR code-based vehicle passes',
      'WhatsApp notifications to drivers'
    ],
    icon: Truck
  }
];

const analyticsFeatures = [
  {
    title: 'Analytics Dashboard',
    description: 'Real-time insights into visitor and vehicle activity with comprehensive data visualization.',
    bullets: [
      'Real-time KPI monitoring',
      'Daily activity trends with area charts',
      'Location distribution with pie charts',
      'Top 10 frequent visitors tracking',
      'Exportable reports in CSV format',
      'Custom date range filtering'
    ],
    icon: BarChart3
  },
  {
    title: 'Badge & Pass System',
    description: 'Professional visitor badges with dual QR codes for check-out and navigation.',
    bullets: [
      '100x150mm Safety Permit badges',
      'Dual QR codes (Check-out + Google Maps)',
      'Company branding customization',
      'Emergency contact display',
      'Direct print and PDF export',
      'Email/WhatsApp badge delivery'
    ],
    icon: CreditCard
  }
];

const mobileFeatures = [
  {
    title: 'Mobile & PWA Experience',
    description: 'Native-like mobile experience with Progressive Web App capabilities for any device.',
    bullets: [
      'Installable Progressive Web App',
      '4-step self-service visitor wizard',
      'Bottom navigation for quick access',
      'Pull-to-refresh functionality',
      'Haptic feedback on interactions',
      'Swipe actions on visitor cards',
      'iOS safe area support'
    ],
    icon: Smartphone
  },
  {
    title: 'Scheduling & Appointments',
    description: 'Streamlined appointment booking and management with calendar integration.',
    bullets: [
      'Calendar-based appointment view',
      'Pre-scheduled visitor arrivals',
      'Automatic host notifications',
      'Optional Microsoft Teams integration',
      'Appointment status tracking',
      'Recurring visit scheduling'
    ],
    icon: Calendar
  }
];

const organizationFeatures = [
  {
    title: 'Organization Management',
    description: 'Multi-location facility management with granular role-based access control.',
    bullets: [
      'Multi-location facility support',
      'Department hierarchy management',
      'Gate configuration with QR codes',
      'Employee/host directory',
      'Role-based access control (RBAC)',
      'Location-specific permissions'
    ],
    icon: Building2
  },
  {
    title: 'Security & Compliance',
    description: 'Enterprise-grade security features ensuring data protection and regulatory compliance.',
    bullets: [
      'JWT-based authentication',
      'Row-level security (RLS) policies',
      'Encrypted data storage',
      'Complete audit logging',
      'GDPR-ready data handling',
      'Configurable data retention'
    ],
    icon: Shield
  }
];

export default function ProposalDocument() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWord = async () => {
    try {
      toast.loading('Generating Word document...');
      await generateProposalDocx();
      toast.dismiss();
      toast.success('Word document downloaded successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate Word document');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Action Bar - Hidden during print */}
      <div 
        className="no-print sticky top-0 z-50 bg-card border-b border-border shadow-sm"
        style={{ padding: '12px 24px' }}
      >
        <div 
          style={{
            maxWidth: '210mm',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </Button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button 
              variant="outline" 
              onClick={handleDownloadWord}
              className="gap-2"
            >
              <FileText size={18} />
              Download Word
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer size={18} />
              Print
            </Button>
            <Button 
              onClick={handlePrint}
              className="gap-2"
            >
              <Download size={18} />
              Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document Container */}
      <div 
        id="proposal-document"
        style={{
          padding: '20px 0',
          backgroundColor: '#e5e7eb'
        }}
        className="print:p-0 print:bg-white"
      >
        {/* Cover Page */}
        <ProposalCoverPage />

        {/* Executive Summary */}
        <ProposalExecutiveSummary />

        {/* Feature Sections */}
        <ProposalFeatureSection 
          title="Core Modules - Visitor & Vehicle Management" 
          features={visitorManagementFeatures}
          pageBreakBefore
        />

        <ProposalFeatureSection 
          title="Analytics & Badge System" 
          features={analyticsFeatures}
          pageBreakBefore
        />

        <ProposalFeatureSection 
          title="Mobile Experience & Scheduling" 
          features={mobileFeatures}
          pageBreakBefore
        />

        <ProposalFeatureSection 
          title="Organization & Security" 
          features={organizationFeatures}
          pageBreakBefore
        />

        {/* Pricing */}
        <ProposalPricing />

        {/* Implementation Timeline */}
        <ProposalTimeline />

        {/* Technical Specifications */}
        <ProposalTechStack />

        {/* Contact Page */}
        <ProposalContactPage />
      </div>
    </div>
  );
}
