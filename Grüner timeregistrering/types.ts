
export enum Department {
  TURN = 'Turn',
  FOTBALL = 'Fotball',
  HANDBALL = 'Håndball',
  INNEBANDY = 'Innebandy',
  ISHOCKEY = 'Ishockey',
  KLUBB = 'Klubb'
}

export enum ActivityType {
  TRENING = 'Trening',
  HALLVAKT = 'Hallvakt',
  MOTE = 'Møte',
  ANNET = 'Annet'
}

export interface UserInfo {
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  department: Department | '';
  hourlyRate: number;
  weekendRate: number;
  accountNumber: string;
}

export interface TimeEntry {
  date: Date;
  hours: number;
  description: string;
}

export const MONTHS = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
];

export const YEARS = [2026, 2027, 2028, 2029];

export const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
