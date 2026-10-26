import { request } from './client.js';

export const getDashboard = () => request('breaks/');
export const startBreak = (label) => request('breaks/', { method: 'POST', body: { label } });
export const finishBreak = () => request('breaks/return/', { method: 'POST' });
export const markDonated = (weekStart) => request('donations/', { method: 'POST', body: { weekStart } });
export const markAttendance = (reason = '') => request('attendance/', { method: 'POST', body: { reason } });
export const recordBreakReason = (reason) => request('breaks/reason/', { method: 'POST', body: { reason } });
export const startOffStudy = () => request('off-study/', { method: 'POST' });
export const finishOffStudy = () => request('off-study/return/', { method: 'POST' });
export const getReport = (scope, anchor) => request(`reports/?scope=${encodeURIComponent(scope)}&anchor=${encodeURIComponent(anchor)}`);
