import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, Link, Calendar, Loader2, FileSpreadsheet, Plus, Trash2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface GlobalManualCompanyModalProps {
  mode: 'current' | 'previous';
  onClose: () => void;
  onSuccess: () => void;
}

export function GlobalManualCompanyModal({ mode, onClose, onSuccess }: GlobalManualCompanyModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    hrName: '',
    hrPhone: '',
    hrEmail: '',
    linkedinProfile: '',
    website: '',
    academicYear: new Date().getFullYear().toString(),
    section: 'Uncategorized'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [isNewSection, setIsNewSection] = useState(false);
  const [extraFields, setExtraFields] = useState<Array<{key: string, customKey: string, value: string}>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isConflict, setIsConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
    },
    enabled: mode === 'current'
  });

  useEffect(() => {
    const name = formData.companyName.trim();
    if (!name) {
      setIsEditing(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        if (mode === 'previous') {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/check-name?name=${encodeURIComponent(name)}`, { withCredentials: true });
          if (res.data.exists && res.data.company) {
            const comp = res.data.company;
            setFormData(prev => ({
              ...prev,
              hrName: comp.hrName || '',
              hrPhone: comp.hrPhone || '',
              hrEmail: comp.hrEmail || '',
              section: comp.section || 'Uncategorized',
              academicYear: comp.academicYear || prev.academicYear
            }));
            
            if (comp.extraData) {
              const parsedFields = Object.entries(comp.extraData).map(([k, v]) => {
                const isPredefined = ['Drive Date', 'Package', 'Eligible Branches', 'Role'].includes(k);
                return {
                  key: isPredefined ? k : 'Custom',
                  customKey: isPredefined ? '' : k,
                  value: v as string
                };
              });
              setExtraFields(parsedFields);
            } else {
              setExtraFields([]);
            }
            setIsEditing(true);
            setIsConflict(false);
            toast.info('Loaded existing previous company details');
          } else {
            setIsEditing(false);
            setIsConflict(false);
          }
        } else {
          // Current mode check
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies/check-name?name=${encodeURIComponent(name)}`, { withCredentials: true });
          if (res.data.exists && res.data.company) {
            const comp = res.data.company;
            
            // Wait, we need to know selectedBranchId for 'current' mode. 
            // In this modal, selectedBranchId is chosen by the Admin from a dropdown.
            // If they haven't chosen one, we just warn it exists.
            const branch = branches?.find((b: any) => b._id === selectedBranchId);
            
            if (comp.assignedBranch && branch && comp.assignedBranch !== branch.name) {
              setIsConflict(true);
              setConflictMessage(`This company is already assigned to the ${comp.assignedBranch} branch. You cannot add it to ${branch.name}.`);
              setIsEditing(false);
            } else {
              setIsConflict(false);
              setIsEditing(true);
              setFormData(prev => ({
                ...prev,
                hrName: res.data.hrContact?.name || prev.hrName,
                hrPhone: res.data.hrContact?.mobile || prev.hrPhone,
                hrEmail: res.data.hrContact?.email || prev.hrEmail,
                linkedinProfile: res.data.company?.linkedinCompanyUrl || prev.linkedinProfile
              }));
              toast.info('Company exists in this branch. Switched to Update Mode.');
            }
          } else {
            setIsEditing(false);
            setIsConflict(false);
          }
        }
      } catch (err) {
        console.error('Failed to check company name:', err);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.companyName, mode, selectedBranchId, branches]);



  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['previous-sections'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/sections`, { withCredentials: true });
      return res.data.data || [];
    },
    enabled: mode === 'previous'
  });

  const getEndpoint = () => {
    return mode === 'current'
      ? `${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/manual-company`
      : `${process.env.NEXT_PUBLIC_API_URL}/previous-companies/manual`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      toast.error('Company Name is required');
      return;
    }
    if (mode === 'current' && !selectedBranchId) {
      toast.error('Please select a branch first');
      return;
    }
    
    setIsSubmitting(true);
    try {
      let payload: any = { ...formData };
      if (mode === 'previous') {
        const extraData = extraFields.reduce((acc, curr) => {
          const key = curr.key === 'Custom' ? curr.customKey : curr.key;
          if (key && curr.value) {
            acc[key] = curr.value;
          }
          return acc;
        }, {} as Record<string, string>);
        payload = { ...payload, extraData };
      }

      await axios.post(getEndpoint(), payload, { withCredentials: true });
      toast.success(`Company ${isEditing ? 'updated' : 'added'} successfully!`);
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || `Failed to ${isEditing ? 'update' : 'add'} company`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFieldValue = (idx: number, value: string) => {
    const newFields = [...extraFields];
    newFields[idx].value = value;
    setExtraFields(newFields);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 relative">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            Add Manual {mode === 'current' ? 'Company' : 'Previous Company'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'current' && (
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" /> Program *
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
                    <Building2 className="w-4 h-4 text-slate-400" /> Branch *
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
                      ?.filter((b: any) => b.name !== 'Central Admin' && b.name !== 'M.Tech CSE')
                      .map((b: any) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" /> Company Name *
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Google"
                  className={`w-full px-4 py-2 bg-slate-50 border ${isConflict ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : isEditing ? 'border-amber-300 focus:ring-amber-500 focus:border-amber-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg transition-all`}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
                {isChecking && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              
              {isConflict && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{conflictMessage}</p>
                </div>
              )}
              {isEditing && !isConflict && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-amber-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">This company is already in the database. Saving will update its details.</p>
                </div>
              )}
            </div>
            
            {mode === 'previous' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> Academic Year *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 2023-2024"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                />
              </div>
            )}

            {mode === 'previous' && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Section Name
                </label>
                <div className="space-y-2">
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={isNewSection ? 'ADD_NEW' : formData.section}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsNewSection(true);
                        setFormData({ ...formData, section: '' });
                      } else {
                        setIsNewSection(false);
                        setFormData({ ...formData, section: e.target.value });
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
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    />
                  )}
                </div>
              </div>
            )}

            {mode === 'current' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> Website URL
                </label>
                <input 
                  type="url" 
                  placeholder="e.g. https://google.com"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">HR Contact Information (Optional)</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> HR Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={formData.hrName}
                    onChange={(e) => setFormData({ ...formData, hrName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> Phone
                  </label>
                  <input 
                    type="text" 
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={formData.hrPhone}
                    onChange={(e) => setFormData({ ...formData, hrPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" /> Email
                </label>
                <input 
                  type="email" 
                  placeholder="hr@company.com"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.hrEmail}
                  onChange={(e) => setFormData({ ...formData, hrEmail: e.target.value })}
                />
              </div>

              {mode === 'current' && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Link className="w-4 h-4 text-slate-400" /> LinkedIn Profile
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={formData.linkedinProfile}
                    onChange={(e) => setFormData({ ...formData, linkedinProfile: e.target.value })}
                  />
                </div>
              )}
            </div>

            {mode === 'previous' && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Additional Information (Optional)</h3>
                  <button
                    type="button"
                    onClick={() => setExtraFields([...extraFields, { key: '', customKey: '', value: '' }])}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Detail
                  </button>
                </div>
                
                {extraFields.map((field, idx) => (
                  <div key={idx} className="flex gap-3 mb-3 items-start animate-in fade-in slide-in-from-top-2">
                    <div className="flex-[1] space-y-2">
                      <select
                        value={field.key}
                        onChange={(e) => {
                          const newFields = [...extraFields];
                          newFields[idx].key = e.target.value;
                          setExtraFields(newFields);
                        }}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="" disabled>Select Option</option>
                        <option value="Drive Date">Drive Date</option>
                        <option value="Package">Package</option>
                        <option value="Eligible Branches">Eligible Branches</option>
                        <option value="Role">Role</option>
                        <option value="Custom">Other (Custom)</option>
                      </select>
                      {field.key === 'Custom' && (
                        <input
                          type="text"
                          placeholder="Enter custom name"
                          value={field.customKey}
                          onChange={(e) => {
                            const newFields = [...extraFields];
                            newFields[idx].customKey = e.target.value;
                            setExtraFields(newFields);
                          }}
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      )}
                    </div>
                    <div className="flex-[2]">
                      {field.key === 'Drive Date' ? (
                        <input
                          type="date"
                          value={field.value}
                          onChange={(e) => updateFieldValue(idx, e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      ) : field.key === 'Eligible Branches' ? (
                        (() => {
                          const val = field.value || '';
                          const isBTech = val.startsWith('B.Tech');
                          const isMTech = val.startsWith('M.Tech');
                          const isOpenToAll = val === 'Open to all';
                          
                          const currentProgram = isOpenToAll ? 'Open to all' : (isBTech ? 'B.Tech' : (isMTech ? 'M.Tech' : ''));
                          const currentBranchesStr = (isBTech || isMTech) ? val.split(' - ')[1] || '' : '';
                          const selectedBranches = currentBranchesStr ? currentBranchesStr.split(', ').filter(Boolean) : [];
                          
                          const handleProgramChange = (prog: string) => {
                            if (prog === 'Open to all') {
                              updateFieldValue(idx, 'Open to all');
                            } else {
                              updateFieldValue(idx, `${prog} - `);
                            }
                          };
                          
                          const toggleBranch = (branchName: string) => {
                            let newBranches = [...selectedBranches];
                            if (newBranches.includes(branchName)) {
                              newBranches = newBranches.filter(b => b !== branchName);
                            } else {
                              newBranches.push(branchName);
                            }
                            // Clean up trailing ' - ' if no branches are selected yet, but we actually want to keep ' - ' to identify program.
                            // However, it's better to just leave 'B.Tech - ' if empty.
                            updateFieldValue(idx, `${currentProgram} - ${newBranches.join(', ')}`);
                          };
                          
                          const availableBranches = branches?.filter((b: any) => b.name !== 'Central Admin' && b.name !== 'M.Tech CSE').map((b: any) => b.name) || ['CE', 'CH', 'CSE', 'ECE', 'EE', 'EP', 'ME', 'MNC', 'MSE'];

                          return (
                            <div className="space-y-3 p-3 bg-white border border-slate-200 rounded-lg w-full">
                              <select 
                                value={currentProgram}
                                onChange={(e) => handleProgramChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              >
                                <option value="" disabled>Select Program</option>
                                <option value="Open to all">Open to all</option>
                                <option value="B.Tech">B.Tech</option>
                                <option value="M.Tech">M.Tech</option>
                              </select>
                              
                              {(currentProgram === 'B.Tech' || currentProgram === 'M.Tech') && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {availableBranches.map((bName: string) => (
                                    <button
                                      key={bName}
                                      type="button"
                                      onClick={() => toggleBranch(bName)}
                                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors border ${selectedBranches.includes(bName) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                      {bName}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <input
                          type="text"
                          placeholder="Enter value"
                          value={field.value}
                          onChange={(e) => updateFieldValue(idx, e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newFields = [...extraFields];
                        newFields.splice(idx, 1);
                        setExtraFields(newFields);
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || !formData.companyName.trim() || (mode === 'current' && !selectedBranchId) || isConflict}
                className="flex-[2] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isEditing ? 'Update Company' : 'Save Company'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
