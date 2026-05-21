import { CheckCircle, Target, Users } from 'lucide-react';

export function ProposalExecutiveSummary() {
  const valueProps = [
    {
      title: 'Streamlined Operations',
      description: 'Automate visitor check-in/out processes, reducing wait times by up to 80% and eliminating manual paper logs.'
    },
    {
      title: 'Enhanced Security',
      description: 'Real-time visitor tracking, photo capture, and instant host notifications ensure complete visibility and control.'
    },
    {
      title: 'Compliance Ready',
      description: 'Digital audit trails, automated badge printing, and comprehensive reporting for regulatory compliance.'
    },
    {
      title: 'Seamless Experience',
      description: 'Mobile-first PWA design with self-service kiosks and QR-based rapid check-in for modern workplace expectations.'
    }
  ];

  const useCases = [
    'Corporate Offices & Headquarters',
    'Manufacturing & Industrial Facilities',
    'Healthcare & Research Centers',
    'Educational Institutions',
    'Government Buildings',
    'Multi-tenant Commercial Properties'
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
          Executive Summary
        </h2>
      </div>

      {/* Overview */}
      <div 
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          borderLeft: '4px solid #0891b2'
        }}
      >
        <p 
          style={{
            fontSize: '15px',
            color: '#334155',
            lineHeight: '1.8',
            margin: 0
          }}
        >
          <strong>Re Sustainability VMS</strong> is a comprehensive, enterprise-grade Visitor Management System 
          designed to modernize how organizations manage visitor access, vehicle entry, and facility 
          security. Built with cutting-edge web technologies, Re Sustainability delivers a seamless experience 
          across desktop and mobile devices while maintaining the highest standards of data security 
          and compliance.
        </p>
      </div>

      {/* Key Value Propositions */}
      <div style={{ marginBottom: '32px' }}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}
        >
          <Target size={24} color="#1e3a8a" />
          <h3 
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e3a8a',
              margin: 0
            }}
          >
            Key Value Propositions
          </h3>
        </div>

        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}
        >
          {valueProps.map((prop, index) => (
            <div 
              key={index}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}
              >
                <CheckCircle size={18} color="#10b981" />
                <h4 
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1e3a8a',
                    margin: 0
                  }}
                >
                  {prop.title}
                </h4>
              </div>
              <p 
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  lineHeight: '1.6',
                  margin: 0
                }}
              >
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Target Audience */}
      <div>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}
        >
          <Users size={24} color="#1e3a8a" />
          <h3 
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e3a8a',
              margin: 0
            }}
          >
            Ideal For
          </h3>
        </div>

        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}
        >
          {useCases.map((useCase, index) => (
            <div 
              key={index}
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                borderRadius: '8px',
                padding: '16px',
                color: 'white',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {useCase}
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
        Re Sustainability VMS - Product Proposal | Powered by Sharvi Infotech
      </div>
    </div>
  );
}
