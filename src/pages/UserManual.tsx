import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ScreenMockup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-md">
    <div className="bg-gray-800 px-3 py-1.5 flex items-center gap-2">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
      </div>
      <span className="text-[10px] text-gray-400 ml-2">{title}</span>
    </div>
    <div className="bg-gray-50 p-3">{children}</div>
  </div>
);

const StorySection = ({ stepNumber, title, story, children }: { stepNumber: number; title: string; story: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <div className="flex items-start gap-3 mb-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: '#1e3a8a' }}>
        {stepNumber}
      </div>
      <div>
        <h3 className="text-base font-bold" style={{ color: '#1e3a8a' }}>{title}</h3>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{story}</p>
      </div>
    </div>
    <div className="ml-11">{children}</div>
  </div>
);

export default function UserManual() {
  const navigate = useNavigate();

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    const element = document.getElementById('user-manual-document');
    if (!element) return;

    toast.info('Generating PDF... Please wait.');

    try {
      const sections = element.querySelectorAll<HTMLElement>('[data-pdf-section]');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const origWidth = section.style.width;
        section.style.width = '794px';

        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        section.style.width = origWidth;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        if (imgHeight <= pdfHeight) {
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
        } else {
          let remainingHeight = canvas.height;
          let position = 0;
          let pageIndex = 0;
          const pageCanvasHeight = (pdfHeight / pdfWidth) * canvas.width;

          while (remainingHeight > 0) {
            if (i > 0 || pageIndex > 0) pdf.addPage();
            const sliceHeight = Math.min(pageCanvasHeight, remainingHeight);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;
            const ctx = pageCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvas, 0, position, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
              const pageImg = pageCanvas.toDataURL('image/jpeg', 0.95);
              const h = (sliceHeight * pdfWidth) / canvas.width;
              pdf.addImage(pageImg, 'JPEG', 0, 0, pdfWidth, h);
            }
            position += sliceHeight;
            remainingHeight -= sliceHeight;
            pageIndex++;
          }
        }
      }

      pdf.save('VisiGuard-User-Manual.pdf');
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm print:hidden">
        <div className="max-w-[210mm] mx-auto flex items-center justify-between px-4 py-3">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button onClick={handleDownloadPdf} className="gap-2" style={{ background: '#0e7490' }}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div id="user-manual-document" className="pt-20 print:pt-0">

        {/* Page 1 — Cover */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8" style={{ width: '210mm', minHeight: '297mm', padding: '0' }}>
          <div className="h-full flex flex-col" style={{ minHeight: '297mm' }}>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0891b2 100%)' }}>
              <div className="text-5xl mb-6 bg-white/90 rounded-lg px-6 py-3 font-bold" style={{ color: '#1e3a8a' }}>Sharvi</div>
              <h1 className="text-4xl font-bold text-white mb-4">User Manual</h1>
              <h2 className="text-2xl text-white/90 mb-2">VisiGuard VMS</h2>
              <p className="text-lg text-white/80 mb-8">Step-by-Step Guide for Every Module</p>
              <div className="grid grid-cols-3 gap-4 mt-6 max-w-md">
                {['📊 Dashboard', '👥 Visitors', '🚛 Vehicles', '🔐 Check-In', '🏢 Locations', '⚙️ Settings'].map(item => (
                  <div key={item} className="bg-white/15 rounded-lg p-3 text-white text-center text-sm">{item}</div>
                ))}
              </div>
              <div className="mt-auto pt-12 text-white/60 text-sm">
                <p>Version 2.0 • {new Date().getFullYear()}</p>
                <p className="mt-1">Confidential — For Internal Use Only</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 — Table of Contents */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#1e3a8a' }}>📖 Table of Contents</h2>
          <div className="space-y-3">
            {[
              { ch: '1', title: 'Dashboard — Your Command Center', page: '3' },
              { ch: '2', title: 'Visitor Registration — Welcoming Guests', page: '4' },
              { ch: '3', title: 'Visitor List & Management', page: '5' },
              { ch: '4', title: 'Appointments — Scheduling Made Easy', page: '6' },
              { ch: '5', title: 'Check-In / Check-Out — Gate Operations', page: '7' },
              { ch: '6', title: 'Badge Printing — Professional Passes', page: '8' },
              { ch: '7', title: 'Vehicle Management — Fleet Tracking', page: '9' },
              { ch: '8', title: 'Vehicle Gate — Entry & Exit Control', page: '10' },
              { ch: '9', title: 'Departments & Employees', page: '11' },
              { ch: '10', title: 'Locations & Gates Setup', page: '12' },
              { ch: '11', title: 'Analytics & Reports', page: '13' },
              { ch: '12', title: 'Settings & User Management', page: '14' },
              { ch: '13', title: 'Self-Service Kiosk & Mobile PWA', page: '15' },
            ].map(item => (
              <div key={item.ch} className="flex items-center border-b border-dashed border-gray-300 pb-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 shrink-0" style={{ background: '#1e3a8a' }}>{item.ch}</span>
                <span className="text-sm font-medium flex-1">{item.title}</span>
                <span className="text-xs text-gray-400 ml-2">Page {item.page}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 rounded-lg" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <h4 className="text-sm font-bold mb-2" style={{ color: '#0369a1' }}>💡 How to Use This Manual</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Each chapter follows a <strong>storyline</strong> — a realistic scenario showing how your team uses VisiGuard daily. Screenshots illustrate every step so you can follow along. Look for the numbered steps and blue headers to navigate quickly.</p>
          </div>
        </div>

        {/* Page 3 — Dashboard */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 1</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>📊 Dashboard — Your Command Center</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> It's 8:00 AM. Ahmed, the Security Manager at Al Rajhi HQ, opens VisiGuard on his tablet. Before his morning coffee, he glances at the Dashboard to see overnight activity — how many visitors checked in, which gates are active, and any pending approvals. The Dashboard gives him a real-time pulse of the entire facility.
            </p>
          </div>

          <StorySection stepNumber={1} title="Overview Stats" story="At the top, you'll see four stat cards showing today's total visitors, checked-in count, pending approvals, and vehicles on-site. These update in real-time.">
            <ScreenMockup title="VisiGuard — Dashboard">
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[{ label: 'Total Visitors', val: '147', color: '#3b82f6' }, { label: 'Checked In', val: '23', color: '#22c55e' }, { label: 'Pending', val: '5', color: '#f59e0b' }, { label: 'Vehicles', val: '12', color: '#8b5cf6' }].map(s => (
                  <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: s.color + '15', border: `1px solid ${s.color}30` }}>
                    <div className="text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-[9px] text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Weekly Overview Chart" story="A bar chart shows visitor trends for the past 7 days — helping you identify peak days and plan staffing accordingly.">
            <ScreenMockup title="Weekly Trend">
              <div className="flex items-end gap-2 h-16 px-2">
                {[40, 65, 50, 80, 70, 55, 45].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full rounded-t" style={{ height: `${h}%`, background: '#3b82f6' }} />
                    <span className="text-[8px] text-gray-400 mt-1">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                  </div>
                ))}
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Gate Status & Recent Visitors" story="Below the chart, see which gates are active/inactive and the latest visitors who checked in — with their name, company, host, and status badge.">
            <ScreenMockup title="Gate Status">
              <div className="space-y-1.5">
                {[{ name: 'Main Gate', status: 'Active', visitors: 8 }, { name: 'VIP Gate', status: 'Active', visitors: 3 }, { name: 'Service Gate', status: 'Inactive', visitors: 0 }].map(g => (
                  <div key={g.name} className="flex items-center justify-between text-xs border rounded px-2 py-1.5">
                    <span className="font-medium">{g.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${g.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{g.status}</span>
                    <span className="text-gray-400">{g.visitors} visitors</span>
                  </div>
                ))}
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={4} title="Quick Actions" story="Need to register a visitor fast? The Quick Actions panel lets you jump to common tasks — Pre-Register, Check-In via QR, Print Badge, or Add Vehicle — with a single tap.">
            <div className="flex gap-2">
              {['➕ New Visitor', '📷 QR Check-In', '🖨️ Print Badge', '🚗 Add Vehicle'].map(a => (
                <div key={a} className="flex-1 text-center py-2 px-1 rounded-lg text-[10px] font-medium" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>{a}</div>
              ))}
            </div>
          </StorySection>
        </div>

        {/* Page 4 — New Visitor Registration */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 2</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>👥 Visitor Registration — Welcoming Guests</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> Sarah from the front desk receives a call — a client from TechCorp is arriving at 10 AM to meet Mr. Khalid in Engineering. Sarah opens the "New Visitor" form and pre-registers the guest in under 60 seconds. The visitor receives a confirmation email with a QR code for instant check-in at the gate.
            </p>
          </div>

          <StorySection stepNumber={1} title="Open New Visitor Form" story="Navigate to Visitors → Pre-Register Visitor. The form opens with all required fields clearly labeled.">
            <ScreenMockup title="New Visitor Registration">
              <div className="space-y-2">
                {['Full Name *', 'Email Address', 'Phone Number', 'Company Name'].map(f => (
                  <div key={f} className="flex flex-col">
                    <span className="text-[9px] font-medium text-gray-600 mb-0.5">{f}</span>
                    <div className="h-6 rounded border border-gray-300 bg-white" />
                  </div>
                ))}
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Select Host & Department" story="Choose the employee the visitor is meeting and their department. The system auto-populates location details based on the host.">
            <ScreenMockup title="Host Selection">
              <div className="space-y-2">
                <div>
                  <span className="text-[9px] font-medium text-gray-600">Host Employee *</span>
                  <div className="h-6 rounded border border-gray-300 bg-white flex items-center px-2 text-[10px] text-gray-500">🔍 Search employee...</div>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-gray-600">Department *</span>
                  <div className="h-6 rounded border border-gray-300 bg-white flex items-center px-2 text-[10px] text-gray-500">▼ Select department</div>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-gray-600">Purpose of Visit</span>
                  <div className="h-6 rounded border border-gray-300 bg-white flex items-center px-2 text-[10px] text-gray-500">▼ Business Meeting</div>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Capture Photo & Laptop Details" story="Optionally capture the visitor's photo using the webcam. If they're carrying a laptop, log the brand and serial number for security tracking.">
            <ScreenMockup title="Additional Details">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-[9px] text-center">📷<br/>Capture Photo</div>
                <div className="flex-1 space-y-2">
                  <label className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-3.5 h-3.5 border rounded" /> Has Laptop?
                  </label>
                  <div><span className="text-[9px] text-gray-600">Laptop Brand</span><div className="h-5 rounded border border-gray-300 bg-white" /></div>
                  <div><span className="text-[9px] text-gray-600">Serial Number</span><div className="h-5 rounded border border-gray-300 bg-white" /></div>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={4} title="Submit & Notify Host" story="Click 'Register Visitor'. The system generates a unique QR code, sends an email to the visitor, and notifies the host via WhatsApp/SMS that their guest is expected.">
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-lg text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <span className="text-lg">✅</span>
                <p className="text-[10px] font-medium text-green-800 mt-1">Visitor Registered</p>
                <p className="text-[9px] text-green-600">QR Code sent to email</p>
              </div>
              <div className="flex-1 p-3 rounded-lg text-center" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <span className="text-lg">📩</span>
                <p className="text-[10px] font-medium text-blue-800 mt-1">Host Notified</p>
                <p className="text-[9px] text-blue-600">WhatsApp message sent</p>
              </div>
            </div>
          </StorySection>
        </div>

        {/* Page 5 — Visitor List */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 3</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>📋 Visitor List & Management</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> The Admin Manager needs to find all visitors from "TechCorp" who visited last week. She opens the Visitors page, uses the search bar to filter by company, and exports the list as a CSV for her weekly report. She can also view details, edit entries, or check someone out directly from the list.
            </p>
          </div>

          <StorySection stepNumber={1} title="Search & Filter Visitors" story="Use the search bar to find visitors by name, company, or ID. Filter by status (Checked In, Checked Out, Scheduled, Pending Approval) and date range.">
            <ScreenMockup title="Visitors List">
              <div className="flex gap-2 mb-2">
                <div className="flex-1 h-6 rounded border border-gray-300 bg-white flex items-center px-2 text-[10px] text-gray-400">🔍 Search visitors...</div>
                <div className="h-6 px-2 rounded border border-gray-300 bg-white flex items-center text-[10px] text-gray-400">Status ▼</div>
              </div>
              <table className="w-full text-[9px]">
                <thead><tr className="border-b bg-gray-50"><th className="text-left p-1.5">Name</th><th className="text-left p-1.5">Company</th><th className="text-left p-1.5">Host</th><th className="text-left p-1.5">Status</th><th className="p-1.5">Actions</th></tr></thead>
                <tbody>
                  {[{ n: 'John Smith', c: 'TechCorp', h: 'Mr. Khalid', s: 'Checked In', sc: 'green' }, { n: 'Maria Garcia', c: 'DesignHub', h: 'Ms. Sara', s: 'Scheduled', sc: 'blue' }, { n: 'Ali Hassan', c: 'BuildCo', h: 'Mr. Ahmed', s: 'Checked Out', sc: 'gray' }].map(v => (
                    <tr key={v.n} className="border-b"><td className="p-1.5 font-medium">{v.n}</td><td className="p-1.5">{v.c}</td><td className="p-1.5">{v.h}</td><td className="p-1.5"><span className={`px-1 py-0.5 rounded text-[8px] bg-${v.sc}-100 text-${v.sc}-700`}>{v.s}</span></td><td className="p-1.5 text-center">👁️ ✏️</td></tr>
                  ))}
                </tbody>
              </table>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="View Visitor Details" story="Click on any visitor row to open a detailed dialog showing all their information — including photo, QR code, laptop details, check-in/out timestamps, and host details.">
            <ScreenMockup title="Visitor Details">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-2xl">👤</div>
                <div className="flex-1 space-y-1 text-[9px]">
                  <p><strong>Name:</strong> John Smith</p>
                  <p><strong>Company:</strong> TechCorp International</p>
                  <p><strong>Host:</strong> Mr. Khalid — Engineering Dept</p>
                  <p><strong>Check-In:</strong> 10:02 AM — Main Gate</p>
                  <p><strong>Purpose:</strong> Business Meeting</p>
                  <p><strong>Laptop:</strong> Dell Latitude — SN: DL2024X78</p>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Bulk Actions & Export" story="Select multiple visitors for bulk check-out or CSV export. The export includes all fields for compliance and audit reporting.">
            <div className="flex gap-2">
              {['☑️ Select All', '🚪 Bulk Check-Out', '📥 Export CSV', '🖨️ Print List'].map(a => (
                <div key={a} className="flex-1 text-center py-2 rounded-lg text-[10px] font-medium" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>{a}</div>
              ))}
            </div>
          </StorySection>
        </div>

        {/* Page 6 — Appointments */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 4</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>📅 Appointments — Scheduling Made Easy</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> The HR department is hosting interviews next Tuesday. The HR coordinator creates 6 appointments in VisiGuard, each with the candidate's name, time slot, and interviewer. On the day, each candidate checks in with their QR code — no waiting, no confusion, fully professional.
            </p>
          </div>

          <StorySection stepNumber={1} title="Create New Appointment" story="Go to Appointments → Schedule Appointment. Enter visitor details, select date/time, host, and meeting duration. Optionally integrate with Microsoft Teams for virtual meetings.">
            <ScreenMockup title="New Appointment">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[9px] text-gray-600">Visitor Name *</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Email</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Date *</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px] text-gray-400">📅 Select date</div></div>
                <div><span className="text-[9px] text-gray-600">Time *</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px] text-gray-400">🕐 Select time</div></div>
                <div><span className="text-[9px] text-gray-600">Duration</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px] text-gray-400">30 minutes</div></div>
                <div><span className="text-[9px] text-gray-600">Host *</span><div className="h-5 rounded border bg-white" /></div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="View Appointment Calendar" story="The appointment list shows all scheduled meetings with status indicators — Pending (yellow), Confirmed (green), Cancelled (red), Completed (gray).">
            <ScreenMockup title="Appointments">
              <div className="space-y-1.5">
                {[{ t: '09:00', n: 'Ahmad Khan', s: 'Confirmed', c: 'green' }, { t: '10:30', n: 'Lisa Chen', s: 'Pending', c: 'yellow' }, { t: '14:00', n: 'Omar Al-Rashid', s: 'Confirmed', c: 'green' }].map(a => (
                  <div key={a.t} className="flex items-center gap-2 border rounded px-2 py-1.5 text-[10px]">
                    <span className="font-mono font-bold" style={{ color: '#1e3a8a' }}>{a.t}</span>
                    <span className="flex-1 font-medium">{a.n}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium bg-${a.c}-100 text-${a.c}-700`}>{a.s}</span>
                  </div>
                ))}
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Manage & Update" story="Click any appointment to edit details, confirm attendance, or cancel. The visitor and host both receive automatic notifications when changes are made.">
            <div className="grid grid-cols-3 gap-2">
              {['✅ Confirm', '✏️ Edit', '❌ Cancel'].map(a => (
                <div key={a} className="text-center py-2 rounded-lg text-[10px] font-medium" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>{a}</div>
              ))}
            </div>
          </StorySection>
        </div>

        {/* Page 7 — Check-In / Check-Out */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 5</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>🔐 Check-In / Check-Out — Gate Operations</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> It's 9:55 AM and John Smith arrives at the main gate. He shows his QR code from the email confirmation. The security guard, Hamza, opens the Check-In screen, scans the QR code with the tablet's camera — the system instantly recognizes John and marks him as "Checked In". The host, Mr. Khalid, receives a notification that his guest has arrived.
            </p>
          </div>

          <StorySection stepNumber={1} title="QR Code Scanning" story="Open Check-In/Out → Scan QR. Point the device camera at the visitor's QR code. The system validates the code and shows visitor details for confirmation.">
            <ScreenMockup title="QR Scanner">
              <div className="flex items-center justify-center py-6">
                <div className="w-32 h-32 border-4 border-dashed rounded-lg flex items-center justify-center text-3xl" style={{ borderColor: '#3b82f6' }}>📷</div>
              </div>
              <p className="text-center text-[9px] text-gray-500">Point camera at visitor's QR code</p>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Manual Check-In" story="No QR code? Search the visitor by name or ID. Select the visitor from results and confirm check-in with one click.">
            <ScreenMockup title="Manual Check-In">
              <div className="space-y-2">
                <div className="h-6 rounded border bg-white flex items-center px-2 text-[10px] text-gray-400">🔍 Search visitor name or ID...</div>
                <div className="border rounded p-2 flex items-center justify-between">
                  <div className="text-[10px]"><strong>John Smith</strong> — TechCorp — VIS-2024-0147</div>
                  <div className="px-2 py-1 rounded text-[9px] text-white font-medium" style={{ background: '#22c55e' }}>Check In ✓</div>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Check-Out Process" story="When the visitor leaves, use the same screen to check them out. The system records the exact exit time and calculates total visit duration. The host is notified that the guest has departed.">
            <ScreenMockup title="Check-Out">
              <div className="border rounded p-3 text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <span className="text-xl">🚪</span>
                <p className="text-[10px] font-medium text-red-800 mt-1">Check-Out Confirmation</p>
                <p className="text-[9px] text-red-600">John Smith — Visit duration: 2h 15m</p>
                <div className="mt-2 px-3 py-1 rounded text-[9px] text-white font-medium inline-block" style={{ background: '#ef4444' }}>Confirm Check-Out</div>
              </div>
            </ScreenMockup>
          </StorySection>
        </div>

        {/* Page 8 — Badge Printing */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 6</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>🖨️ Badge Printing — Professional Passes</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> After John checks in, the receptionist navigates to Badge Printing and selects his record. The badge is generated instantly with his photo, name, company, host, QR code, and a safety permit number. She prints it on a standard badge printer and hands it to John. He wears it throughout his visit for identification and security compliance.
            </p>
          </div>

          <StorySection stepNumber={1} title="Select Visitor for Badge" story="Go to Badge Printing. Search or select from the list of checked-in visitors who haven't received a badge yet.">
            <ScreenMockup title="Badge Printing Queue">
              <div className="space-y-1.5">
                {['John Smith — TechCorp', 'Maria Garcia — DesignHub', 'Ali Hassan — BuildCo'].map(v => (
                  <div key={v} className="flex items-center justify-between border rounded px-2 py-1.5 text-[10px]">
                    <span>{v}</span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-medium" style={{ background: '#dbeafe', color: '#1e40af' }}>Print Badge</span>
                  </div>
                ))}
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Badge Preview" story="Preview the badge before printing. The badge includes the visitor's photo, name, company, host name, department, QR code, safety permit number, and validity period.">
            <ScreenMockup title="Badge Preview">
              <div className="border-2 border-gray-300 rounded-lg p-3 max-w-[200px] mx-auto" style={{ background: 'linear-gradient(to bottom, #1e3a8a 0%, #1e3a8a 30%, #ffffff 30%)' }}>
                <div className="text-center text-white text-[10px] font-bold pb-2">VISITOR PASS</div>
                <div className="bg-white rounded p-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-1 flex items-center justify-center text-xl">👤</div>
                  <p className="text-[10px] font-bold">John Smith</p>
                  <p className="text-[8px] text-gray-500">TechCorp International</p>
                  <div className="border-t mt-1.5 pt-1.5 text-[8px] text-gray-600">
                    <p>Host: Mr. Khalid</p>
                    <p>Dept: Engineering</p>
                  </div>
                  <div className="w-12 h-12 mx-auto mt-2 border flex items-center justify-center text-[8px] text-gray-400">QR Code</div>
                  <p className="text-[7px] text-gray-400 mt-1">SP-2024-0147</p>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Print, Email, or WhatsApp" story="Choose your delivery method — print directly, send via email, or share through WhatsApp. The digital badge can also be sent as an SMS link.">
            <div className="grid grid-cols-4 gap-2">
              {['🖨️ Print', '📧 Email', '💬 WhatsApp', '📱 SMS'].map(m => (
                <div key={m} className="text-center py-2 rounded-lg text-[10px] font-medium" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>{m}</div>
              ))}
            </div>
          </StorySection>
        </div>

        {/* Page 9 — Vehicle Management */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 7</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>🚛 Vehicle Management — Fleet Tracking</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> A delivery truck from LogiTrans arrives at the service gate. The gate guard registers the vehicle — license plate, driver name, phone, company, and purpose (Delivery). The system generates a vehicle pass with a QR code. When the truck leaves 45 minutes later, the guard scans the QR and checks it out. Full audit trail maintained.
            </p>
          </div>

          <StorySection stepNumber={1} title="Register New Vehicle" story="Navigate to Vehicles → New Vehicle. Enter vehicle number, type (Car/Truck/Van/Bike), driver details, company, and purpose of visit.">
            <ScreenMockup title="New Vehicle Entry">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[9px] text-gray-600">Vehicle Number *</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px]">KSA-1234-AB</div></div>
                <div><span className="text-[9px] text-gray-600">Vehicle Type *</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px] text-gray-400">🚛 Truck</div></div>
                <div><span className="text-[9px] text-gray-600">Driver Name *</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Driver Phone</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Company</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px]">LogiTrans</div></div>
                <div><span className="text-[9px] text-gray-600">Purpose</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px]">Delivery</div></div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Vehicle List & Status" story="View all vehicles on-site with real-time status. Filter by status (On-Site/Departed) or search by plate number.">
            <ScreenMockup title="Vehicles">
              <table className="w-full text-[9px]">
                <thead><tr className="border-b bg-gray-50"><th className="text-left p-1">Plate</th><th className="text-left p-1">Type</th><th className="text-left p-1">Driver</th><th className="text-left p-1">Status</th><th className="text-left p-1">Duration</th></tr></thead>
                <tbody>
                  <tr className="border-b"><td className="p-1 font-mono font-bold">KSA-1234</td><td className="p-1">🚛 Truck</td><td className="p-1">Mohammed</td><td className="p-1"><span className="bg-green-100 text-green-700 px-1 rounded text-[8px]">On-Site</span></td><td className="p-1">45m</td></tr>
                  <tr className="border-b"><td className="p-1 font-mono font-bold">RYD-5678</td><td className="p-1">🚗 Car</td><td className="p-1">Ahmad</td><td className="p-1"><span className="bg-gray-100 text-gray-600 px-1 rounded text-[8px]">Departed</span></td><td className="p-1">2h 10m</td></tr>
                </tbody>
              </table>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Vehicle Gate Operations" story="Use the Vehicle Gate screen for rapid entry/exit processing. Scan vehicle QR codes or search by plate number for instant check-in/out.">
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-lg text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <span className="text-2xl">🟢</span>
                <p className="text-[10px] font-bold text-green-800 mt-1">Vehicle Entry</p>
                <p className="text-[9px] text-green-600">Scan or search to check in</p>
              </div>
              <div className="flex-1 p-3 rounded-lg text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <span className="text-2xl">🔴</span>
                <p className="text-[10px] font-bold text-red-800 mt-1">Vehicle Exit</p>
                <p className="text-[9px] text-red-600">Scan or search to check out</p>
              </div>
            </div>
          </StorySection>
        </div>

        {/* Page 10 — Departments & Employees */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 8</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>🏢 Departments & Employees</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> The IT Admin is setting up VisiGuard for the first time. She starts by creating departments — Engineering, HR, Finance, Marketing — and then adds employees to each department. Each employee marked as a "Host" can receive visitors. This structure ensures visitors are always routed to the correct department and host.
            </p>
          </div>

          <StorySection stepNumber={1} title="Manage Departments" story="Navigate to Departments. Add new departments with name, location, floor, and building section. Each department shows its employee count and active visitor count.">
            <ScreenMockup title="Departments">
              <div className="grid grid-cols-2 gap-2">
                {[{ n: 'Engineering', e: 24, v: 5 }, { n: 'Human Resources', e: 12, v: 2 }, { n: 'Finance', e: 18, v: 1 }, { n: 'Marketing', e: 8, v: 3 }].map(d => (
                  <div key={d.n} className="border rounded p-2">
                    <p className="text-[10px] font-bold">{d.n}</p>
                    <div className="flex gap-3 mt-1 text-[8px] text-gray-500">
                      <span>👤 {d.e} employees</span>
                      <span>👁️ {d.v} visitors</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Add & Manage Employees" story="Go to Employees to add staff. Enter name, employee ID, email, phone, position, and department. Toggle 'Is Host' to allow the employee to receive visitors.">
            <ScreenMockup title="New Employee">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[9px] text-gray-600">Name *</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Employee ID *</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Email</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Phone</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Position</span><div className="h-5 rounded border bg-white" /></div>
                <div><span className="text-[9px] text-gray-600">Department *</span><div className="h-5 rounded border bg-white" /></div>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] mt-2 font-medium">
                <div className="w-4 h-4 rounded border border-blue-500 bg-blue-500 flex items-center justify-center text-white text-[8px]">✓</div>
                Can receive visitors (Host)
              </label>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="CSV Import" story="Have a large team? Use CSV Import to bulk-add employees from a spreadsheet. The system validates data and shows import results with success/error counts.">
            <div className="p-3 rounded-lg text-center" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <span className="text-2xl">📄</span>
              <p className="text-[10px] font-bold mt-1" style={{ color: '#0369a1' }}>CSV Bulk Import</p>
              <p className="text-[9px] text-gray-600">Upload a CSV file with columns: Name, Employee ID, Email, Phone, Position, Department</p>
              <div className="mt-2 inline-block px-3 py-1 rounded text-[9px] text-white font-medium" style={{ background: '#0284c7' }}>Upload CSV File</div>
            </div>
          </StorySection>
        </div>

        {/* Page 11 — Locations & Gates */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 9</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>📍 Locations & Gates Setup</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> The company has 3 facilities — HQ in Riyadh, a factory in Jeddah, and a warehouse in Dammam. The Super Admin configures each location with its address, emergency contacts, and assembly points. Then, for each location, she sets up gates — Main Gate (Entry + Exit), VIP Gate (Entry Only), and Service Gate (Exit Only) — each with QR scanning capability and operating hours.
            </p>
          </div>

          <StorySection stepNumber={1} title="Add Locations" story="Go to Locations → Add Location. Enter facility name, full address, city, country, emergency contact, phone, email, and assembly point for safety compliance.">
            <ScreenMockup title="Locations">
              <div className="space-y-1.5">
                {[{ n: 'HQ — Riyadh', g: 3, d: 6, s: 'Active' }, { n: 'Factory — Jeddah', g: 2, d: 4, s: 'Active' }, { n: 'Warehouse — Dammam', g: 1, d: 2, s: 'Inactive' }].map(l => (
                  <div key={l.n} className="flex items-center justify-between border rounded px-2 py-1.5 text-[10px]">
                    <span className="font-medium">{l.n}</span>
                    <span className="text-gray-500">🚪 {l.g} gates · 🏢 {l.d} depts</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] ${l.s === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{l.s}</span>
                  </div>
                ))}
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Configure Gates" story="For each location, add gates with name, type (Entry/Exit/Both), capacity, operating hours, and QR scanning status.">
            <ScreenMockup title="Gate Configuration">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[9px] text-gray-600">Gate Name *</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px]">Main Gate</div></div>
                <div><span className="text-[9px] text-gray-600">Type *</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px]">Entry + Exit</div></div>
                <div><span className="text-[9px] text-gray-600">Capacity</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px]">50</div></div>
                <div><span className="text-[9px] text-gray-600">Operating Hours</span><div className="h-5 rounded border bg-white flex items-center px-2 text-[9px]">06:00 - 22:00</div></div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Gate QR Codes" story="Generate and print QR codes for each gate. Visitors and security staff can scan gate QR codes for location-aware check-in/out.">
            <div className="flex gap-3 justify-center">
              {['Main Gate', 'VIP Gate', 'Service Gate'].map(g => (
                <div key={g} className="text-center p-3 border rounded-lg">
                  <div className="w-16 h-16 border-2 mx-auto mb-1 flex items-center justify-center text-gray-400 text-[8px]">QR Code</div>
                  <p className="text-[9px] font-medium">{g}</p>
                </div>
              ))}
            </div>
          </StorySection>
        </div>

        {/* Page 12 — Analytics & Reports */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 10</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>📊 Analytics & Reports</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> At the end of the month, the Facility Manager needs to present visitor statistics to the board. He opens Analytics to see trends, peak hours, department-wise distribution, and gate utilization. He then generates the Visitor Report with date filters and exports it as a CSV for the board presentation.
            </p>
          </div>

          <StorySection stepNumber={1} title="Analytics Dashboard" story="The Analytics page provides visual charts — visitor trends over time, gate utilization, peak hours heatmap, and department-wise visitor distribution.">
            <ScreenMockup title="Analytics">
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded p-2">
                  <p className="text-[9px] font-bold mb-1">📈 Monthly Trend</p>
                  <div className="flex items-end gap-1 h-12">
                    {[30, 45, 60, 40, 75, 55, 50, 80, 65, 70, 85, 60].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: '#3b82f6' }} />
                    ))}
                  </div>
                </div>
                <div className="border rounded p-2">
                  <p className="text-[9px] font-bold mb-1">🏢 By Department</p>
                  <div className="space-y-1">
                    {[{ n: 'Engineering', w: 70 }, { n: 'HR', w: 45 }, { n: 'Finance', w: 30 }].map(d => (
                      <div key={d.n} className="flex items-center gap-1">
                        <span className="text-[8px] w-16">{d.n}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded"><div className="h-2 rounded" style={{ width: `${d.w}%`, background: '#3b82f6' }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Visitor Reports" story="Generate detailed reports filtered by date range, status, department, or gate. View on screen or export as CSV.">
            <ScreenMockup title="Visitor Report">
              <div className="flex gap-2 mb-2">
                <div className="h-5 px-2 rounded border bg-white flex items-center text-[9px] text-gray-400">📅 From</div>
                <div className="h-5 px-2 rounded border bg-white flex items-center text-[9px] text-gray-400">📅 To</div>
                <div className="h-5 px-2 rounded border bg-white flex items-center text-[9px] text-gray-400">Status ▼</div>
                <div className="h-5 px-2 rounded text-[9px] text-white font-medium flex items-center" style={{ background: '#1e3a8a' }}>Generate</div>
              </div>
              <div className="text-[8px] text-gray-500 text-center py-2">Report results appear here with full visitor details...</div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Vehicle Reports" story="Similar to visitor reports, vehicle reports show all vehicle entries/exits with duration, driver details, and gate information.">
            <div className="flex gap-2">
              {['📊 Analytics Dashboard', '👥 Visitor Report', '🚛 Vehicle Report', '📥 Export CSV'].map(r => (
                <div key={r} className="flex-1 text-center py-2 rounded-lg text-[10px] font-medium" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>{r}</div>
              ))}
            </div>
          </StorySection>
        </div>

        {/* Page 13 — Settings & User Management */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 11</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>⚙️ Settings & User Management</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> The Super Admin needs to onboard a new security guard at the Jeddah factory. He goes to User Management, creates a new user account with the "Operator" role assigned to the Jeddah location. The guard gets an email to set up his password. Once logged in, the guard can only access Check-In/Out and Badge Printing for the Jeddah facility — nothing more.
            </p>
          </div>

          <StorySection stepNumber={1} title="User Roles & Access Control" story="VisiGuard has three roles: Admin (full access), Manager (location-level management), and Operator (gate-level operations). Each user can be assigned different roles at different locations.">
            <ScreenMockup title="User Management">
              <table className="w-full text-[9px]">
                <thead><tr className="border-b bg-gray-50"><th className="text-left p-1.5">User</th><th className="text-left p-1.5">Email</th><th className="text-left p-1.5">Role</th><th className="text-left p-1.5">Location</th></tr></thead>
                <tbody>
                  <tr className="border-b"><td className="p-1.5 font-medium">Ahmed Al-Saud</td><td className="p-1.5">ahmed@company.com</td><td className="p-1.5"><span className="bg-purple-100 text-purple-700 px-1 rounded text-[8px]">Admin</span></td><td className="p-1.5">All Locations</td></tr>
                  <tr className="border-b"><td className="p-1.5 font-medium">Fatima Khan</td><td className="p-1.5">fatima@company.com</td><td className="p-1.5"><span className="bg-blue-100 text-blue-700 px-1 rounded text-[8px]">Manager</span></td><td className="p-1.5">HQ Riyadh</td></tr>
                  <tr className="border-b"><td className="p-1.5 font-medium">Hamza Ali</td><td className="p-1.5">hamza@company.com</td><td className="p-1.5"><span className="bg-green-100 text-green-700 px-1 rounded text-[8px]">Operator</span></td><td className="p-1.5">Factory Jeddah</td></tr>
                </tbody>
              </table>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Screen Permissions" story="Admins can configure which screens each role can see and edit at each location. This provides granular control over the user interface.">
            <ScreenMockup title="Role Permissions">
              <div className="space-y-1">
                {[{ s: 'Dashboard', a: '✅', m: '✅', o: '✅' }, { s: 'Visitors', a: '✅', m: '✅', o: '👁️' }, { s: 'Settings', a: '✅', m: '❌', o: '❌' }, { s: 'User Mgmt', a: '✅', m: '❌', o: '❌' }].map(p => (
                  <div key={p.s} className="grid grid-cols-4 text-[9px] border-b py-1">
                    <span className="font-medium">{p.s}</span>
                    <span className="text-center">{p.a}</span>
                    <span className="text-center">{p.m}</span>
                    <span className="text-center">{p.o}</span>
                  </div>
                ))}
                <div className="grid grid-cols-4 text-[8px] text-gray-500 pt-1">
                  <span>Screen</span><span className="text-center">Admin</span><span className="text-center">Manager</span><span className="text-center">Operator</span>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="App Settings" story="Configure notification preferences, theme (light/dark), default location, profile details, and security settings from the Settings page.">
            <div className="grid grid-cols-3 gap-2">
              {['👤 Profile', '🔔 Notifications', '🎨 Theme', '🏢 Default Location', '🔐 Security', '📱 Mobile'].map(s => (
                <div key={s} className="text-center py-2 rounded-lg text-[10px] font-medium" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>{s}</div>
              ))}
            </div>
          </StorySection>
        </div>

        {/* Page 14 — Self-Service & Mobile */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8 p-10" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#1e3a8a' }}>Chapter 12</span>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>📱 Self-Service Kiosk & Mobile PWA</h2>

          <div className="p-4 rounded-lg mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs italic text-gray-700">
              <strong>📖 Story:</strong> The lobby has a touchscreen kiosk running VisiGuard in self-service mode. Walk-in visitors can register themselves — enter their name, take a selfie, select the host from a directory, and print their badge — all without needing a receptionist. Meanwhile, security guards use the mobile PWA on their phones for quick QR scanning at the gate.
            </p>
          </div>

          <StorySection stepNumber={1} title="Self-Service Kiosk" story="Access the kiosk at /self-service. Visitors see a clean, touch-friendly interface to self-register. The form collects name, company, phone, photo, and host selection.">
            <ScreenMockup title="Self-Service Kiosk">
              <div className="text-center py-3">
                <div className="text-2xl mb-2">🏢</div>
                <p className="text-sm font-bold" style={{ color: '#1e3a8a' }}>Welcome to Our Facility</p>
                <p className="text-[10px] text-gray-500 mb-3">Please register your visit</p>
                <div className="space-y-2 max-w-[180px] mx-auto">
                  <div className="h-6 rounded border bg-white" />
                  <div className="h-6 rounded border bg-white" />
                  <div className="px-4 py-1.5 rounded text-[10px] text-white font-medium" style={{ background: '#1e3a8a' }}>Start Registration →</div>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={2} title="Mobile PWA Installation" story="VisiGuard is a Progressive Web App. Install it on any phone or tablet from the browser. Go to /install for step-by-step instructions for iOS and Android.">
            <ScreenMockup title="Install VisiGuard">
              <div className="flex gap-3">
                <div className="flex-1 p-2 border rounded text-center">
                  <span className="text-xl">🍎</span>
                  <p className="text-[9px] font-bold mt-1">iOS</p>
                  <p className="text-[8px] text-gray-500">Safari → Share → Add to Home Screen</p>
                </div>
                <div className="flex-1 p-2 border rounded text-center">
                  <span className="text-xl">🤖</span>
                  <p className="text-[9px] font-bold mt-1">Android</p>
                  <p className="text-[8px] text-gray-500">Chrome → Menu → Install App</p>
                </div>
              </div>
            </ScreenMockup>
          </StorySection>

          <StorySection stepNumber={3} title="Mobile-Optimized Interface" story="On mobile, VisiGuard shows a bottom navigation bar for quick access to Dashboard, Visitors, Check-In, Vehicles, and Settings. All screens are fully responsive and touch-optimized.">
            <ScreenMockup title="Mobile View">
              <div className="max-w-[160px] mx-auto">
                <div className="h-24 border rounded mb-2 flex items-center justify-center text-[9px] text-gray-400">Mobile Dashboard View</div>
                <div className="flex justify-around border-t pt-1.5">
                  {['🏠', '👥', '📷', '🚗', '⚙️'].map(i => (
                    <span key={i} className="text-sm">{i}</span>
                  ))}
                </div>
              </div>
            </ScreenMockup>
          </StorySection>
        </div>

        {/* End Page — Thank You */}
        <div data-pdf-section className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mb-8" style={{ width: '210mm', minHeight: '297mm', padding: '0' }}>
          <div className="h-full flex flex-col items-center justify-center text-center" style={{ minHeight: '297mm', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0891b2 100%)' }}>
            <div className="text-5xl mb-8 bg-white/90 rounded-lg px-6 py-3 font-bold" style={{ color: '#1e3a8a' }}>Sharvi</div>
            <h1 className="text-4xl font-bold text-white mb-4">Thank You</h1>
            <p className="text-lg text-white/80 mb-12">For choosing VisiGuard VMS</p>
            <div className="bg-white/10 backdrop-blur rounded-xl p-8 max-w-md">
              <h3 className="text-xl font-semibold text-white mb-4">Sharvi Infotech Pvt Ltd</h3>
              <div className="space-y-3 text-white/80">
                <p className="flex items-center justify-center gap-2 text-sm">
                  <span>📧</span> info@sharviinfotech.com
                </p>
                <p className="flex items-center justify-center gap-2 text-sm">
                  <span>📞</span> +91 88976 46530
                </p>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-12">© {new Date().getFullYear()} Sharvi Infotech Pvt Ltd. All rights reserved.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
