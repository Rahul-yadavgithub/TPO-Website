import { AuthenticatedSocket } from './socketAuth';

export const ROOMS = {
  ADMIN: 'admin',
  BRANCH: (branchId: string) => `branch:${branchId}`,
  COMPANY: (companyId: string) => `company:${companyId}`
};

export const assignRooms = (socket: AuthenticatedSocket) => {
  const user = socket.user;
  if (!user) return;

  // Admins and Communications TPR join the admin room
  if (user.role === 'admin' || user.role === 'communication_tpr') {
    socket.join(ROOMS.ADMIN);
  }

  // TPRs join their specific branch room
  if (user.role === 'tpr' && user.branch_id) {
    socket.join(ROOMS.BRANCH(user.branch_id.toString()));
  }

  // In the future, clients can request to join specific COMPANY rooms if they are viewing that company.
};
