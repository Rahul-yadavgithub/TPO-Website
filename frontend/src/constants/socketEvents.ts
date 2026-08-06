export const SOCKET_EVENTS = {
  COMPANY_UPDATED: 'company.updated',
  COMPANY_CREATED: 'company.created',
  CONTACT_LOGGED: 'contact.logged',
  BROCHURE_SENT: 'brochure.sent',
  REQUEST_APPROVED: 'request.approved',
  REQUEST_REJECTED: 'request.rejected',
  BULK_COMPANIES_UPDATED: 'companies.bulkUpdated',
  DASHBOARD_SUMMARY_UPDATED: 'dashboard.summary.updated'
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
