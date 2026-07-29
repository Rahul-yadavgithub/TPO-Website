import React, { useState, useRef } from 'react';
import { X, CloudUpload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface GlobalBulkUploadModalProps {
  mode: 'current' | 'previous';
  onClose: () => void;
  onSuccess: () => void;
}

export function GlobalBulkUploadModal({ mode, onClose, onSuccess }: GlobalBulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    validCount: number;
    duplicateCount: number;
    validCompanies: any[];
    duplicateCompanies?: any[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [section, setSection] = useState('Uncategorized');
  const [isNewSection, setIsNewSection] = useState(false);

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
    },
    enabled: mode === 'current'
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['previous-sections'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/sections`, { withCredentials: true });
      return res.data.data || [];
    },
    enabled: mode === 'previous'
  });

  const getValidateEndpoint = () => {
    return mode === 'current' 
      ? `${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/bulk-validate-companies`
      : `${process.env.NEXT_PUBLIC_API_URL}/previous-companies/bulk-validate`;
  };

  const getImportEndpoint = () => {
    return mode === 'current'
      ? `${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/bulk-import-companies`
      : `${process.env.NEXT_PUBLIC_API_URL}/previous-companies/bulk-import`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setValidationResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    if (mode === 'current' && !selectedBranchId) {
      toast.error('Please select a branch first');
      return;
    }
    setValidating(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

      const companies = json.map(row => {
        const keys = Object.keys(row);
        const findKey = (keywords: string[]) => keys.find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
        
        const companyKey = findKey(['company', 'name', 'organization']) || keys[0];
        const hrNameKey = findKey(['hr name', 'contact person', 'hr']);
        const phoneKey = findKey(['phone', 'mobile', 'contact']);
        const emailKey = findKey(['email', 'mail']);
        const linkedinKey = findKey(['linkedin']);
        const yearKey = findKey(['year', 'academic']);

        const companyData: any = {
          companyName: row[companyKey] ? String(row[companyKey]).trim() : '',
          hrName: hrNameKey ? String(row[hrNameKey]).trim() : '',
          hrPhone: phoneKey ? String(row[phoneKey]).trim() : '',
          hrEmail: emailKey ? String(row[emailKey]).trim() : '',
        };

        if (mode === 'current') {
          companyData.linkedinProfile = linkedinKey ? String(row[linkedinKey]).trim() : '';
        } else {
          companyData.academicYear = yearKey ? String(row[yearKey]).trim() : new Date().getFullYear().toString();
          companyData.section = section;
          
          const extraData: Record<string, any> = {};
          const standardKeys = [companyKey, hrNameKey, phoneKey, emailKey, yearKey].filter(Boolean);
          keys.forEach(k => {
            if (!standardKeys.includes(k)) {
              extraData[k] = row[k];
            }
          });
          companyData.extraData = extraData;
        }

        return companyData;
      }).filter(c => c.companyName);

      if (companies.length === 0) {
        toast.error('No valid companies found in the spreadsheet.');
        setValidating(false);
        return;
      }

      const res = await axios.post(getValidateEndpoint(), { companies }, {
        withCredentials: true // in case auth cookie is needed
      });
      setValidationResult(res.data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to validate the file. Please check the format.');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.validCompanies.length === 0) return;
    setImporting(true);
    try {
      await axios.post(getImportEndpoint(), {
        companies: validationResult.validCompanies
      }, { withCredentials: true });
      toast.success(`Successfully added ${validationResult.validCompanies.length} companies to the global database!`);
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to import companies.');
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
            Bulk Import {mode === 'current' ? 'Companies' : 'Previous Companies'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {!validationResult ? (
            <div className="space-y-4">
              {mode === 'current' && (
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                      Program *
                    </label>
                    <select
                      required
                      value={selectedProgram}
                      onChange={(e) => {
                        setSelectedProgram(e.target.value);
                        setSelectedBranchId(''); // Reset branch on program change
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">-- Select Program --</option>
                      <option value="B.Tech">B.Tech</option>
                      <option value="M.Tech">M.Tech</option>
                    </select>
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                      Branch *
                    </label>
                    <select
                      required
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      disabled={!selectedProgram}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    >
                      <option value="">-- Select Branch --</option>
                      {branches
                        ?.map((b: any) => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
              
              {mode === 'previous' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Section Name
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={isNewSection ? 'ADD_NEW' : section}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsNewSection(true);
                        setSection('');
                      } else {
                        setIsNewSection(false);
                        setSection(e.target.value);
                      }
                    }}
                  >
                    <option value="" disabled>-- Select Section --</option>
                    {sections?.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="ADD_NEW">+ Add New Section</option>
                  </select>
                  
                  {isNewSection && (
                    <input 
                      type="text" 
                      required
                      placeholder="Enter new section name (e.g. IIT Patna Data)"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all animate-in fade-in slide-in-from-top-2"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                    />
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Unmapped columns from your sheet will automatically be saved.
                  </p>
                </div>
              )}
              
              <div 
                className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => {
                  if (mode === 'current' && !selectedBranchId) {
                    toast.error('Please select a branch first');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
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
                disabled={!file || validating || (mode === 'current' && !selectedBranchId)}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-emerald-100 rounded-xl flex flex-col h-64 overflow-hidden shadow-sm">
                  <div className="bg-emerald-50 border-b border-emerald-100 p-3 shrink-0">
                    <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Valid Companies
                    </h4>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {validationResult.validCompanies.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2 text-center">None</p>
                    ) : (
                      <ul className="space-y-1">
                        {validationResult.validCompanies.map((c: any, i: number) => (
                          <li key={i} className="text-xs text-slate-700 p-2 hover:bg-slate-50 rounded">
                            {c.companyName} <span className="text-slate-400">({c.academicYear || mode})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-amber-100 rounded-xl flex flex-col h-64 overflow-hidden shadow-sm">
                  <div className="bg-amber-50 border-b border-amber-100 p-3 shrink-0">
                    <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Duplicate Companies
                    </h4>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {validationResult.duplicateCompanies?.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2 text-center">None</p>
                    ) : (
                      <ul className="space-y-1">
                        {validationResult.duplicateCompanies?.map((c: any, i: number) => (
                          <li key={i} className="text-xs text-slate-700 p-2 hover:bg-slate-50 rounded">
                            {c.companyName} <span className="text-slate-400">({c.academicYear || mode})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

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
                  Import {validationResult.validCount} Companies
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
