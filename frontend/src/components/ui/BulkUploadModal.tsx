import React, { useState, useRef } from 'react';
import { X, CloudUpload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast } from 'sonner';

interface BulkUploadModalProps {
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkUploadModal({ branchId, onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    validCount: number;
    duplicateCount: number;
    validCompanies: any[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setValidationResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    setValidating(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

      // Map columns heuristically
      const companies = json.map(row => {
        // Try to find columns for Company Name, HR Name, Email, Phone
        const keys = Object.keys(row);
        const findKey = (keywords: string[]) => keys.find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
        
        const companyKey = findKey(['company', 'name', 'organization']) || keys[0];
        const hrNameKey = findKey(['hr name', 'contact person', 'hr']);
        const phoneKey = findKey(['phone', 'mobile', 'contact']);
        const emailKey = findKey(['email', 'mail']);
        const linkedinKey = findKey(['linkedin']);

        return {
          companyName: row[companyKey] ? String(row[companyKey]).trim() : '',
          hrName: hrNameKey ? String(row[hrNameKey]).trim() : '',
          hrPhone: phoneKey ? String(row[phoneKey]).trim() : '',
          hrEmail: emailKey ? String(row[emailKey]).trim() : '',
          linkedinProfile: linkedinKey ? String(row[linkedinKey]).trim() : ''
        };
      }).filter(c => c.companyName); // Filter out rows without company name

      if (companies.length === 0) {
        toast.error('No valid companies found in the spreadsheet.');
        setValidating(false);
        return;
      }

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/branch/${branchId}/bulk-validate-companies`, { companies });
      setValidationResult(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to validate the file. Please check the format.');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.validCompanies.length === 0) return;
    setImporting(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/branch/${branchId}/bulk-import-companies`, {
        companies: validationResult.validCompanies
      });
      toast.success(`Successfully queued ${validationResult.validCompanies.length} companies for sync!`);
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Failed to import companies.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 relative">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Bulk Import Companies
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {!validationResult ? (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
                <CloudUpload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-1">Click or drag Excel file here</h3>
                <p className="text-sm text-slate-500">Supports .xlsx, .xls, and .csv</p>
                {file && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm">
                    <FileSpreadsheet className="w-4 h-4" /> {file.name}
                  </div>
                )}
              </div>
              
              <button 
                onClick={handleValidate}
                disabled={!file || validating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {validating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Validate File
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-emerald-600 mb-1">{validationResult.validCount}</div>
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">New Companies</div>
                  <p className="text-[10px] text-emerald-600 mt-1">Ready to be added</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-amber-600 mb-1">{validationResult.duplicateCount}</div>
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">Duplicates Skipped</div>
                  <p className="text-[10px] text-amber-600 mt-1">Already exist in database</p>
                </div>
              </div>

              {validationResult.validCount === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">No new companies to import. All companies in the file already exist or the file was empty.</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setFile(null); setValidationResult(null); }}
                  className="w-1/3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-4 px-6 rounded-xl transition-all"
                >
                  Start Over
                </button>
                <button 
                  onClick={handleImport}
                  disabled={importing || validationResult.validCount === 0}
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                  Sync {validationResult.validCount} Companies
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
