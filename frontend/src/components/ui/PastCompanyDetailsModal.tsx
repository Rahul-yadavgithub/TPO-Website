import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, FileText, Calendar, CheckCircle2, History, AlertCircle, Edit2, Save, Trash2, Loader2, ShieldCheck, PhoneCall, ChevronDown, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

interface AdditionalContact {
  hrName: string;
  hrEmail: string;
  hrPhone: string;
  sourceSheet: string;
  academicYear: string;
  isVerified?: boolean;
  isFlagged?: boolean;
}

interface ExtraContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  isVerified: boolean;
  isFlagged: boolean;
}

interface PastCompany {
  _id: string;
  companyName: string;
  academicYear: string;
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;
  notes?: string;
  contactStatus?: string;
  contactedByBranchName?: string;
  section: string;
  extraData?: Record<string, any>;
  additionalContacts?: AdditionalContact[];
  is_verified_by_admin?: boolean;
  primary_contact_verified?: boolean;
  primary_contact_flagged?: boolean;
  assignedTPO?: string;
}

interface PastCompanyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: PastCompany | null;
}

export function PastCompanyDetailsModal({ isOpen, onClose, company }: PastCompanyDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PastCompany>>({});
  const [editExtraData, setEditExtraData] = useState<{ id: string; key: string; value: string }[]>([]);
  const [extraContacts, setExtraContacts] = useState<ExtraContact[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewSection, setIsNewSection] = useState(false);
  
  // TPO Assignment State
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [assignCategory, setAssignCategory] = useState<'Faculty' | 'Staff' | ''>('');
  const [assignTpoName, setAssignTpoName] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const TPO_STAFF = ["Chandradev Raj Singh", "Atul Negi"];
  const TPO_FACULTY = ["Dr. Somesh Kr. Sharma", "Dr. Ray Singh Meena", "Dr. Swaraj Chowdhury", "Dr. Jiwanjot Singh", "Dr. Sreeram TS"];
  
  const queryClient = useQueryClient();

  const { data: sections } = useQuery({
    queryKey: ['previous-sections'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/sections`, { withCredentials: true });
      return res.data.data || [];
    },
    enabled: isEditing
  });

  useEffect(() => {
    if (company) {
      // Deep clone to avoid mutating original
      setFormData(JSON.parse(JSON.stringify(company)));
      
      // Initialize extra data array for editing
      
      const genericExtra: { id: string; key: string; value: string }[] = [];
      const hrContactsMap: Record<string, ExtraContact> = {};

      Object.entries(company.extraData || {}).forEach(([k, v]) => {
        const nameMatch = k.match(/^OTHER HR NAME\s*(\d*)$/i);
        const emailMatch = k.match(/^OTHER HR EMAIL\s*(\d*)$/i) || k.match(/^OTHER HR MAIL\s*(\d*)$/i);
        const phoneMatch = k.match(/^OTHER HR MOBILE\s*(\d*)$/i) || k.match(/^OTHER HR PHONE\s*(\d*)$/i) || k.match(/^OTHER HR NUMBER\s*(\d*)$/i);
        const verifiedMatch = k.match(/^OTHER HR VERIFIED\s*(\d*)$/i);
        const flaggedMatch = k.match(/^OTHER HR FLAGGED\s*(\d*)$/i);

        let isHrContact = false;
        let suffix = '';

        if (nameMatch) { suffix = nameMatch[1]; isHrContact = true; }
        else if (emailMatch) { suffix = emailMatch[1]; isHrContact = true; }
        else if (phoneMatch) { suffix = phoneMatch[1]; isHrContact = true; }
        else if (verifiedMatch) { suffix = verifiedMatch[1]; isHrContact = true; }
        else if (flaggedMatch) { suffix = flaggedMatch[1]; isHrContact = true; }

        if (isHrContact) {
          if (!hrContactsMap[suffix]) {
            hrContactsMap[suffix] = { id: suffix, name: '', phone: '', email: '', isVerified: false, isFlagged: false };
          }
          if (nameMatch) hrContactsMap[suffix].name = String(v);
          if (emailMatch) hrContactsMap[suffix].email = String(v);
          if (phoneMatch) hrContactsMap[suffix].phone = String(v);
          if (verifiedMatch) hrContactsMap[suffix].isVerified = String(v).toLowerCase() === 'true';
        } else {
          genericExtra.push({
            id: `extra-${Date.now()}-${Math.random()}`,
            key: k,
            value: typeof v === 'object' ? JSON.stringify(v) : String(v)
          });
        }
      });

      setEditExtraData(genericExtra);
      setExtraContacts(Object.values(hrContactsMap));


      setIsEditing(false);
      setIsNewSection(false);
    }
  }, [company]);

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { contactType: 'primary' | 'additional' | 'extra', contactIndex?: number, isVerified?: boolean, isFlagged?: boolean }) => {
      const contactId = data.contactType === 'primary' ? 'primary' : `${data.contactType}-${data.contactIndex}`;
      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/previous-companies/${company?._id}/update-contact-status`,
        { contactId, isVerified: data.isVerified, isFlagged: data.isFlagged },
        { withCredentials: true }
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success('Contact status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['past-companies'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update contact status');
    }
  });

  if (!isOpen || !company) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Rebuild extraData object
      const finalExtraData: Record<string, any> = {};
      editExtraData.forEach(item => {
        if (item.key.trim()) finalExtraData[item.key.trim()] = item.value;
      });

      extraContacts.forEach(contact => {
        if (contact.name || contact.email || contact.phone) {
          const suffix = contact.id;
          if (contact.name) finalExtraData[`OTHER HR NAME ${suffix}`.trim()] = contact.name;
          if (contact.email) finalExtraData[`OTHER HR EMAIL ${suffix}`.trim()] = contact.email;
          if (contact.phone) finalExtraData[`OTHER HR MOBILE ${suffix}`.trim()] = contact.phone;
          if (contact.isVerified) finalExtraData[`OTHER HR VERIFIED ${suffix}`.trim()] = 'true';
          if (contact.isFlagged) finalExtraData[`OTHER HR FLAGGED ${suffix}`.trim()] = 'true';
        }
      });
      
      const payload = { ...formData, extraData: finalExtraData };

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/previous-companies/${company._id}`,
        payload,
        { withCredentials: true }
      );
      toast.success('Company details updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['past-companies'] });
      setIsEditing(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to update company');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdditionalContactChange = (index: number, field: keyof AdditionalContact, value: any) => {
    const newContacts = [...(formData.additionalContacts || [])];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData({ ...formData, additionalContacts: newContacts });
  };

  const handleRemoveAdditionalContact = (index: number) => {
    const newContacts = [...(formData.additionalContacts || [])];
    newContacts.splice(index, 1);
    setFormData({ ...formData, additionalContacts: newContacts });
  };

  const handleAddAdditionalContact = () => {
    const newContacts = [...(formData.additionalContacts || [])];
    newContacts.push({ hrName: '', hrEmail: '', hrPhone: '', sourceSheet: 'Manual Entry', academicYear: new Date().getFullYear().toString(), isVerified: false, isFlagged: false });
    setFormData({ ...formData, additionalContacts: newContacts });
  };

  const handleExtraContactChange = (index: number, field: keyof ExtraContact, value: any) => {
    const newContacts = [...extraContacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setExtraContacts(newContacts);
  };

  const handleRemoveExtraContact = (index: number) => {
    const newContacts = [...extraContacts];
    newContacts.splice(index, 1);
    setExtraContacts(newContacts);
  };

  const handleAddExtraContact = () => {
    const nextId = (extraContacts.length + 1).toString();
    setExtraContacts([...extraContacts, { id: nextId, name: '', phone: '', email: '', isVerified: false, isFlagged: false }]);
  };

  const handleExtraDataChange = (id: string, field: 'key' | 'value', val: string) => {
    setEditExtraData(editExtraData.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const handleRemoveExtraData = (id: string) => {
    setEditExtraData(editExtraData.filter(item => item.id !== id));
  };

  const handleAddExtraData = () => {
    setEditExtraData([...editExtraData, { id: `extra-new-${Date.now()}`, key: '', value: '' }]);
  };

  const handleAssignToTpo = async () => {
    if (!assignCategory || !assignTpoName) {
      toast.error('Please select both category and name');
      return;
    }

    setIsAssigning(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/tpo/${encodeURIComponent(assignTpoName)}/assign-past-company`,
        {
          pastCompanyId: company._id,
          tpoType: assignCategory
        },
        { withCredentials: true }
      );
      toast.success(`Successfully assigned ${company.companyName} to ${assignTpoName}`);
      setShowAssignDropdown(false);
      setAssignCategory('');
      setAssignTpoName('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to assign company');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 gap-4 relative">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 pr-8 lg:pr-0 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-200 shadow-sm">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex items-center gap-3 w-full">
                  <input 
                    type="text"
                    value={formData.companyName || ''}
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                    className="text-xl font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 w-full flex-1"
                  />
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                    <input 
                      type="checkbox" 
                      checked={formData.is_verified_by_admin || false} 
                      onChange={e => setFormData({...formData, is_verified_by_admin: e.target.checked})}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-emerald-700">Verified Master</span>
                  </label>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{company.companyName}</h2>
                  {company.is_verified_by_admin ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : ((company as any).primary_contact_verified || (company.additionalContacts && company.additionalContacts.some((c: any) => c.isVerified))) ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : null}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {isEditing ? (
                  <>
                    <input 
                      type="text" 
                      value={formData.academicYear || ''}
                      onChange={e => setFormData({...formData, academicYear: e.target.value})}
                      className="px-2 py-1 rounded bg-white border border-slate-300 text-xs text-slate-600 w-24 focus:ring-2 focus:ring-indigo-500"
                      placeholder="Year"
                    />
                    <select
                      value={isNewSection ? 'ADD_NEW' : formData.section}
                      onChange={e => {
                        if (e.target.value === 'ADD_NEW') {
                          setIsNewSection(true);
                          setFormData({...formData, section: ''});
                        } else {
                          setIsNewSection(false);
                          setFormData({...formData, section: e.target.value});
                        }
                      }}
                      className="px-2 py-1 rounded bg-white border border-slate-300 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500"
                    >
                      {sections?.map((s: string) => <option key={s} value={s}>{s}</option>)}
                      <option value="ADD_NEW">+ New Section</option>
                    </select>
                    {isNewSection && (
                      <input 
                        type="text" 
                        value={formData.section || ''}
                        onChange={e => setFormData({...formData, section: e.target.value})}
                        className="px-2 py-1 rounded bg-white border border-slate-300 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500"
                        placeholder="Section Name"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
                      {company.academicYear}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Source: {company.section}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {!isEditing && (
              <div className="relative">
                {company.assignedTPO ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium text-sm border border-indigo-100">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Assigned to {company.assignedTPO}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors font-medium text-sm border border-indigo-100"
                    >
                      <PhoneCall className="w-4 h-4" /> Assign to TPO
                    </button>
                    
                    {showAssignDropdown && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Assign Company</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
                        <select
                          value={assignCategory}
                          onChange={(e) => {
                            setAssignCategory(e.target.value as 'Faculty' | 'Staff');
                            setAssignTpoName('');
                          }}
                          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">Select Category</option>
                          <option value="Faculty">Faculty</option>
                          <option value="Staff">Staff</option>
                        </select>
                      </div>

                      {assignCategory && (
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Assignee Name</label>
                          <select
                            value={assignTpoName}
                            onChange={(e) => setAssignTpoName(e.target.value)}
                            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="">Select Name</option>
                            {(assignCategory === 'Faculty' ? TPO_FACULTY : TPO_STAFF).map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => {
                            setShowAssignDropdown(false);
                            setAssignCategory('');
                            setAssignTpoName('');
                          }}
                          className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAssignToTpo}
                          disabled={!assignCategory || !assignTpoName || isAssigning}
                          className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
                        >
                          {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </>
              )}
              </div>
            )}
            
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium text-sm"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            ) : (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                Save Changes
              </button>
            )}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 lg:static lg:top-auto lg:right-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
          
          {/* Primary Contact */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-slate-900">Primary Contact (Last Used)</h3>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                    <input 
                      type="checkbox" 
                      checked={formData.primary_contact_verified || false} 
                      onChange={e => setFormData({...formData, primary_contact_verified: e.target.checked, primary_contact_flagged: e.target.checked ? false : formData.primary_contact_flagged})}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-emerald-700">Verify Primary Contact</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                    <input 
                      type="checkbox" 
                      checked={formData.primary_contact_flagged || false} 
                      onChange={e => setFormData({...formData, primary_contact_flagged: e.target.checked, primary_contact_verified: e.target.checked ? false : formData.primary_contact_verified})}
                      className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-red-700">Mark Incorrect</span>
                  </label>
                </div>
              ) : (
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={formData.primary_contact_verified || false} 
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData({ ...formData, primary_contact_verified: checked });
                          updateStatusMutation.mutate({ contactType: 'primary', isVerified: checked, isFlagged: formData.primary_contact_flagged });
                        }}
                        disabled={updateStatusMutation.isPending}
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  {formData.primary_contact_flagged && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200 shadow-sm">
                      <AlertCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">HR Name</label>
                  <div className="mt-1 flex items-center gap-2 text-slate-900">
                    <User className="w-4 h-4 text-slate-400" />
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={formData.hrName || ''}
                        onChange={e => setFormData({...formData, hrName: e.target.value})}
                        className="flex-1 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    ) : (
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        {formData.primary_contact_flagged && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Incorrect
                          </span>
                        )}
                        {company.hrName || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</label>
                  <div className="mt-1 flex items-center gap-2 text-slate-900">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={formData.hrPhone || ''}
                        onChange={e => setFormData({...formData, hrPhone: e.target.value})}
                        className="flex-1 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    ) : (
                      <span className="flex items-center gap-2 flex-wrap">
                        {formData.primary_contact_flagged && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Incorrect
                          </span>
                        )}
                        {company.hrPhone || 'Not provided'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</label>
                  <div className="mt-1 flex items-center gap-2 text-slate-900">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {isEditing ? (
                      <input 
                        type="email" 
                        value={formData.hrEmail || ''}
                        onChange={e => setFormData({...formData, hrEmail: e.target.value})}
                        className="flex-1 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    ) : (
                      <span className={`flex items-center gap-2 flex-wrap ${company.hrEmail ? "" : "text-slate-400 italic"}`}>
                        {formData.primary_contact_flagged && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Incorrect
                          </span>
                        )}
                        {company.hrEmail || 'Not provided'}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</label>
                  {isEditing ? (
                    <textarea 
                      value={formData.notes || ''}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="mt-1 w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 text-sm min-h-[60px]"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[60px]">
                      {company.notes || 'No notes available.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Additional Information from Extra Data */}
          {((editExtraData && editExtraData.length > 0) || isEditing) && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">Additional Information</h3>
                </div>
                {isEditing && (
                  <button 
                    onClick={handleAddExtraData}
                    className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                  >
                    + Add Field
                  </button>
                )}
              </div>
              
              {((extraContacts && extraContacts.length > 0) || isEditing) && (
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Additional HR Contacts</h4>
                    {isEditing && (
                      <button 
                        onClick={handleAddExtraContact}
                        className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                      >
                        + Add HR Contact
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {extraContacts.map((c, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {isEditing ? (
                              <input 
                                type="text"
                                placeholder="HR Name"
                                value={c.name}
                                onChange={e => handleExtraContactChange(idx, 'name', e.target.value)}
                                className="w-full font-semibold text-slate-900 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 mb-2 text-sm"
                              />
                            ) : (
                              <h5 className="font-bold text-slate-800 flex items-center gap-2">
                                {c.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                {c.isFlagged && <AlertCircle className="w-4 h-4 text-red-500" />}
                                {c.name || 'No Name'}
                              </h5>
                            )}
                          </div>
                          {isEditing && (
                            <button onClick={() => handleRemoveExtraContact(idx)} className="text-red-400 hover:text-red-600 ml-2">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {isEditing ? (
                              <input 
                                type="text"
                                placeholder="Phone"
                                value={c.phone}
                                onChange={e => handleExtraContactChange(idx, 'phone', e.target.value)}
                                className="flex-1 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span>{c.phone || 'N/A'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {isEditing ? (
                              <input 
                                type="text"
                                placeholder="Email"
                                value={c.email}
                                onChange={e => handleExtraContactChange(idx, 'email', e.target.value)}
                                className="flex-1 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span className="flex items-center gap-2 flex-wrap">
                                {c.email || 'N/A'}
                                {c.isFlagged && (
                                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Incorrect
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {isEditing && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={c.isVerified}
                                onChange={e => {
                                  handleExtraContactChange(idx, 'isVerified', e.target.checked);
                                  if (e.target.checked) handleExtraContactChange(idx, 'isFlagged', false);
                                }}
                                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-emerald-700">Verified</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={c.isFlagged}
                                onChange={e => {
                                  handleExtraContactChange(idx, 'isFlagged', e.target.checked);
                                  if (e.target.checked) handleExtraContactChange(idx, 'isVerified', false);
                                }}
                                className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-red-700">Incorrect</span>
                            </label>
                          </div>
                        )}
                        {!isEditing && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Source: EXTRA DATA</div>
                            
                            <div className="flex gap-2 items-center">
                              {c.isFlagged && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                                  <AlertCircle className="w-3 h-3" /> Incorrect
                                </span>
                              )}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={c.isVerified || false} 
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    handleExtraContactChange(idx, 'isVerified', checked);
                                    updateStatusMutation.mutate({ contactType: 'extra', contactIndex: parseInt(c.id.replace(/\D/g, '') || String(idx)), isVerified: checked, isFlagged: c.isFlagged });
                                  }}
                                  disabled={updateStatusMutation.isPending}
                                />
                                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-100">
                    {isEditing ? (
                      editExtraData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-5 py-3 bg-slate-50/30 w-1/3 border-r border-slate-100 align-top">
                            <input 
                              type="text" 
                              value={item.key}
                              onChange={(e) => handleExtraDataChange(item.id, 'key', e.target.value)}
                              placeholder="Field Name"
                              className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 bg-white"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-start gap-2">
                              <textarea 
                                value={item.value}
                                onChange={(e) => handleExtraDataChange(item.id, 'value', e.target.value)}
                                placeholder="Value"
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                              />
                              <button 
                                onClick={() => handleRemoveExtraData(item.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 mt-0.5"
                                title="Delete Field"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      Object.entries(company.extraData || {})
                        .filter(([k]) => {
                          const isHrContact = /^OTHER HR NAME\s*(\d*)$/i.test(k) || 
                                              /^OTHER HR EMAIL\s*(\d*)$/i.test(k) || /^OTHER HR MAIL\s*(\d*)$/i.test(k) || 
                                              /^OTHER HR MOBILE\s*(\d*)$/i.test(k) || /^OTHER HR PHONE\s*(\d*)$/i.test(k) || /^OTHER HR NUMBER\s*(\d*)$/i.test(k) || 
                                              /^OTHER HR VERIFIED\s*(\d*)$/i.test(k) || 
                                              /^OTHER HR FLAGGED\s*(\d*)$/i.test(k);
                          return !isHrContact;
                        })
                        .map(([key, value], idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                          <th className="px-5 py-3 font-medium text-slate-600 bg-slate-50/30 w-1/3 border-r border-slate-100">
                            {key}
                          </th>
                          <td className="px-5 py-3 text-slate-900 whitespace-pre-wrap break-words">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Additional Contacts */}
          {((formData.additionalContacts && formData.additionalContacts.length > 0) || isEditing) && (
            <section className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-semibold text-slate-900">Additional Merged Contacts</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                    {formData.additionalContacts?.length || 0} found
                  </span>
                  {isEditing && (
                    <button 
                      onClick={handleAddAdditionalContact}
                      className="text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 py-1 rounded transition-colors"
                    >
                      + Add Contact
                    </button>
                  )}
                </div>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-medium">HR Name</th>
                      <th className="px-5 py-3 font-medium">Contact Details</th>
                      <th className="px-5 py-3 font-medium">Source & Year</th>
                      <th className="px-5 py-3 font-medium">Verified</th>
                      {isEditing && <th className="px-5 py-3 font-medium w-16">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.additionalContacts?.map((contact, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 text-slate-900 font-medium">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={contact.hrName || ''}
                              onChange={e => handleAdditionalContactChange(idx, 'hrName', e.target.value)}
                              className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              {contact.isFlagged && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Incorrect
                                </span>
                              )}
                              {contact.hrName || 'Not provided'}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-2">
                            {isEditing ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" /> 
                                  <input 
                                    type="text" 
                                    value={contact.hrPhone || ''}
                                    onChange={e => handleAdditionalContactChange(idx, 'hrPhone', e.target.value)}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Phone"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <input 
                                    type="text" 
                                    value={contact.hrEmail || ''}
                                    onChange={e => handleAdditionalContactChange(idx, 'hrEmail', e.target.value)}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Email"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                {contact.hrPhone && (
                                  <span className="flex items-center gap-1.5 text-slate-600 flex-wrap">
                                    {contact.isFlagged && (
                                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                        <XCircle className="w-3 h-3" /> Incorrect
                                      </span>
                                    )}
                                    <Phone className="w-3 h-3 text-slate-400" /> 
                                    {contact.hrPhone}
                                  </span>
                                )}
                                {contact.hrEmail && (
                                  <span className="flex items-center gap-1.5 text-slate-600 flex-wrap">
                                    {contact.isFlagged && (
                                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                        <XCircle className="w-3 h-3" /> Incorrect
                                      </span>
                                    )}
                                    <Mail className="w-3 h-3 text-slate-400" /> 
                                    {contact.hrEmail}
                                  </span>
                                )}
                                {!contact.hrPhone && !contact.hrEmail && (
                                  <span className="text-slate-400 italic">No contact info</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-2">
                            {isEditing ? (
                              <>
                                <input 
                                  type="text" 
                                  value={contact.academicYear || ''}
                                  onChange={e => handleAdditionalContactChange(idx, 'academicYear', e.target.value)}
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Year"
                                />
                                <input 
                                  type="text" 
                                  value={contact.sourceSheet || ''}
                                  onChange={e => handleAdditionalContactChange(idx, 'sourceSheet', e.target.value)}
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Source"
                                />
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {contact.academicYear}
                                </span>
                                <span className="text-xs text-slate-500">{contact.sourceSheet}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {isEditing ? (
                            <div className="flex flex-col gap-1 items-center">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={contact.isVerified || false}
                                  onChange={e => {
                                    handleAdditionalContactChange(idx, 'isVerified', e.target.checked);
                                    if(e.target.checked) handleAdditionalContactChange(idx, 'isFlagged', false);
                                  }}
                                  className="w-3 h-3 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="text-[10px] text-emerald-700">Verify</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={contact.isFlagged || false}
                                  onChange={e => {
                                    handleAdditionalContactChange(idx, 'isFlagged', e.target.checked);
                                    if(e.target.checked) handleAdditionalContactChange(idx, 'isVerified', false);
                                  }}
                                  className="w-3 h-3 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                                />
                                <span className="text-[10px] text-red-700">Flag</span>
                              </label>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 items-center">
                              {contact.isFlagged && (
                                <span className="inline-flex items-center justify-center p-1 bg-red-50 text-red-600 rounded-full mb-1" title="Incorrect">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={contact.isVerified || false} 
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    handleAdditionalContactChange(idx, 'isVerified', checked);
                                    updateStatusMutation.mutate({ contactType: 'additional', contactIndex: idx, isVerified: checked, isFlagged: contact.isFlagged });
                                  }}
                                  disabled={updateStatusMutation.isPending}
                                />
                                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          )}
                        </td>
                        {isEditing && (
                          <td className="px-5 py-3 text-center">
                            <button 
                              onClick={() => handleRemoveAdditionalContact(idx)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(!formData.additionalContacts || formData.additionalContacts.length === 0) && !isEditing && (
            <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">No additional contacts</p>
              <p className="text-xs text-slate-500 text-center mt-1 max-w-xs">
                This company was only found once in the past year records without any duplicates.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
          {isEditing && (
            <button 
              onClick={() => {
                setFormData(JSON.parse(JSON.stringify(company)));
                
                // Reset extra data array
                
                const genericExtra: { id: string; key: string; value: string }[] = [];
                const hrContactsMap: Record<string, ExtraContact> = {};

                Object.entries(company.extraData || {}).forEach(([k, v]) => {
                  const nameMatch = k.match(/^OTHER HR NAME\s*(\d*)$/i);
                  const emailMatch = k.match(/^OTHER HR EMAIL\s*(\d*)$/i) || k.match(/^OTHER HR MAIL\s*(\d*)$/i);
                  const phoneMatch = k.match(/^OTHER HR MOBILE\s*(\d*)$/i) || k.match(/^OTHER HR PHONE\s*(\d*)$/i) || k.match(/^OTHER HR NUMBER\s*(\d*)$/i);
                  const verifiedMatch = k.match(/^OTHER HR VERIFIED\s*(\d*)$/i);
                  const flaggedMatch = k.match(/^OTHER HR FLAGGED\s*(\d*)$/i);

                  let isHrContact = false;
                  let suffix = '';

                  if (nameMatch) { suffix = nameMatch[1]; isHrContact = true; }
                  else if (emailMatch) { suffix = emailMatch[1]; isHrContact = true; }
                  else if (phoneMatch) { suffix = phoneMatch[1]; isHrContact = true; }
                  else if (verifiedMatch) { suffix = verifiedMatch[1]; isHrContact = true; }
                  else if (flaggedMatch) { suffix = flaggedMatch[1]; isHrContact = true; }

                  if (isHrContact) {
                    if (!hrContactsMap[suffix]) {
                      hrContactsMap[suffix] = { id: suffix, name: '', phone: '', email: '', isVerified: false, isFlagged: false };
                    }
                    if (nameMatch) hrContactsMap[suffix].name = String(v);
                    if (emailMatch) hrContactsMap[suffix].email = String(v);
                    if (phoneMatch) hrContactsMap[suffix].phone = String(v);
                    if (verifiedMatch) hrContactsMap[suffix].isVerified = String(v).toLowerCase() === 'true';
                    if (flaggedMatch) hrContactsMap[suffix].isFlagged = String(v).toLowerCase() === 'true';
                  } else {
                    genericExtra.push({
                      id: `extra-${Date.now()}-${Math.random()}`,
                      key: k,
                      value: typeof v === 'object' ? JSON.stringify(v) : String(v)
                    });
                  }
                });

                setEditExtraData(genericExtra);
                setExtraContacts(Object.values(hrContactsMap));


                setIsEditing(false);
                setIsNewSection(false);
              }}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Cancel Edit
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
