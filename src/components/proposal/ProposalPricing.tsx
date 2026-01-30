import { Check } from 'lucide-react';

const pricingPlans = [
  {
    name: 'Starter',
    description: 'Perfect for small offices and single locations',
    price: '₹15,000',
    period: '/month',
    features: [
      'Up to 100 visitors/month',
      '1 Location',
      '2 Gates',
      'Basic visitor management',
      'Email notifications',
      'Standard badge printing',
      'Email support',
    ],
    highlighted: false,
  },
  {
    name: 'Professional',
    description: 'Ideal for growing businesses with multiple gates',
    price: '₹35,000',
    period: '/month',
    features: [
      'Up to 500 visitors/month',
      '3 Locations',
      '10 Gates',
      'Full visitor & vehicle management',
      'WhatsApp + SMS notifications',
      'Custom badge templates',
      'Analytics dashboard',
      'API access',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with complex requirements',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited visitors',
      'Unlimited locations',
      'Unlimited gates',
      'All Professional features',
      'Custom integrations',
      'Dedicated account manager',
      'On-premise deployment option',
      'SLA guarantee',
      '24/7 phone support',
    ],
    highlighted: false,
  },
];

export function ProposalPricing() {
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
          Pricing Plans
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            marginTop: '8px'
          }}
        >
          Flexible pricing options to suit organizations of all sizes
        </p>
      </div>

      {/* Pricing Cards */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '20px'
        }}
      >
        {pricingPlans.map((plan, index) => (
          <div 
            key={index}
            style={{
              backgroundColor: plan.highlighted ? '#1e3a8a' : '#f8fafc',
              borderRadius: '12px',
              padding: '24px',
              border: plan.highlighted ? 'none' : '1px solid #e2e8f0',
              color: plan.highlighted ? 'white' : '#1f2937',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {plan.highlighted && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '-30px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '4px 40px',
                  transform: 'rotate(45deg)'
                }}
              >
                POPULAR
              </div>
            )}

            {/* Plan Name */}
            <h3 
              style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '8px'
              }}
            >
              {plan.name}
            </h3>

            {/* Description */}
            <p 
              style={{
                fontSize: '12px',
                opacity: 0.8,
                marginBottom: '20px',
                minHeight: '32px'
              }}
            >
              {plan.description}
            </p>

            {/* Price */}
            <div style={{ marginBottom: '20px' }}>
              <span 
                style={{
                  fontSize: '32px',
                  fontWeight: '700'
                }}
              >
                {plan.price}
              </span>
              <span 
                style={{
                  fontSize: '14px',
                  opacity: 0.7
                }}
              >
                {plan.period}
              </span>
            </div>

            {/* Features */}
            <ul 
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0
              }}
            >
              {plan.features.map((feature, featureIndex) => (
                <li 
                  key={featureIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '11px',
                    marginBottom: '8px',
                    opacity: 0.9
                  }}
                >
                  <Check 
                    size={14} 
                    style={{ 
                      flexShrink: 0,
                      color: plan.highlighted ? '#10b981' : '#10b981',
                      marginTop: '1px'
                    }} 
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Additional Notes */}
      <div 
        style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}
      >
        <h4 
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#166534',
            marginBottom: '8px'
          }}
        >
          All plans include:
        </h4>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            fontSize: '12px',
            color: '#15803d'
          }}
        >
          <div>✓ Free setup & onboarding</div>
          <div>✓ SSL encryption</div>
          <div>✓ Daily backups</div>
          <div>✓ 99.9% uptime SLA</div>
          <div>✓ Mobile app access</div>
          <div>✓ Regular updates</div>
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
