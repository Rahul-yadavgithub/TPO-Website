import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Company from '../models/Company';
import Branch from '../models/Branch';
import HrContact from '../models/HrContact';
import BranchApiKey from '../models/BranchApiKey';
import { ApiKeyRotatorService } from '../services/api-key-rotator.service';
import { EnrichmentService } from '../services/enrichment.service';

export const hrValidationController = {
  
  findHrContact: async (req: Request, res: Response) => {
    try {
      const { company_id } = req.params;

      const company = await Company.findById(company_id);
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }

      if (!company.assignedBranch) {
        return res.status(400).json({ success: false, message: 'Company is not assigned to a branch' });
      }

      // Resolve branch ID
      const branch = await Branch.findOne({ name: company.assignedBranch });
      if (!branch) {
        return res.status(404).json({ success: false, message: 'Assigned branch not found' });
      }

      const branchIdStr = branch._id.toString();

      // Enforce zero keys check (Requirement #2)
      const activeKeysCount = await BranchApiKey.countDocuments({ branchId: branchIdStr, status: 'active' });
      if (activeKeysCount === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No active API keys configured. Please add an Apollo, Hunter, Snov, or Lusha key before validating contacts.',
          errorType: 'NO_ACTIVE_KEYS'
        });
      }

      // Waterfall execution via Service with previewOnly: true
      const result = await EnrichmentService.executeFindHr(company._id.toString(), branchIdStr, company.companyName, true);

      if (result) {
        // Since previewOnly is true, result is the HRResult object
        return res.status(200).json({
          success: true,
          status: 'found_preview',
          contact: result
        });
      }

      // If we exit the loop with no contacts, queue it
      await ApiKeyRotatorService.queueRequest(branchIdStr, company._id.toString(), 'find_hr', {});

      return res.status(200).json({
        success: true,
        status: 'queued',
        message: 'No immediate result found. Request queued for background processing.'
      });

    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  commitHrContact: async (req: Request, res: Response) => {
    try {
      const { company_id } = req.params;
      const { name, email, mobile, designation, linkedin_url } = req.body;

      const company = await Company.findById(company_id);
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }

      if (company.is_verified_by_admin) {
        return res.status(403).json({ success: false, message: 'This company is verified by Admin and cannot be edited.' });
      }

      const existingContact = await HrContact.findOne({ company_id });
      let historyItem = null;

      if (existingContact && (existingContact.name || existingContact.email || existingContact.mobile || existingContact.designation)) {
        const isDifferent = (
          (existingContact.name || '').trim() !== (name || '').trim() ||
          (existingContact.email || '').trim() !== (email || '').trim() ||
          (existingContact.mobile || '').trim() !== (mobile || '').trim() ||
          (existingContact.designation || '').trim() !== (designation || '').trim() ||
          (existingContact.linkedin_url || '').trim() !== (linkedin_url || '').trim()
        );

        if (!isDifferent) {
          return res.status(200).json({
            success: true,
            message: 'No changes detected. Contact is already up to date.',
            contact: existingContact
          });
        }

        historyItem = {
          name: existingContact.name,
          email: existingContact.email,
          mobile: existingContact.mobile,
          designation: existingContact.designation,
          linkedin_url: existingContact.linkedin_url,
          replaced_at: new Date()
        };
      }

      const updateData: any = {
        name,
        email,
        mobile,
        designation,
        linkedin_url,
        is_auto_updated: true,
        auto_updated_at: new Date()
      };

      let updatedContact;
      if (existingContact) {
        if (historyItem) {
          updateData.$push = { history: historyItem };
        }
        updatedContact = await HrContact.findByIdAndUpdate(
          existingContact._id,
          updateData,
          { new: true }
        );
      } else {
        updatedContact = await HrContact.create({
          company_id: company._id,
          ...updateData
        });
      }

      company.syncStatus = 'pending';
      await company.save();

      res.status(200).json({
        success: true,
        message: 'HR Contact committed successfully',
        contact: updatedContact
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  acknowledgeHrUpdate: async (req: Request, res: Response) => {
    try {
      const { company_id } = req.params;
      const contact = await HrContact.findOne({ company_id });
      
      if (!contact) {
        return res.status(404).json({ success: false, message: 'HR Contact not found' });
      }

      contact.is_auto_updated = false;
      await contact.save();

      res.status(200).json({ success: true, message: 'Update acknowledged' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  approvePendingContact: async (req: Request, res: Response) => {
    try {
      const { company_id } = req.params;
      const existingContact = await HrContact.findOne({ company_id });
      
      if (!existingContact || !existingContact.pending_update) {
        return res.status(404).json({ success: false, message: 'No pending update found' });
      }

      const pendingData = existingContact.pending_update;

      const isDifferent = (
        (existingContact.name || '').trim() !== (pendingData.name || '').trim() ||
        (existingContact.email || '').trim() !== (pendingData.email || '').trim() ||
        (existingContact.mobile || '').trim() !== (pendingData.mobile || '').trim() ||
        (existingContact.designation || '').trim() !== (pendingData.designation || '').trim() ||
        (existingContact.linkedin_url || '').trim() !== (pendingData.linkedin_url || '').trim()
      );

      let historyItem = null;
      if (isDifferent && (existingContact.name || existingContact.email || existingContact.mobile || existingContact.designation)) {
        historyItem = {
          name: existingContact.name,
          email: existingContact.email,
          mobile: existingContact.mobile,
          designation: existingContact.designation,
          linkedin_url: existingContact.linkedin_url,
          replaced_at: new Date()
        };
      }

      const updateData: any = {
        name: pendingData.name,
        email: pendingData.email,
        mobile: pendingData.mobile,
        designation: pendingData.designation,
        linkedin_url: pendingData.linkedin_url,
        pending_update: null,
        last_check_status: 'no_changes',
        is_auto_updated: true,
        auto_updated_at: new Date()
      };

      if (historyItem) {
        updateData.$push = { history: historyItem };
      }

      const updatedContact = await HrContact.findByIdAndUpdate(
        existingContact._id,
        updateData,
        { new: true }
      );

      res.status(200).json({ success: true, contact: updatedContact });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  discardPendingContact: async (req: Request, res: Response) => {
    try {
      const { company_id } = req.params;
      
      const updatedContact = await HrContact.findOneAndUpdate(
        { company_id },
        { 
          pending_update: null,
          last_check_status: 'no_changes' 
        },
        { new: true }
      );

      res.status(200).json({ success: true, contact: updatedContact });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  verifyHrContact: async (req: Request, res: Response) => {
    try {
      const { company_id, contact_id } = req.params;
      const { is_verified, is_additional } = req.body;

      const company = await Company.findById(company_id);
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }

      if (is_additional) {
        // If we are verifying an additional contact, it gets PROMOTED to primary
        // and the old primary gets DEMOTED to additional.
        const additionalContactIndex = company.additionalContacts?.findIndex(c => (c as any)._id?.toString() === contact_id || c.hrEmail === contact_id);
        
        if (additionalContactIndex === undefined || additionalContactIndex === -1 || !company.additionalContacts) {
          return res.status(404).json({ success: false, message: 'Additional contact not found' });
        }

        const additionalContact = company.additionalContacts[additionalContactIndex];

        // 1. Demote current primary (if exists)
        const currentPrimary = await HrContact.findOne({ company_id });
        if (currentPrimary && (currentPrimary.name || currentPrimary.email || currentPrimary.mobile || currentPrimary.designation)) {
          company.additionalContacts.push({
            hrName: currentPrimary.name || '',
            hrEmail: currentPrimary.email || '',
            hrPhone: currentPrimary.mobile || '',
            sourceSheet: 'Demoted Primary',
            academicYear: company.academic_year || 'Current',
            isVerified: currentPrimary.is_verified || false,
            isFlagged: currentPrimary.is_incorrect || false,
            incorrect_marked_by: currentPrimary.incorrect_marked_by
          });
        }

        // 2. Promote additional to primary
        const updateData = {
          name: additionalContact.hrName,
          email: additionalContact.hrEmail,
          mobile: additionalContact.hrPhone,
          designation: 'HR', // Default
          is_verified: true,
          is_incorrect: false,
          incorrect_marked_by: undefined
        };

        if (currentPrimary) {
          await HrContact.findByIdAndUpdate(currentPrimary._id, updateData, { new: true });
        } else {
          await HrContact.create({ company_id: new mongoose.Types.ObjectId(company_id as string), ...updateData });
        }

        // 3. Remove the promoted contact from additionalContacts
        company.additionalContacts.splice(additionalContactIndex, 1);
        
        company.primary_contact_verified = true;
        company.syncStatus = 'pending';
        await company.save();

      } else {
        // Just toggling verify on the primary contact
        const currentPrimary = await HrContact.findOne({ company_id });
        if (!currentPrimary) {
          return res.status(404).json({ success: false, message: 'Primary contact not found' });
        }

        currentPrimary.is_verified = is_verified;
        if (!is_verified) {
           company.primary_contact_verified = false;
        } else {
           company.primary_contact_verified = true;
        }

        await currentPrimary.save();
        company.syncStatus = 'pending';
        await company.save();
      }

      res.status(200).json({ success: true, message: 'Contact verification updated successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  flagHrContact: async (req: any, res: Response) => {
    try {
      const { company_id, contact_id } = req.params;
      const { is_incorrect, is_additional } = req.body;
      const branchId = req.user?.branchId?._id || req.user?.branchId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'communication_tpr';

      const company = await Company.findById(company_id);
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }

      if (is_additional) {
        const additionalContactIndex = company.additionalContacts?.findIndex(c => (c as any)._id?.toString() === contact_id || c.hrEmail === contact_id);
        if (additionalContactIndex === undefined || additionalContactIndex === -1 || !company.additionalContacts) {
          return res.status(404).json({ success: false, message: 'Additional contact not found' });
        }
        
        const currentContact = company.additionalContacts[additionalContactIndex];

        // Authorization check if unflagging
        if (!is_incorrect && currentContact.incorrect_marked_by) {
          if (!isAdmin && currentContact.incorrect_marked_by.toString() !== branchId?.toString()) {
             return res.status(403).json({ success: false, message: 'Only the branch that marked this contact as incorrect can undo it.' });
          }
        }

        currentContact.isFlagged = is_incorrect;
        currentContact.incorrect_marked_by = is_incorrect ? branchId : null;
        
        company.syncStatus = 'pending';
        await company.save();
      } else {
        const currentPrimary = await HrContact.findOne({ company_id });
        if (!currentPrimary) {
          return res.status(404).json({ success: false, message: 'Primary contact not found' });
        }

        // Authorization check if unflagging
        if (!is_incorrect && currentPrimary.incorrect_marked_by) {
          if (!isAdmin && currentPrimary.incorrect_marked_by.toString() !== branchId?.toString()) {
             return res.status(403).json({ success: false, message: 'Only the branch that marked this contact as incorrect can undo it.' });
          }
        }

        currentPrimary.is_incorrect = is_incorrect;
        currentPrimary.incorrect_marked_by = is_incorrect ? branchId : null;
        
        // When marked incorrect, we also unset verification
        if (is_incorrect) {
          currentPrimary.is_verified = false;
          company.primary_contact_verified = false;
        }
        
        await currentPrimary.save();
        company.syncStatus = 'pending';
        await company.save();
      }

      res.status(200).json({ success: true, message: 'Contact flag updated successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteHrContact: async (req: Request, res: Response) => {
    try {
      const { company_id, contact_id } = req.params;
      const is_additional = req.query.is_additional === 'true';

      const company = await Company.findById(company_id);
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }

      if (is_additional) {
        // Delete from additional contacts
        if (company.additionalContacts) {
          company.additionalContacts = company.additionalContacts.filter(c => (c as any)._id?.toString() !== contact_id && c.hrEmail !== contact_id);
          company.syncStatus = 'pending';
          await company.save();
        }
      } else {
        // Delete primary contact
        const currentPrimary = await HrContact.findOne({ company_id });
        if (currentPrimary) {
          await HrContact.findByIdAndDelete(currentPrimary._id);
          company.primary_contact_verified = false;

          // Promote the first available additional contact if any exists
          if (company.additionalContacts && company.additionalContacts.length > 0) {
            const nextContact = company.additionalContacts[0];
            await HrContact.create({
              company_id: new mongoose.Types.ObjectId(company_id as string),
              name: nextContact.hrName,
              email: nextContact.hrEmail,
              mobile: nextContact.hrPhone,
              designation: 'Promoted HR',
              is_verified: nextContact.isVerified || false,
              is_incorrect: nextContact.isFlagged || false
            });
            company.primary_contact_verified = nextContact.isVerified || false;
            company.additionalContacts.shift(); // Remove the promoted one
          }
          
          company.syncStatus = 'pending';
          await company.save();
        }
      }

      res.status(200).json({ success: true, message: 'Contact deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

};
