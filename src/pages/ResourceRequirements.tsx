import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download, Server, Cloud, HardDrive, Cpu, MemoryStick, Database, Globe, Shield, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import reslLogo from '@/assets/resl-logo.png';

const ResourceRequirements = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="resource-requirements-document" className="min-h-screen bg-muted/30">
      {/* Floating Action Bar - Hidden on print */}
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="pt-20 print:pt-0">
        {/* Cover Page */}
        <div className="proposal-page bg-white mx-auto shadow-lg print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '0' }}>
          <div className="h-full flex flex-col" style={{ minHeight: '297mm' }}>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 50%, #10b981 100%)' }}>
              <img src={reslLogo} alt="RESL Logo" className="h-20 mb-8 bg-white/90 rounded-lg p-3" />
              <h1 className="text-4xl font-bold text-white mb-4">Resource Requirements</h1>
              <h2 className="text-2xl text-white/90 mb-2">Server Configuration & Deployment Guide</h2>
              <p className="text-lg text-white/80 mb-8">VisiGuard VMS — Enterprise Visitor Management System</p>
              <div className="flex gap-6 mt-4">
                <div className="bg-white/20 rounded-lg p-4 text-white">
                  <Cloud className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">Cloud Deploy</span>
                </div>
                <div className="bg-white/20 rounded-lg p-4 text-white">
                  <Server className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">On-Premise</span>
                </div>
              </div>
            </div>
            <div className="p-6 text-center border-t">
              <p className="text-sm text-muted-foreground">
                Document Version 1.0 — {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Confidential — Prepared by Sharvi Infotech</p>
            </div>
          </div>
        </div>

        {/* Page 2 — Cloud Deployment */}
        <div className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mt-8 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary">
            <Cloud className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Cloud Deployment Configuration</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            VisiGuard VMS is optimized for cloud-native deployment using modern PaaS/IaaS platforms. Below are the recommended configurations based on expected user load.
          </p>

          {/* Cloud Tiers Table */}
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> Compute Requirements
          </h3>
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-primary/10">
                <th className="border p-2.5 text-left font-semibold">Component</th>
                <th className="border p-2.5 text-center font-semibold">Small<br />(up to 100 users)</th>
                <th className="border p-2.5 text-center font-semibold">Medium<br />(100–500 users)</th>
                <th className="border p-2.5 text-center font-semibold">Large<br />(500+ users)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Application Server (vCPU)', '2 vCPU', '4 vCPU', '8 vCPU'],
                ['Application Server (RAM)', '4 GB', '8 GB', '16 GB'],
                ['Database Server (vCPU)', '2 vCPU', '4 vCPU', '8 vCPU'],
                ['Database Server (RAM)', '4 GB', '8 GB', '32 GB'],
                ['Storage (SSD)', '50 GB', '100 GB', '500 GB'],
                ['CDN / Static Assets', 'Included', 'Included', 'Included'],
                ['SSL Certificate', 'Let\'s Encrypt', 'Managed SSL', 'Wildcard SSL'],
                ['Backup Storage', '25 GB', '50 GB', '200 GB'],
              ].map(([label, s, m, l], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="border p-2.5 font-medium">{label}</td>
                  <td className="border p-2.5 text-center">{s}</td>
                  <td className="border p-2.5 text-center">{m}</td>
                  <td className="border p-2.5 text-center">{l}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Recommended Cloud Platforms
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { name: 'AWS', services: 'EC2 / RDS / S3 / CloudFront', tier: 't3.medium+' },
              { name: 'Azure', services: 'App Service / Azure SQL / Blob / CDN', tier: 'B2+' },
              { name: 'Google Cloud', services: 'Cloud Run / Cloud SQL / GCS / CDN', tier: 'e2-medium+' },
            ].map((p) => (
              <div key={p.name} className="border rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-1">{p.name}</h4>
                <p className="text-xs text-muted-foreground mb-2">{p.services}</p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Min: {p.tier}</span>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" /> Existing Vendor (If Applicable)
          </h3>
          <div className="border rounded-lg p-4 mb-6 bg-muted/30">
            <p className="text-sm text-muted-foreground mb-3">
              If the client already has an existing cloud or hosting vendor, VisiGuard VMS can be deployed on their current infrastructure provided it meets the minimum specifications listed above. Common existing vendors include:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { name: 'DigitalOcean', spec: 'Droplets (4 GB+) / Managed DB / Spaces' },
                { name: 'Oracle Cloud (OCI)', spec: 'Compute / Autonomous DB / Object Storage' },
                { name: 'IBM Cloud', spec: 'Virtual Servers / Db2 / Cloud Object Storage' },
                { name: 'Linode (Akamai)', spec: 'Dedicated CPU / Managed DB / Object Storage' },
                { name: 'Hetzner', spec: 'Cloud Servers / Managed DB / Storage Box' },
                { name: "Client's Own Data Center", spec: 'On-premise VM / Bare metal (see next page)' },
              ].map((v) => (
                <div key={v.name} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <div>
                    <span className="font-medium">{v.name}</span>
                    <p className="text-xs text-muted-foreground">{v.spec}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              * Sharvi Infotech will assess the existing vendor environment and provide deployment guidance accordingly.
            </p>
          </div>

          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Cloud Security Checklist
          </h3>
          <ul className="space-y-1.5 text-sm">
            {[
              'HTTPS enforced on all endpoints with TLS 1.3',
              'Database accessible only via private VPC/subnet',
              'Environment variables for all secrets (never hardcoded)',
              'Automated daily backups with 30-day retention',
              'Web Application Firewall (WAF) enabled',
              'DDoS protection (AWS Shield / Azure DDoS / Cloud Armor)',
              'Role-based IAM policies for infrastructure access',
              'Container image scanning (if using Docker)',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Page 3 — On-Premise / Rack Server */}
        <div className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mt-8 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary">
            <Server className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">On-Premise / Rack Server Configuration</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            For organizations requiring data sovereignty or air-gapped environments, VisiGuard VMS can be deployed on physical or virtual rack servers.
          </p>

          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" /> Hardware Requirements
          </h3>
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-primary/10">
                <th className="border p-2.5 text-left font-semibold">Component</th>
                <th className="border p-2.5 text-center font-semibold">Minimum</th>
                <th className="border p-2.5 text-center font-semibold">Recommended</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Processor', 'Intel Xeon E-2236 (6C/12T)', 'Intel Xeon Silver 4214 (12C/24T)'],
                ['RAM', '16 GB DDR4 ECC', '32 GB DDR4 ECC'],
                ['Primary Storage', '256 GB NVMe SSD', '512 GB NVMe SSD (RAID 1)'],
                ['Data Storage', '500 GB SAS HDD', '1 TB SAS SSD (RAID 10)'],
                ['Network', '1 Gbps NIC', 'Dual 1 Gbps NIC (bonded)'],
                ['Power Supply', '500W', '800W Redundant PSU'],
                ['UPS Backup', '1 kVA (15 min)', '3 kVA (30 min)'],
                ['Rack Space', '1U', '2U'],
              ].map(([label, min, rec], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="border p-2.5 font-medium">{label}</td>
                  <td className="border p-2.5 text-center">{min}</td>
                  <td className="border p-2.5 text-center">{rec}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" /> Software Stack
          </h3>
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-primary/10">
                <th className="border p-2.5 text-left font-semibold">Layer</th>
                <th className="border p-2.5 text-left font-semibold">Technology</th>
                <th className="border p-2.5 text-left font-semibold">Version</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Operating System', 'Ubuntu Server LTS / RHEL', '22.04 / 9.x'],
                ['Runtime', 'Node.js (via Deno or Bun)', '20 LTS+'],
                ['Web Server / Proxy', 'Nginx / Caddy', '1.24+ / 2.x'],
                ['Database', 'PostgreSQL', '15+'],
                ['Cache Layer', 'Redis (optional)', '7.x'],
                ['Containerization', 'Docker + Docker Compose', '24.x+'],
                ['Process Manager', 'PM2 / systemd', 'Latest'],
                ['Monitoring', 'Prometheus + Grafana', 'Latest'],
              ].map(([layer, tech, ver], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="border p-2.5 font-medium">{layer}</td>
                  <td className="border p-2.5">{tech}</td>
                  <td className="border p-2.5">{ver}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> On-Premise Security Requirements
          </h3>
          <ul className="space-y-1.5 text-sm">
            {[
              'Firewall: Allow only ports 80, 443, and SSH (custom port)',
              'Database port (5432) restricted to application server only',
              'OS-level hardening (disable root SSH, key-based auth only)',
              'Automated OS patch management (unattended-upgrades)',
              'RAID configuration for data redundancy',
              'Scheduled automated backups to off-site/NAS storage',
              'Antivirus/malware scanning on server',
              'Physical rack access restricted with biometric/card lock',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Page 4 — Network & Client Requirements */}
        <div className="proposal-page bg-white mx-auto shadow-lg print:shadow-none mt-8 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary">
            <Globe className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Network & Client Requirements</h2>
          </div>

          <h3 className="text-lg font-semibold mb-3">Network Infrastructure</h3>
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-primary/10">
                <th className="border p-2.5 text-left font-semibold">Requirement</th>
                <th className="border p-2.5 text-left font-semibold">Specification</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Internet Bandwidth (Cloud)', 'Minimum 10 Mbps dedicated uplink'],
                ['LAN Speed (On-Premise)', '100 Mbps minimum, 1 Gbps recommended'],
                ['DNS', 'Custom domain with A/CNAME record configured'],
                ['Static IP', 'Required for on-premise; elastic IP for cloud'],
                ['VPN (optional)', 'Site-to-site VPN for multi-location setups'],
                ['Wi-Fi at Gates', '2.4/5 GHz for QR scanner tablets/kiosks'],
              ].map(([req, spec], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="border p-2.5 font-medium">{req}</td>
                  <td className="border p-2.5">{spec}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-lg font-semibold mb-3">Client Device Requirements</h3>
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-primary/10">
                <th className="border p-2.5 text-left font-semibold">Device</th>
                <th className="border p-2.5 text-left font-semibold">Purpose</th>
                <th className="border p-2.5 text-left font-semibold">Min Spec</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Desktop / Laptop', 'Admin Dashboard, Reports', 'Any modern browser (Chrome 90+, Edge, Firefox)'],
                ['Tablet (10")', 'Gate check-in kiosk, Self-service', 'Android 10+ / iPad OS 14+ with camera'],
                ['Smartphone', 'Guard mobile app, QR scanning', 'Android 9+ / iOS 14+ with camera'],
                ['Badge Printer', 'Visitor badge printing', 'Thermal printer (100x150mm) or A4 laser'],
                ['Barcode/QR Scanner', 'Rapid check-in (optional)', 'USB or Bluetooth 2D scanner'],
              ].map(([device, purpose, spec], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="border p-2.5 font-medium">{device}</td>
                  <td className="border p-2.5">{purpose}</td>
                  <td className="border p-2.5">{spec}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> On-premise costs depend on existing infrastructure. Contact Sharvi Infotech for a detailed quote tailored to your organization.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-8 text-center border-t mt-8">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Sharvi Infotech. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">info@sharviinfotech.com | +91 XXXXX XXXXX</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceRequirements;
