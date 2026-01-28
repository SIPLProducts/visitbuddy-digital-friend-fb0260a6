import { 
  Server, 
  Database, 
  Shield, 
  Cloud, 
  Smartphone, 
  Globe,
  Lock,
  Zap
} from 'lucide-react';

export function ProposalTechStack() {
  const techCategories = [
    {
      title: 'Frontend Technologies',
      icon: Globe,
      items: [
        { name: 'React 18', desc: 'Modern component-based UI framework' },
        { name: 'TypeScript', desc: 'Type-safe development' },
        { name: 'Tailwind CSS', desc: 'Utility-first styling' },
        { name: 'shadcn/ui', desc: 'Accessible component library' }
      ]
    },
    {
      title: 'Backend & Infrastructure',
      icon: Server,
      items: [
        { name: 'Supabase', desc: 'PostgreSQL database & authentication' },
        { name: 'Edge Functions', desc: 'Serverless API endpoints' },
        { name: 'Real-time Subscriptions', desc: 'Live data synchronization' },
        { name: 'Storage Buckets', desc: 'Secure file management' }
      ]
    },
    {
      title: 'Security Features',
      icon: Shield,
      items: [
        { name: 'Row Level Security', desc: 'Database-level access control' },
        { name: 'JWT Authentication', desc: 'Secure session management' },
        { name: 'Role-Based Access', desc: 'Granular permission system' },
        { name: 'Encrypted Storage', desc: 'Data protection at rest' }
      ]
    },
    {
      title: 'Integrations',
      icon: Zap,
      items: [
        { name: 'Twilio', desc: 'WhatsApp & SMS notifications' },
        { name: 'Resend', desc: 'Transactional email delivery' },
        { name: 'Google Maps', desc: 'Location navigation QR codes' },
        { name: 'Microsoft Teams', desc: 'Meeting scheduling (optional)' }
      ]
    }
  ];

  const deploymentOptions = [
    { icon: Cloud, title: 'Cloud Hosted', desc: 'Fully managed SaaS deployment' },
    { icon: Server, title: 'On-Premise', desc: 'Self-hosted option available' },
    { icon: Smartphone, title: 'PWA Ready', desc: 'Install on any device' },
    { icon: Lock, title: 'Enterprise SSO', desc: 'SAML/OAuth integration' }
  ];

  return (
    <div 
      className="proposal-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '40px',
        margin: '0 auto',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        pageBreakBefore: 'always',
        pageBreakAfter: 'always'
      }}
    >
      {/* Section Header */}
      <div 
        style={{
          borderBottom: '3px solid #0891b2',
          paddingBottom: '16px',
          marginBottom: '32px'
        }}
      >
        <h2 
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1e3a8a',
            margin: 0
          }}
        >
          Technical Specifications
        </h2>
      </div>

      {/* Tech Categories Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '40px'
        }}
      >
        {techCategories.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <div 
              key={index}
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px'
                }}
              >
                <IconComponent size={20} color="#0891b2" />
                <h3 
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e3a8a',
                    margin: 0
                  }}
                >
                  {category.title}
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {category.items.map((item, itemIndex) => (
                  <div 
                    key={itemIndex}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '12px' }}>•</span>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {' '}- {item.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deployment Options */}
      <div 
        style={{
          marginBottom: '32px'
        }}
      >
        <h3 
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1e3a8a',
            marginBottom: '16px'
          }}
        >
          Deployment Options
        </h3>
        
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px'
          }}
        >
          {deploymentOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <div 
                key={index}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '2px solid #e2e8f0',
                  textAlign: 'center'
                }}
              >
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}
                >
                  <IconComponent size={24} color="white" />
                </div>
                <h4 
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1e3a8a',
                    margin: '0 0 4px'
                  }}
                >
                  {option.title}
                </h4>
                <p 
                  style={{
                    fontSize: '11px',
                    color: '#64748b',
                    margin: 0
                  }}
                >
                  {option.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 50%, #10b981 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}
      >
        <h3 
          style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            margin: '0 0 16px'
          }}
        >
          Performance & Scalability
        </h3>
        
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            textAlign: 'center'
          }}
        >
          {[
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '<100ms', label: 'API Response' },
            { value: '10K+', label: 'Concurrent Users' },
            { value: '∞', label: 'Scalability' }
          ].map((metric, index) => (
            <div key={index}>
              <div 
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  marginBottom: '4px'
                }}
              >
                {metric.value}
              </div>
              <div 
                style={{
                  fontSize: '11px',
                  opacity: 0.9
                }}
              >
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div 
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '40px',
          right: '40px',
          textAlign: 'center',
          fontSize: '10px',
          color: '#94a3b8'
        }}
      >
        VisiGuard VMS - Product Proposal | Powered by Sharvi Infotech
      </div>
    </div>
  );
}
