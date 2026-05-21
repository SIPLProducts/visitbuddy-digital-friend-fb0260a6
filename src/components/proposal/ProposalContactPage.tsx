import { Mail, Phone, Globe, MapPin, ArrowRight } from 'lucide-react';
import reslLogo from '@/assets/resl-logo.png';

export function ProposalContactPage() {
  const nextSteps = [
    'Schedule a personalized demo session',
    'Discuss your specific requirements',
    'Receive a customized implementation plan',
    'Get detailed pricing based on your needs',
    'Start your pilot program'
  ];

  return (
    <div 
      className="proposal-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '0',
        margin: '0 auto',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        pageBreakBefore: 'always'
      }}
    >
      {/* Header */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 50%, #10b981 100%)',
          padding: '40px',
          color: 'white',
          textAlign: 'center'
        }}
      >
        <h2 
          style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '12px',
            margin: '0 0 12px'
          }}
        >
          Ready to Transform Your Visitor Management?
        </h2>
        <p 
          style={{
            fontSize: '16px',
            opacity: 0.9,
            margin: 0
          }}
        >
          Let's discuss how Re Sustainability VMS can meet your organization's needs
        </p>
      </div>

      {/* Main Content */}
      <div 
        style={{
          flex: 1,
          padding: '40px',
          display: 'flex',
          gap: '40px'
        }}
      >
        {/* Next Steps */}
        <div style={{ flex: 1 }}>
          <h3 
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e3a8a',
              marginBottom: '24px',
              margin: '0 0 24px'
            }}
          >
            Next Steps
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {nextSteps.map((step, index) => (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  backgroundColor: '#f8fafc',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0891b2 0%, #10b981 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    flexShrink: 0
                  }}
                >
                  {index + 1}
                </div>
                <span style={{ fontSize: '14px', color: '#334155' }}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div 
            style={{
              marginTop: '32px',
              background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
              borderRadius: '12px',
              padding: '20px 32px',
              textAlign: 'center',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: '600' }}>
                Request a Demo Today
              </span>
              <ArrowRight size={20} />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div 
          style={{
            width: '280px',
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #e2e8f0'
          }}
        >
          <h3 
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e3a8a',
              marginBottom: '24px',
              margin: '0 0 24px'
            }}
          >
            Contact Us
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Mail size={18} color="#0891b2" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Email</div>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                  sales@sharviinfotech.com
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Phone size={18} color="#0891b2" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Phone</div>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                  +91 98765 43210
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Globe size={18} color="#0891b2" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Website</div>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                  www.sharviinfotech.com
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <MapPin size={18} color="#0891b2" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Address</div>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', lineHeight: '1.5' }}>
                  Sharvi Infotech Pvt. Ltd.<br />
                  Pune, Maharashtra, India
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div 
        style={{
          backgroundColor: '#1e3a8a',
          padding: '24px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src={reslLogo} 
            alt="RESL Logo" 
            style={{
              height: '32px',
              filter: 'brightness(0) invert(1)'
            }}
          />
          <span style={{ color: 'white', fontSize: '14px', opacity: 0.9 }}>
            Re Sustainability VMS
          </span>
        </div>
        <div style={{ color: 'white', fontSize: '12px', opacity: 0.8 }}>
          © {new Date().getFullYear()} Sharvi Infotech Pvt. Ltd. All rights reserved.
        </div>
      </div>
    </div>
  );
}
