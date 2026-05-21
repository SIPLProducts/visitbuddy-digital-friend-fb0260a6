import { LucideIcon } from 'lucide-react';

interface FeatureItem {
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
}

interface ProposalFeatureSectionProps {
  title: string;
  features: FeatureItem[];
  pageBreakBefore?: boolean;
}

export function ProposalFeatureSection({ 
  title, 
  features,
  pageBreakBefore = false 
}: ProposalFeatureSectionProps) {
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
        pageBreakBefore: pageBreakBefore ? 'always' : 'auto',
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
          {title}
        </h2>
      </div>

      {/* Features Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: features.length === 1 ? '1fr' : '1fr 1fr',
          gap: '24px'
        }}
      >
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div 
              key={index}
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e2e8f0'
              }}
            >
              {/* Feature Header */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}
              >
                <div 
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #0891b2 0%, #10b981 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <IconComponent size={20} color="white" />
                </div>
                <h3 
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1e3a8a',
                    margin: 0
                  }}
                >
                  {feature.title}
                </h3>
              </div>

              {/* Description */}
              <p 
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  marginBottom: '16px',
                  lineHeight: '1.6'
                }}
              >
                {feature.description}
              </p>

              {/* Bullet Points */}
              <ul 
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  listStyleType: 'none'
                }}
              >
                {feature.bullets.map((bullet, bulletIndex) => (
                  <li 
                    key={bulletIndex}
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      marginBottom: '6px',
                      position: 'relative',
                      paddingLeft: '16px'
                    }}
                  >
                    <span 
                      style={{
                        position: 'absolute',
                        left: 0,
                        color: '#10b981',
                        fontWeight: 'bold'
                      }}
                    >
                      ✓
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
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
        Re Sustainability VMS - Product Proposal | Powered by Sharvi Infotech
      </div>
    </div>
  );
}
