import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import reslLogo from '@/assets/resl-logo.png';

interface VisitorData {
  visitor_id: string;
  name: string;
  phone?: string | null;
  company?: string | null;
  purpose?: string | null;
  has_laptop?: boolean | null;
  photo_url?: string | null;
  check_in_time?: string | null;
  host?: {
    name?: string;
    department?: { name?: string } | null;
  } | null;
  department?: { 
    name?: string;
    floor_number?: string | null;
    building_section?: string | null;
    location?: {
      name?: string;
      geo_address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      emergency_contact?: string | null;
      assembly_point?: string | null;
    } | null;
  } | null;
  gate?: {
    location?: {
      name?: string;
      geo_address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      emergency_contact?: string | null;
      assembly_point?: string | null;
    } | null;
  } | null;
}

const safeFormat = (date: Date, fmt: string): string => {
  try {
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, fmt);
  } catch {
    return 'N/A';
  }
};

export default function PrintBadge() {
  const [searchParams] = useSearchParams();
  const [visitor, setVisitor] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visitorId = searchParams.get('id');

  useEffect(() => {
    if (visitorId) {
      fetchVisitor();
    } else {
      setError('No visitor ID provided in the URL.');
      setLoading(false);
    }
  }, [visitorId]);

  const fetchVisitor = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log('Fetching visitor with ID:', visitorId);
      const { data, error: queryError } = await supabase
        .from('visitors')
        .select(`
          *,
          host:employees(name, department:departments(name)),
          department:departments(name, floor_number, building_section, location:locations!departments_location_id_fkey(name, geo_address, latitude, longitude, emergency_contact, assembly_point)),
          gate:gates(name, location:locations!gates_location_id_fkey(name, geo_address, latitude, longitude, emergency_contact, assembly_point))
        `)
        .eq('id', visitorId)
        .single();

      if (queryError) {
        console.error('Error fetching visitor:', queryError);
        setError(`Could not load visitor data: ${queryError.message}`);
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Visitor not found.');
        setLoading(false);
        return;
      }

      console.log('Visitor data loaded:', data.name);
      setVisitor(data as unknown as VisitorData);

      // Mark badge as printed (non-blocking)
      try {
        await supabase
          .from('visitors')
          .update({ badge_printed: true })
          .eq('id', visitorId);
      } catch (e) {
        console.warn('Could not mark badge as printed:', e);
      }
    } catch (err) {
      console.error('Fetch visitor error:', err);
      setError('An unexpected error occurred while loading the badge.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        background: '#f5f5f5'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #0891b2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>Preparing badge for printing...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        fontFamily: 'Arial, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>⚠️</p>
          <h2 style={{ margin: '0 0 8px', color: '#1f2937' }}>Badge Error</h2>
          <p style={{ color: '#6b7280', margin: '0 0 20px' }}>{error}</p>
          <button
            onClick={() => fetchVisitor()}
            style={{
              padding: '10px 24px',
              background: '#0891b2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            Retry
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '10px 24px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        Visitor not found
      </div>
    );
  }

  const checkInTime = visitor.check_in_time ? new Date(visitor.check_in_time) : new Date();
  const qrData = encodeURIComponent(JSON.stringify({
    visitorId: visitor.visitor_id,
    name: visitor.name,
    action: 'checkout',
  }));
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&format=png`;

  const location = visitor.department?.location || visitor.gate?.location;
  const geoAddress = location?.geo_address;
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const emergencyContact = location?.emergency_contact;
  const assemblyPoint = location?.assembly_point;
  
  const getNavigationUrl = () => {
    if (latitude && longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    } else if (geoAddress) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(geoAddress)}`;
    }
    return null;
  };
  
  const navigationUrl = getNavigationUrl();
  const navigationQrUrl = navigationUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(navigationUrl)}&format=png`
    : null;

  return (
    <>
      <style>{`
        body { 
          font-family: Arial, Helvetica, sans-serif; 
        }
        @media print {
          @page { 
            size: A4 landscape; 
            margin: 8mm; 
          }
          .no-print { display: none !important; }
          .print-container {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: flex-start !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .badge {
            width: 130mm !important;
            margin: 0 !important;
            page-break-inside: avoid;
          }
        }
        .print-container {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
        }
        .badge {
          background: white;
          border: 2px solid #1f2937;
          border-radius: 8px;
          overflow: hidden;
          width: 350px;
        }
        .header {
          display: flex;
          align-items: center;
          border-bottom: 2px solid #1f2937;
        }
        .logo-box {
          width: 64px;
          padding: 8px;
          border-right: 2px solid #1f2937;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-box img {
          width: 48px;
          height: 48px;
          object-fit: contain;
        }
        .company-text {
          flex: 1;
          text-align: center;
          padding: 4px 0;
          color: #dc2626;
          font-weight: 600;
          font-style: italic;
          font-size: 14px;
        }
        .title-row {
          display: flex;
          border-bottom: 2px solid #1f2937;
        }
        .title-content {
          flex: 1;
          background: #1f2937;
          color: white;
          padding: 8px;
        }
        .title-content h2 {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }
        .title-content p {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }
        .photo-box {
          width: 96px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
        }
        .photo-box img {
          width: 80px;
          height: 80px;
          object-fit: cover;
        }
        .photo-placeholder {
          width: 80px;
          height: 80px;
          background: #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
          font-size: 24px;
          font-weight: bold;
        }
        .details-signatures-row {
          display: flex;
          border-top: 0;
        }
        .details {
          flex: 1;
          font-size: 11px;
        }
        .detail-row {
          display: flex;
          padding: 6px;
          border-bottom: 1px solid #d1d5db;
        }
        .detail-label {
          width: 96px;
          font-weight: 600;
        }
        .detail-value {
          flex: 1;
        }
        .signatures {
          width: 120px;
          border-left: 2px solid #1f2937;
          display: flex;
          flex-direction: column;
          text-align: center;
          font-size: 10px;
        }
        .sig-box {
          flex: 1;
          padding: 6px;
          border-bottom: 1px solid #d1d5db;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .sig-box:last-child {
          border-bottom: none;
        }
        .sig-line {
          height: 24px;
          border-bottom: 1px dashed #9ca3af;
          margin-bottom: 3px;
        }
        .sig-label {
          font-weight: 600;
          font-style: italic;
          font-size: 9px;
        }
        .guidelines {
          display: flex;
          border-top: 2px solid #1f2937;
          background: #f3f4f6;
        }
        .guidelines-text {
          flex: 1;
          padding: 8px;
          font-size: 10px;
          line-height: 1.3;
        }
        .guidelines-text p {
          margin: 0 0 2px;
        }
        .qr-box {
          width: 96px;
          padding: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-left: 1px solid #d1d5db;
        }
        .qr-box img {
          width: 80px;
          height: 80px;
        }
        .qr-label {
          font-size: 8px;
          text-align: center;
          margin-top: 2px;
          font-weight: 600;
        }
        .location-row {
          display: flex;
          border-top: 1px solid #d1d5db;
          padding: 6px 8px;
          background: #e0f2fe;
          align-items: center;
          gap: 8px;
        }
        .location-icon {
          font-size: 14px;
        }
        .location-text {
          flex: 1;
          font-size: 10px;
        }
        .location-text .address {
          font-weight: 600;
          color: #0369a1;
        }
        .location-text .nav-hint {
          color: #64748b;
          font-size: 9px;
        }
        .nav-qr {
          width: 50px;
          height: 50px;
        }
        .print-btn {
          display: block;
          margin: 20px auto;
          padding: 12px 32px;
          background: #0891b2;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        }
        .print-btn:hover {
          background: #0e7490;
        }
      `}</style>

      <div style={{ padding: '20px' }}>
        <div className="no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button className="print-btn" onClick={() => window.print()} style={{ margin: 0 }}>
            🖨️ Print Badge
          </button>
          <button 
            className="print-btn" 
            onClick={() => window.print()}
            style={{ margin: 0, background: '#059669' }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#047857')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#059669')}
          >
            📄 Save as PDF
          </button>
        </div>

        <div className="print-container" id="printable-badge">
          {[0].map((copy) => (
            <div className="badge" key={copy}>
              <div className="header">
                <div className="logo-box">
                  <img src={reslLogo} alt="RESL" />
                </div>
                <div className="company-text">Resustainability</div>
              </div>

              <div className="title-row">
                <div className="title-content">
                  <h2>SAFETY PERMIT</h2>
                  <p>VISITOR</p>
                </div>
                <div className="photo-box">
                  {visitor.photo_url ? (
                    <img src={visitor.photo_url} alt={visitor.name} />
                  ) : (
                    <div className="photo-placeholder">{getInitials(visitor.name)}</div>
                  )}
                </div>
              </div>

              <div className="details-signatures-row">
                <div className="details">
                  <div className="detail-row">
                    <span className="detail-label">Serial No</span>
                    <span className="detail-value">: {visitor.visitor_id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">: {safeFormat(checkInTime, 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Time</span>
                    <span className="detail-value">: {safeFormat(checkInTime, 'HH:mm')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Name</span>
                    <span className="detail-value" style={{ fontWeight: 500 }}>: {visitor.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Mobile</span>
                    <span className="detail-value">: {visitor.phone || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Company</span>
                    <span className="detail-value">: {visitor.company || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Dept. To Meet</span>
                    <span className="detail-value">: {visitor.host?.department?.name || visitor.department?.name || 'N/A'}</span>
                  </div>
                  {(visitor.department?.floor_number || visitor.department?.building_section) && (
                    <div className="detail-row">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">: {[
                        visitor.department?.floor_number && `Floor ${visitor.department.floor_number}`,
                        visitor.department?.building_section
                      ].filter(Boolean).join(', ') || 'N/A'}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Host</span>
                    <span className="detail-value">: {visitor.host?.name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Purpose</span>
                    <span className="detail-value">: {visitor.purpose || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">IT Asset</span>
                    <span className="detail-value">: {visitor.has_laptop ? 'Laptop' : 'NA'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Validity</span>
                    <span className="detail-value">: {safeFormat(checkInTime, 'dd/MM/yyyy')}</span>
                  </div>
                </div>

                <div className="signatures">
                  <div className="sig-box">
                    <div className="sig-line"></div>
                    <p className="sig-label">Security</p>
                  </div>
                  <div className="sig-box">
                    <div className="sig-line"></div>
                    <p className="sig-label">Visitor</p>
                  </div>
                  <div className="sig-box">
                    <div className="sig-line"></div>
                    <p className="sig-label">Officer</p>
                  </div>
                </div>
              </div>

              {(geoAddress || navigationUrl) && (
                <div className="location-row">
                  <span className="location-icon">📍</span>
                  <div className="location-text">
                    <p className="address">{geoAddress || location?.name || 'Location'}</p>
                    <p className="nav-hint">Scan QR to navigate →</p>
                  </div>
                  {navigationQrUrl && (
                    <img src={navigationQrUrl} alt="Navigate" className="nav-qr" />
                  )}
                </div>
              )}

              <div className="guidelines">
                <div className="guidelines-text">
                  <p>1. Your safety is your responsibility.</p>
                  <p>2. Always follow the safety procedures.</p>
                  <p>3. Always keep company work place clean.</p>
                  <p>4. When in doubt, contact our official for instruction, guidance & training.</p>
                  {emergencyContact && (
                    <p style={{ marginTop: '4px', fontWeight: 600, color: '#dc2626' }}>
                      🆘 Emergency: {emergencyContact}
                    </p>
                  )}
                  {assemblyPoint && (
                    <p style={{ marginTop: '2px', fontWeight: 600, color: '#0369a1' }}>
                      🚨 Assembly Point: {assemblyPoint}
                    </p>
                  )}
                </div>
                <div className="qr-box">
                  <img src={qrCodeUrl} alt="QR Code" />
                  <span className="qr-label">Check-out</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="no-print print-btn" onClick={() => window.history.back()}>
          ← Back to Badge Printing
        </button>
      </div>
    </>
  );
}
