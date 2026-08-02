'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Search, CheckCircle2, Info, Loader2, Building2, Plus, AlertCircle, Filter, X, ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { BranchCompanyDetailsModal } from '@/components/ui/BranchCompanyDetailsModal';
import { GlobalManualCompanyModal } from '@/components/ui/GlobalManualCompanyModal';

export function BranchCompaniesView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    program: '',
    branch: '',
    is_verified: '',
    contact_outcome: '',
    custom_outcome: ''
  });
  const [activeFilters, setActiveFilters] = useState({
    program: '',
    branch: '',
    is_verified: '',
    contact_outcome: '',
    custom_outcome: ''
  });
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all branches for the filter
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
    }
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['companies-branch-overview', page, search, activeFilters],
    queryFn: async () => {
      const params: any = { page, limit: 10, search };
      if (activeFilters.branch) params.branch = activeFilters.branch;
      if (activeFilters.program) params.program = activeFilters.program;
      if (activeFilters.is_verified !== '') params.is_verified = activeFilters.is_verified;
      if (activeFilters.contact_outcome) params.contact_outcome = activeFilters.contact_outcome;
      if (activeFilters.custom_outcome) params.custom_outcome = activeFilters.custom_outcome;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies/branch-overview`, { params, withCredentials: true });
      return res.data;
    }
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params: any = { page: 1, limit: 10000, search };
      if (activeFilters.branch) params.branch = activeFilters.branch;
      if (activeFilters.program) params.program = activeFilters.program;
      if (activeFilters.is_verified !== '') params.is_verified = activeFilters.is_verified;
      if (activeFilters.contact_outcome) params.contact_outcome = activeFilters.contact_outcome;
      if (activeFilters.custom_outcome) params.custom_outcome = activeFilters.custom_outcome;

      toast.info('Fetching data for export...');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies/branch-overview`, { params, withCredentials: true });
      const companies = res.data.data;

      if (!companies || companies.length === 0) {
        toast.error('No companies found to export.');
        setIsExporting(false);
        return;
      }

      toast.info('Processing data...');

      // Define allowed keys to prevent internal database fields from leaking into export
      const allowedExtraKeys = [
        'assignedBranch', 'program', 'website', 'category', 'description', 'foundedYear', 'teamSize', 'fundingStage',
        'hiringType', 'fresherHiring', 'internshipAvailable', 'salaryBand', 'stipendBand', 'placementScore', 
        'placementPriority', 'confidenceScore', 'drive_type', 'role', 'package', 'expected_month', 
        'expected_year', 'academic_year'
      ];

      // Map DB keys to clean human-readable headers
      const keyMap: Record<string, string> = {
        'assignedBranch': 'Assigned Branch',
        'program': 'Program',
        'website': 'Website',
        'category': 'Category',
        'description': 'Description',
        'foundedYear': 'Founded Year',
        'teamSize': 'Team Size',
        'fundingStage': 'Funding Stage',
        'hiringType': 'Hiring Type',
        'fresherHiring': 'Fresher Hiring',
        'internshipAvailable': 'Internship Available',
        'salaryBand': 'Salary Band',
        'stipendBand': 'Stipend Band',
        'placementScore': 'Placement Score',
        'placementPriority': 'Placement Priority',
        'confidenceScore': 'Confidence Score',
        'drive_type': 'Drive Type',
        'role': 'Role',
        'package': 'Package',
        'expected_month': 'Expected Month',
        'expected_year': 'Expected Year',
        'academic_year': 'Academic Year'
      };

      const allExtraKeys = new Set<string>();
      companies.forEach((company: any) => {
        Object.keys(company).forEach(key => {
          if (allowedExtraKeys.includes(key) && company[key] !== undefined && company[key] !== null && company[key] !== '') {
            allExtraKeys.add(key);
          }
        });
      });
      
      // Preserve order based on allowedExtraKeys
      const dynamicColumns = allowedExtraKeys.filter(key => allExtraKeys.has(key));

      const rows: any[] = [];

      companies.forEach((company: any) => {
        // Current companies have hr_contacts array
        const allContacts = company.hr_contacts || [];
        // Export all valid contacts (not marked incorrect)
        const contactsToExport = allContacts.filter((c: any) => !c.is_incorrect);

        const baseExtraData: Record<string, any> = {};
        dynamicColumns.forEach(col => {
          baseExtraData[keyMap[col] || col] = company[col] !== undefined && company[col] !== null ? company[col] : '';
        });

        if (contactsToExport.length > 0) {
          // First contact gets the company name and full extra data
          rows.push({
            'Company Name': company.companyName,
            'HR Name': contactsToExport[0].name || '',
            'Phone Number': contactsToExport[0].mobile || '',
            'Email': contactsToExport[0].email || '',
            ...baseExtraData
          });

          // Subsequent contacts get empty extra data and empty company name (for clean grouping)
          for (let i = 1; i < contactsToExport.length; i++) {
            const emptyExtraData: Record<string, any> = {};
            dynamicColumns.forEach(col => {
              emptyExtraData[keyMap[col] || col] = '';
            });
            
            rows.push({
              'Company Name': '', // Leave blank to visually group under the first row
              'HR Name': contactsToExport[i].name || '',
              'Phone Number': contactsToExport[i].mobile || '',
              'Email': contactsToExport[i].email || '',
              ...emptyExtraData
            });
          }
        } else {
          // No valid HRs, just print the company with blank HR fields and full extra data
          rows.push({
            'Company Name': company.companyName,
            'HR Name': '',
            'Phone Number': '',
            'Email': '',
            ...baseExtraData
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      
      // Auto-size columns to be wider for better visibility
      const wscols = [
        { wch: 35 }, // Company Name (wider)
        { wch: 25 }, // HR Name
        { wch: 20 }, // Phone Number
        { wch: 35 }, // Email
      ];
      // Add widths for dynamic extraData columns
      dynamicColumns.forEach(() => {
        wscols.push({ wch: 25 });
      });
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
      XLSX.writeFile(workbook, 'Companies_Export.xlsx');
      
      toast.success('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white p-4 md:p-6 md:rounded-2xl border-y md:border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Unified Branch Companies
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Global overview of all companies currently managed by branch TPRs.
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex flex-1 md:flex-none items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 bg-green-600 text-white text-xs md:text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isExporting ? <span className="animate-pulse">Exporting...</span> : <><Download className="w-3 h-3 md:w-4 md:h-4 shrink-0" /> <span className="hidden sm:inline">Export</span><span className="sm:hidden">Export</span></>}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex flex-1 md:flex-none items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 bg-blue-600 text-white text-xs md:text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4 shrink-0" /> 
              <span className="hidden sm:inline">Add Company</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex flex-1 md:flex-none items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 text-xs md:text-sm font-semibold rounded-xl transition-colors shadow-sm border ${isFilterPanelOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Filter className="w-3 h-3 md:w-4 md:h-4 shrink-0" /> 
              <span className="hidden sm:inline">Filters</span>
              <span className="sm:hidden">Filter</span>
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            className="bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full pl-12 p-3.5 shadow-sm transition-all" 
            placeholder="Search companies by name..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Expandable Filter Panel */}
        {isFilterPanelOpen && (
          <div className="mt-2 p-5 bg-slate-50 border border-slate-200 rounded-xl animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Course / Program Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Course / Program</label>
                <select 
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                  value={tempFilters.program}
                  onChange={(e) => setTempFilters({ ...tempFilters, program: e.target.value, branch: '' })}
                >
                  <option value="">All Courses</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="Open to all">Open to all</option>
                </select>
              </div>

              {/* Branch Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Branch</label>
                <select 
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                  value={tempFilters.branch}
                  onChange={(e) => setTempFilters({ ...tempFilters, branch: e.target.value })}
                >
                  <option value="">All Branches</option>
                  {tempFilters.program === 'M.Tech' ? (
                    ['M.Tech CSE', 'M.Tech CH', 'M.Tech ECE', 'M.Tech EE', 'M.Tech MSE'].map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))
                  ) : branches?.filter((b: any) => {
                    if (b.name === 'Central Admin') return false;
                    if (tempFilters.program === 'B.Tech') return !b.name.includes('M.Tech');
                    return true;
                  }).map((b: any) => (
                    <option key={b._id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Verification Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verification Status</label>
                <select 
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                  value={tempFilters.is_verified}
                  onChange={(e) => setTempFilters({ ...tempFilters, is_verified: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  <option value="true">Verified Only</option>
                  <option value="false">Not Verified</option>
                </select>
              </div>

              {/* Interaction Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Interaction Status</label>
                <div className="flex flex-col gap-2">
                  <select 
                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                    value={tempFilters.contact_outcome}
                    onChange={(e) => setTempFilters({ ...tempFilters, contact_outcome: e.target.value, custom_outcome: '' })}
                  >
                    <option value="">All Statuses</option>
                    <option value="call_today">Call Today / Action Required</option>
                    <option value="call_again">Call Again (Reschedule)</option>
                    <option value="brochure_jnf">Brochure + JNF Sent</option>
                    <option value="tpo_talk">Want to talk to TPO</option>
                    <option value="rejected">Rejected / Not Interested</option>
                    <option value="accepted">Accepted / Confirmed</option>
                    <option value="custom">Custom (Type your own)</option>
                  </select>
                  {tempFilters.contact_outcome === 'custom' && (
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                      placeholder="Type custom status..."
                      value={tempFilters.custom_outcome}
                      onChange={(e) => setTempFilters({ ...tempFilters, custom_outcome: e.target.value })}
                    />
                  )}
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 md:gap-3 mt-6 pt-5 border-t border-slate-200">
              <button
                onClick={() => {
                  const reset = { program: '', branch: '', is_verified: '', contact_outcome: '', custom_outcome: '' };
                  setTempFilters(reset);
                  setActiveFilters(reset);
                  setPage(1);
                  setIsFilterPanelOpen(false);
                }}
                className="flex-1 md:flex-none px-4 md:px-5 py-2.5 md:py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl md:rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-center"
              >
                <span className="hidden md:inline">Clear Filters</span>
                <span className="md:hidden">Clear</span>
              </button>
              <button
                onClick={() => {
                  setActiveFilters(tempFilters);
                  setPage(1);
                  setIsFilterPanelOpen(false);
                }}
                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl md:rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-center"
              >
                <span className="hidden md:inline">Apply Filters & Proceed</span>
                <span className="md:hidden">Apply</span>
              </button>
            </div>
          </div>
        )}
      </div>

    <div className="bg-white border-y md:border border-slate-200 md:rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap lg:whitespace-normal">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company Details</th>
                <th className="px-6 py-4">Assigned Branch</th>
                <th className="px-6 py-4">HR Contact Info</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 bg-white">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-3/4"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2 ml-auto"></div></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-red-500">
                    <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                    <span className="font-bold text-red-700 text-lg block">Error Loading Data</span>
                    <span className="text-sm text-red-400">{(error as any)?.response?.data?.error || (error as any)?.message || 'Failed to fetch companies'}</span>
                  </td>
                </tr>
              ) : (!data || !data.data || data.data.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <span className="font-bold text-slate-700 text-lg block">No companies found</span>
                    <span className="text-sm text-slate-400">Companies assigned to branches will appear here.</span>
                  </td>
                </tr>
              ) : (
                data?.data?.map((company: any) => {
                  const hr = company.hr_contacts?.[0]; // Get primary HR if exists
                  
                  return (
                    <tr key={company._id} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-base">{company.companyName}</span>
                          {company.is_verified_by_admin ? (
                            <span title="Verified Master Company" className="flex items-center">
                              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            </span>
                          ) : ((company as any).primary_contact_verified || (company.additionalContacts && company.additionalContacts.some((c: any) => c.isVerified))) ? (
                            <span title="Contact Verified" className="flex items-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{company.academic_year || 'Current Year'}</span>
                          {company.emailDeliveryStatus === 'sent' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> Brochure Sent
                            </span>
                          )}
                          {company.emailDeliveryStatus === 'failed' && (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md cursor-help"
                              title={company.emailFailureReason || 'Failed to send'}
                            >
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${company.assignedBranch === 'Pending Assignment' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                          {company.assignedBranch}
                        </span>
                        {company.contactOwner && company.contactOwner !== 'Unknown' ? (
                          <p className="text-xs text-slate-500 mt-1.5">
                            POC TPR: <span className="font-medium text-slate-700">{company.contactOwner}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1.5">
                            POC Branch: <span className="font-medium text-slate-700">
                              {company.assignedBranch === 'Pending Assignment' ? 'Pending' : company.assignedBranch}
                            </span>
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="flex flex-col gap-3">
                          {company.hr_contacts?.map((contact: any, idx: number) => (
                            <div key={`primary-${idx}`} className="flex flex-col gap-0.5 relative">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800">{contact.name || 'Unknown Name'}</span>
                                {idx === 0 && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Primary</span>}
                              </div>
                              {contact.mobile && <span className="text-xs text-slate-500">{contact.mobile}</span>}
                              {contact.email && <span className="text-xs text-slate-500 truncate" title={contact.email}>{contact.email}</span>}
                            </div>
                          ))}
                          


                          {(!company.hr_contacts?.length && !company.additionalContacts?.length) && (
                            <span className="text-xs text-slate-400 italic">No HR info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {company.is_verified_by_admin ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <ShieldCheck className="w-6 h-6 text-green-500" />
                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Verified</span>
                          </div>
                        ) : ((company as any).primary_contact_verified || (company.additionalContacts && company.additionalContacts.some((c: any) => c.isVerified))) ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Contact Verified</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedCompany(company)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group whitespace-nowrap"
                        >
                          <span className="md:hidden flex items-center gap-1">View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></span>
                          <span className="hidden md:flex items-center gap-1.5">View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && data?.pagination && data.pagination.pages > 1 && (
          <div className="p-3 md:p-4 flex items-center justify-between border-t border-slate-200 bg-slate-50">
            <span className="hidden md:inline text-sm text-slate-500">
              Showing page <span className="font-semibold text-slate-900">{data.pagination.page}</span> of <span className="font-semibold text-slate-900">{data.pagination.pages}</span> ({data.pagination.total} total)
            </span>
            <span className="md:hidden text-sm font-semibold text-slate-700 ml-1">
              {data.pagination.page} <span className="text-slate-400">...</span> {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 md:px-4 md:py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 md:hidden" />
                <span className="hidden md:inline">Previous</span>
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page === data.pagination.pages}
                className="p-2 md:px-4 md:py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5 md:hidden" />
                <span className="hidden md:inline">Next</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedCompany && (
        <BranchCompanyDetailsModal 
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          company={selectedCompany}
          onAssignComplete={() => {
            setSelectedCompany(null);
            queryClient.invalidateQueries({ queryKey: ['companies-branch-overview'] });
          }}
        />
      )}

      {showAddModal && (
        <GlobalManualCompanyModal
          mode="current"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['companies-branch-overview'] });
          }}
        />
      )}
    </div>
  );
}
