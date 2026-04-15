import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import reslLogo from '@/assets/resl-logo.png';

interface SafetyPermitBadgeProps {
  visitor: {
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
      location?: string | {
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
  };
  companyName?: string;
  companyLogo?: string;
}

export function SafetyPermitBadge({ 
  visitor, 
  companyName = 'Resustainability', 
  companyLogo = reslLogo 
}: SafetyPermitBadgeProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentDate = new Date();
  const checkInTime = visitor.check_in_time ? new Date(visitor.check_in_time) : currentDate;
  
  // Generate QR code URL for check-out scanning
  const qrData = encodeURIComponent(JSON.stringify({
    visitorId: visitor.visitor_id,
    name: visitor.name,
    action: 'checkout',
    timestamp: currentDate.toISOString()
  }));
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&format=png`;

  // Get location details from department or gate (handle both string and object formats)
  const deptLocation = visitor.department?.location;
  const gateLocation = visitor.gate?.location;
  
  // Department location can be a string (legacy) or object (new format)
  const location = typeof deptLocation === 'object' ? deptLocation : gateLocation;
  const geoAddress = location?.geo_address;
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const emergencyContact = location?.emergency_contact;
  const assemblyPoint = location?.assembly_point;
  
  // Floor and building info from department
  const floorNumber = visitor.department?.floor_number;
  const buildingSection = visitor.department?.building_section;
  
  // Generate Google Maps navigation URL
  const getNavigationUrl = () => {
    if (latitude && longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    } else if (geoAddress) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(geoAddress)}`;
    }
    return null;
  };
  
  const navigationUrl = getNavigationUrl();
  
  // Generate QR code for navigation
  const navigationQrUrl = navigationUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(navigationUrl)}&format=png`
    : null;

  return (
    <div className="bg-white border-2 border-gray-800 rounded-lg overflow-hidden w-[350px] mx-auto text-black print:border-black">
      {/* Header with RESL Logo - Red Background */}
      <div className="bg-red-600 py-3">
        <div className="flex flex-col items-center justify-center">
          <img 
            src={companyLogo} 
            alt={companyName} 
            className="h-12 w-auto brightness-0 invert" 
          />
          <p className="text-white font-bold text-sm mt-1 tracking-wide">{companyName}</p>
        </div>
      </div>

      {/* Title + Photo Row */}
      <div className="flex items-center border-b-2 border-gray-800 bg-gray-100">
        <div className="flex-1 text-center font-bold text-lg tracking-wider uppercase py-2">
          VISITOR PASS
        </div>
        <div className="border-l-2 border-gray-800 p-2">
          <Avatar className="h-20 w-20 rounded-none">
            {visitor.photo_url ? (
              <AvatarImage src={visitor.photo_url} alt={visitor.name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-gray-300 text-gray-700 text-xl font-bold rounded-none">
              {getInitials(visitor.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Details + Signatures Side by Side */}
      <div className="flex">
        {/* Details (Left) */}
        <div className="flex-1 text-xs divide-y divide-gray-300">
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Serial No</span>
            <span className="flex-1">: {visitor.visitor_id}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Date</span>
            <span className="flex-1">: {format(checkInTime, 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Time</span>
            <span className="flex-1">: {format(checkInTime, 'HH:mm')}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Name</span>
            <span className="flex-1 font-medium">: {visitor.name}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Mobile</span>
            <span className="flex-1">: {visitor.phone || 'N/A'}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Company</span>
            <span className="flex-1">: {visitor.company || 'N/A'}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Dept. To Meet</span>
            <span className="flex-1">: {visitor.host?.department?.name || visitor.department?.name || 'N/A'}</span>
          </div>
          {(floorNumber || buildingSection) && (
            <div className="flex p-1.5">
              <span className="w-24 font-semibold">Location</span>
              <span className="flex-1">: {[
                floorNumber && `Floor ${floorNumber}`,
                buildingSection
              ].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Host</span>
            <span className="flex-1">: {visitor.host?.name || 'N/A'}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Purpose</span>
            <span className="flex-1">: {visitor.purpose || 'N/A'}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">IT Asset</span>
            <span className="flex-1">: {visitor.has_laptop ? 'Laptop' : 'NA'}</span>
          </div>
          <div className="flex p-1.5">
            <span className="w-24 font-semibold">Validity</span>
            <span className="flex-1">: {format(checkInTime, 'dd/MM/yyyy')}</span>
          </div>
        </div>

        {/* Officer Signature Box */}
        <div className="w-[100px] border-l-2 border-gray-800 flex flex-col items-center justify-end p-2">
          <div className="w-full border-b border-gray-500 mb-1 mt-auto" style={{ minHeight: '40px' }}></div>
          <span className="text-[9px] font-semibold text-gray-600">Officer</span>
        </div>
      </div>

      {/* Location with Navigation QR */}
      {(geoAddress || navigationUrl) && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-sky-50 border-t border-sky-200">
          <span className="text-sm">📍</span>
          <div className="flex-1 text-[10px]">
            <p className="font-semibold text-sky-700">{geoAddress || location?.name || 'Location'}</p>
            <p className="text-gray-500">Scan QR to navigate</p>
          </div>
          {navigationQrUrl && (
            <img 
              src={navigationQrUrl} 
              alt="Navigate" 
              className="w-12 h-12"
            />
          )}
        </div>
      )}

      {/* Safety Guidelines */}
      <div className="flex border-t-2 border-gray-800 bg-gray-100">
        <div className="flex-1 p-2 text-[10px] leading-tight">
          <p className="mb-0.5">1. Your safety is your responsibility.</p>
          <p className="mb-0.5">2. Always follow the safety procedures.</p>
          <p className="mb-0.5">3. Always keep company work place clean.</p>
          <p>4. When in doubt, contact our official for instruction, guidance & training.</p>
          {emergencyContact && (
            <p className="mt-1 font-semibold text-red-600">🆘 Emergency: {emergencyContact}</p>
          )}
          {assemblyPoint && (
            <p className="mt-0.5 font-semibold text-sky-700">🚨 Assembly Point: {assemblyPoint}</p>
          )}
        </div>
        {/* QR code commented out for now
        <div className="w-24 p-1 flex flex-col items-center justify-center border-l border-gray-300">
          <img 
            src={qrCodeUrl} 
            alt="Check-out QR Code" 
            className="w-20 h-20"
          />
          <span className="text-[8px] font-semibold text-gray-600">Check-out</span>
        </div>
        */}
      </div>

      {/* Powered By Footer */}
      <div className="bg-gray-200 py-1.5 text-center border-t border-gray-300">
        <p className="text-[9px] text-gray-600">
          Powered by <span className="font-semibold text-gray-800">Sharvi Infotech</span>
        </p>
      </div>
    </div>
  );
}
