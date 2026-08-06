import { getIO } from './socketServer';
import { SOCKET_EVENTS } from './eventConstants';
import { ROOMS } from './socketRooms';

interface EventPayload {
  version: number;
  updatedAt: Date;
  updatedBy?: string;
  [key: string]: any;
}

export const SocketEventPublisher = {
  
  publishCompanyCreated: (company: any, user: any) => {
    try {
      const payload: EventPayload = {
        type: SOCKET_EVENTS.COMPANY_CREATED,
        companyId: company._id,
        status: company.contact_outcome,
        branch: company.assignedBranch,
        branchId: company.assignedBranchId?.toString(),
        version: Date.now(),
        updatedAt: new Date(),
        updatedBy: user?.id
      };
      
      const io = getIO();
      // Notify admins
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.COMPANY_CREATED, payload);
      
      // Notify specific branch if assigned
      if (company.assignedBranchId) {
        io.to(ROOMS.BRANCH(company.assignedBranchId.toString())).emit(SOCKET_EVENTS.COMPANY_CREATED, payload);
      }
      
      // Notify dashboard listeners
      io.emit(SOCKET_EVENTS.DASHBOARD_SUMMARY_UPDATED, { version: Date.now(), updatedAt: new Date() });
    } catch (error) {
      console.error('Failed to publish socket event:', error);
    }
  },

  publishCompanyUpdated: (company: any, user: any) => {
    try {
      const payload: EventPayload = {
        type: SOCKET_EVENTS.COMPANY_UPDATED,
        companyId: company._id,
        status: company.contact_outcome,
        branch: company.assignedBranch,
        branchId: company.assignedBranchId?.toString(),
        version: Date.now(),
        updatedAt: new Date(),
        updatedBy: user?.id
      };

      const io = getIO();
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.COMPANY_UPDATED, payload);
      if (company.assignedBranchId) {
        io.to(ROOMS.BRANCH(company.assignedBranchId.toString())).emit(SOCKET_EVENTS.COMPANY_UPDATED, payload);
      }
      io.emit(SOCKET_EVENTS.DASHBOARD_SUMMARY_UPDATED, { version: Date.now(), updatedAt: new Date() });
    } catch (error) {
      console.error('Failed to publish socket event:', error);
    }
  },

  publishBrochureSent: (company: any, user: any) => {
    try {
      const payload: EventPayload = {
        type: SOCKET_EVENTS.BROCHURE_SENT,
        companyId: company._id,
        status: 'sent',
        branch: company.assignedBranch,
        branchId: company.assignedBranchId?.toString(),
        version: Date.now(),
        updatedAt: new Date(),
        updatedBy: user?.id
      };

      const io = getIO();
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.BROCHURE_SENT, payload);
      if (company.assignedBranchId) {
        io.to(ROOMS.BRANCH(company.assignedBranchId.toString())).emit(SOCKET_EVENTS.BROCHURE_SENT, payload);
      }
      io.emit(SOCKET_EVENTS.DASHBOARD_SUMMARY_UPDATED, { version: Date.now(), updatedAt: new Date() });
    } catch (error) {
      console.error('Failed to publish socket event:', error);
    }
  },

  publishBulkUpdate: (actionType: string, user: any) => {
    try {
      const payload: EventPayload = {
        type: SOCKET_EVENTS.BULK_COMPANIES_UPDATED,
        action: actionType,
        version: Date.now(),
        updatedAt: new Date(),
        updatedBy: user?.id
      };

      const io = getIO();
      // Bulk updates generally affect admins and dashboards globally
      io.emit(SOCKET_EVENTS.BULK_COMPANIES_UPDATED, payload);
      io.emit(SOCKET_EVENTS.DASHBOARD_SUMMARY_UPDATED, { version: Date.now(), updatedAt: new Date() });
    } catch (error) {
      console.error('Failed to publish socket event:', error);
    }
  }
};
