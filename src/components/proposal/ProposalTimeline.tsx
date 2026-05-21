import { CheckCircle2, Clock, Settings, Users, Rocket, Headphones } from 'lucide-react';

const timelinePhases = [
  {
    phase: 'Phase 1',
    title: 'Discovery & Planning',
    duration: 'Week 1',
    icon: Clock,
    color: '#0891b2',
    activities: [
      'Requirements gathering workshop',
      'Infrastructure assessment',
      'Stakeholder interviews',
      'Project scope finalization',
    ],
    deliverables: ['Project Plan', 'Technical Specifications'],
  },
  {
    phase: 'Phase 2',
    title: 'Setup & Configuration',
    duration: 'Week 2-3',
    icon: Settings,
    color: '#1e3a8a',
    activities: [
      'System deployment',
      'Database configuration',
      'Location & gate setup',
      'Role & permission configuration',
    ],
    deliverables: ['Configured System', 'Admin Access'],
  },
  {
    phase: 'Phase 3',
    title: 'Customization & Integration',
    duration: 'Week 3-4',
    icon: CheckCircle2,
    color: '#7c3aed',
    activities: [
      'Badge template customization',
      'Notification setup (WhatsApp/SMS/Email)',
      'Third-party integrations',
      'Custom workflow implementation',
    ],
    deliverables: ['Custom Badges', 'Integration Documentation'],
  },
  {
    phase: 'Phase 4',
    title: 'Training & UAT',
    duration: 'Week 5',
    icon: Users,
    color: '#dc2626',
    activities: [
      'Admin training sessions',
      'End-user training',
      'User acceptance testing',
      'Feedback incorporation',
    ],
    deliverables: ['Training Materials', 'UAT Sign-off'],
  },
  {
    phase: 'Phase 5',
    title: 'Go-Live',
    duration: 'Week 6',
    icon: Rocket,
    color: '#10b981',
    activities: [
      'Production deployment',
      'Data migration (if applicable)',
      'Live system verification',
      'Stakeholder handover',
    ],
    deliverables: ['Live System', 'Handover Document'],
  },
  {
    phase: 'Phase 6',
    title: 'Post-Launch Support',
    duration: 'Ongoing',
    icon: Headphones,
    color: '#f59e0b',
    activities: [
      '30-day hypercare support',
      'Performance monitoring',
      'Issue resolution',
      'Continuous improvement',
    ],
    deliverables: ['Support SLA', 'Monthly Reports'],
  },
];

export function ProposalTimeline() {
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
          Implementation Timeline
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            marginTop: '8px'
          }}
        >
          Typical 6-week implementation for a standard deployment
        </p>
      </div>

      {/* Timeline Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}
      >
        {timelinePhases.map((phase, index) => {
          const IconComponent = phase.icon;
          return (
            <div 
              key={index}
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                borderLeft: `4px solid ${phase.color}`
              }}
            >
              {/* Phase Header */}
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
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: phase.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <IconComponent size={18} color="white" />
                </div>
                <div>
                  <span 
                    style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      color: phase.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {phase.phase} • {phase.duration}
                  </span>
                  <h3 
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1f2937',
                      margin: 0
                    }}
                  >
                    {phase.title}
                  </h3>
                </div>
              </div>

              {/* Activities */}
              <div style={{ marginBottom: '12px' }}>
                <p 
                  style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#64748b',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}
                >
                  Key Activities
                </p>
                <ul 
                  style={{
                    margin: 0,
                    paddingLeft: '16px',
                    fontSize: '11px',
                    color: '#475569'
                  }}
                >
                  {phase.activities.map((activity, actIndex) => (
                    <li key={actIndex} style={{ marginBottom: '2px' }}>
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Deliverables */}
              <div>
                <p 
                  style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#64748b',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}
                >
                  Deliverables
                </p>
                <div 
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap'
                  }}
                >
                  {phase.deliverables.map((deliverable, delIndex) => (
                    <span 
                      key={delIndex}
                      style={{
                        fontSize: '10px',
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        color: '#475569'
                      }}
                    >
                      {deliverable}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Box */}
      <div 
        style={{
          marginTop: '24px',
          padding: '20px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
          borderRadius: '12px',
          color: 'white'
        }}
      >
        <h4 
          style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '12px'
          }}
        >
          Implementation Summary
        </h4>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '16px',
            textAlign: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>6</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>Weeks Total</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>5</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>Training Sessions</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>30</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>Days Hypercare</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>99.9%</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>Uptime SLA</div>
          </div>
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
