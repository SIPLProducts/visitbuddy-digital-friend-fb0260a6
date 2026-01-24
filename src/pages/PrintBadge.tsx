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
  department?: { name?: string } | null;
}

export default function PrintBadge() {
  const [searchParams] = useSearchParams();
  const [visitor, setVisitor] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);

  const visitorId = searchParams.get('id');

  useEffect(() => {
    if (visitorId) {
      fetchVisitor();
    }
  }, [visitorId]);

  useEffect(() => {
    // Auto-print when visitor data is loaded
    if (visitor && !loading) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [visitor, loading]);

  const fetchVisitor = async () => {
    try {
      console.log('Fetching visitor with ID:', visitorId);
      const { data, error } = await supabase
        .from('visitors')
        .select(`
          *,
          host:employees(name, department:departments(name)),
          department:departments(name)
        `)
        .eq('id', visitorId)
        .single();

      if (error) {
        console.error('Error fetching visitor:', error);
        setLoading(false);
        return;
      }

      if (data) {
        console.log('Visitor data loaded:', data.name);
        setVisitor(data as unknown as VisitorData);
        // Mark badge as printed
        await supabase
          .from('visitors')
          .update({ badge_printed: true })
          .eq('id', visitorId);
      }
    } catch (err) {
      console.error('Fetch visitor error:', err);
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

  return (
    <>
      <style>{`
        @page { 
          size: 100mm 150mm; 
          margin: 5mm; 
        }
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        body { 
          font-family: Arial, Helvetica, sans-serif; 
          background: white; 
          color: black;
        }
        @media print {
          .no-print { display: none !important; }
        }
        .badge {
          background: white;
          border: 2px solid #1f2937;
          border-radius: 8px;
          overflow: hidden;
          width: 350px;
          margin: 0 auto;
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
        .details {
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
          display: flex;
          border-top: 2px solid #1f2937;
          text-align: center;
          font-size: 11px;
        }
        .sig-box {
          flex: 1;
          padding: 8px;
          border-right: 1px solid #d1d5db;
        }
        .sig-box:last-child {
          border-right: none;
        }
        .sig-line {
          height: 32px;
          border-bottom: 1px dashed #9ca3af;
          margin-bottom: 4px;
        }
        .sig-label {
          font-weight: 600;
          font-style: italic;
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
          margin-bottom: 2px;
        }
        .qr-box {
          width: 96px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-left: 1px solid #d1d5db;
        }
        .qr-box img {
          width: 80px;
          height: 80px;
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
            onClick={() => {
              // Trigger print dialog - user can choose "Save as PDF" from there
              window.print();
            }}
            style={{ margin: 0, background: '#059669' }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#047857')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#059669')}
          >
            📄 Save as PDF
          </button>
        </div>

        <div className="badge">
          {/* Header */}
          <div className="header">
            <div className="logo-box">
              <img src={reslLogo} alt="RESL" />
            </div>
            <div className="company-text">Resustainability</div>
          </div>

          {/* Title + Photo */}
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

          {/* Details */}
          <div className="details">
            <div className="detail-row">
              <span className="detail-label">Serial No</span>
              <span className="detail-value">: {visitor.visitor_id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date</span>
              <span className="detail-value">: {format(checkInTime, 'dd/MM/yyyy')}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Time</span>
              <span className="detail-value">: {format(checkInTime, 'HH:mm')}</span>
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
              <span className="detail-value">: {format(checkInTime, 'dd/MM/yyyy')}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="signatures">
            <div className="sig-box">
              <div className="sig-line"></div>
              <p className="sig-label">Security Signature</p>
            </div>
            <div className="sig-box">
              <div className="sig-line"></div>
              <p className="sig-label">Visitor Signature</p>
            </div>
            <div className="sig-box">
              <div className="sig-line"></div>
              <p className="sig-label">Officer Signature</p>
            </div>
          </div>

          {/* Safety Guidelines */}
          <div className="guidelines">
            <div className="guidelines-text">
              <p>1. Your safety is your responsibility.</p>
              <p>2. Always follow the safety procedures.</p>
              <p>3. Always keep company work place clean.</p>
              <p>4. When in doubt, contact our official for instruction, guidance & training.</p>
            </div>
            <div className="qr-box">
              <img src={qrCodeUrl} alt="QR Code" />
            </div>
          </div>
        </div>

        <button className="no-print print-btn" onClick={() => window.history.back()}>
          ← Back to Badge Printing
        </button>
      </div>
    </>
  );
}
