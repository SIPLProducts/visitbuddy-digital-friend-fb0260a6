import reslLogo from '@/assets/resl-logo.png';

export function ProposalCoverPage() {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
        position: 'relative',
        boxSizing: 'border-box',
        pageBreakAfter: 'always'
      }}
    >
      {/* Gradient Header */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 50%, #10b981 100%)',
          height: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <img 
          src={reslLogo} 
          alt="RESL Logo" 
          style={{
            height: '80px',
            filter: 'brightness(0) invert(1)'
          }}
        />
      </div>

      {/* Main Content */}
      <div 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 40px',
          textAlign: 'center'
        }}
      >
        {/* Document Title */}
        <h1 
          style={{
            fontSize: '48px',
            fontWeight: '700',
            color: '#1e3a8a',
            marginBottom: '16px',
            letterSpacing: '-1px'
          }}
        >
          VisiGuard VMS
        </h1>
        
        <h2 
          style={{
            fontSize: '24px',
            fontWeight: '500',
            color: '#0891b2',
            marginBottom: '40px'
          }}
        >
          Product Proposal
        </h2>

        {/* Tagline */}
        <div 
          style={{
            backgroundColor: '#f8fafc',
            padding: '24px 48px',
            borderRadius: '12px',
            marginBottom: '60px',
            border: '1px solid #e2e8f0'
          }}
        >
          <p 
            style={{
              fontSize: '20px',
              color: '#475569',
              fontWeight: '500',
              margin: 0
            }}
          >
            Enterprise Visitor Management System
          </p>
        </div>

        {/* Key Highlights */}
        <div 
          style={{
            display: 'flex',
            gap: '40px',
            marginBottom: '60px'
          }}
        >
          {[
            { label: 'Multi-Location', icon: '🏢' },
            { label: 'Real-time Analytics', icon: '📊' },
            { label: 'Mobile PWA', icon: '📱' },
            { label: 'QR Check-in', icon: '🔐' }
          ].map((item, index) => (
            <div 
              key={index}
              style={{
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Document Info */}
        <div 
          style={{
            marginTop: 'auto',
            color: '#64748b',
            fontSize: '14px'
          }}
        >
          <p style={{ margin: '4px 0' }}>
            <strong>Date:</strong> {currentDate}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Version:</strong> 1.0
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Document Type:</strong> Product Proposal
          </p>
        </div>
      </div>

      {/* Footer */}
      <div 
        style={{
          backgroundColor: '#f1f5f9',
          padding: '20px 40px',
          textAlign: 'center',
          borderTop: '1px solid #e2e8f0'
        }}
      >
        <p 
          style={{
            fontSize: '12px',
            color: '#64748b',
            margin: 0
          }}
        >
          Powered by <strong style={{ color: '#dc2626' }}>Sharvi Infotech</strong>
        </p>
      </div>
    </div>
  );
}
