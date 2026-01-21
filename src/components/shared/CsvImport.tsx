import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';

interface CsvImportProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  uploading: boolean;
  templateName: string;
}

export function CsvImport({ onFileUpload, onDownloadTemplate, uploading, templateName }: CsvImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={onDownloadTemplate}>
        <Download className="h-4 w-4" />
        Template
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={onFileUpload}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="h-4 w-4" />
        {uploading ? 'Importing...' : 'Import CSV'}
      </Button>
    </div>
  );
}

export function downloadCsvTemplate(headers: string[], sampleRows: string[][], fileName: string) {
  const csv = [
    headers.join(','),
    ...sampleRows.map((r) => r.join(',')),
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function parseCsvFile(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 1) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => 
    line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
  );
  
  return { headers, rows };
}
