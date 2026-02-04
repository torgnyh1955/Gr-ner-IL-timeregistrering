
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserInfo, TimeEntry, WEEKDAYS, MONTHS } from '../types';

const LOGO_URL = "https://cdn-bloc.no/background/200000195/9005/2025/10/2/gruner_rgb_u2net.png?maxwidth=600&height=184&quality=90&scale=both";

interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
}

const getBase64ImageFromURL = (url: string): Promise<ImageInfo> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve({ dataUrl: dataURL, width: img.width, height: img.height });
    };
    img.onerror = error => reject(error);
    img.src = url;
  });
};

/**
 * Genererer et standardisert filnavn
 */
const getFileName = (userInfo: UserInfo, month: number, year: number, ext: string) => {
  const monthNum = (month + 1).toString().padStart(2, '0');
  const monthName = MONTHS[month];
  const safeName = userInfo.name.trim().replace(/\s+/g, '_').replace(/[^a-z0-9_æøåÆØÅ]/gi, '');
  return `Timeregistrering_${year}_${monthNum}_${monthName}_${safeName}.${ext}`;
};

export const exportToExcel = (userInfo: UserInfo, month: number, year: number, entries: TimeEntry[]) => {
  const activeEntries = entries.filter(entry => entry.hours > 0);
  
  const data = activeEntries.map(entry => {
    const day = entry.date.getDay();
    const isWeekend = day === 0 || day === 6;
    const rate = isWeekend ? (userInfo.weekendRate || userInfo.hourlyRate) : userInfo.hourlyRate;
    const amount = entry.hours * rate;

    return {
      'Dato': entry.date.toLocaleDateString('nb-NO'),
      'Ukedag': WEEKDAYS[day],
      'Timer/Økt': entry.hours.toLocaleString('nb-NO'),
      'Beskrivelse': entry.description,
      'Beløp': amount.toLocaleString('nb-NO', { minimumFractionDigits: 2 }) + ' kr'
    };
  });

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalAmount = entries.reduce((sum, entry) => {
    const day = entry.date.getDay();
    const isWeekend = day === 0 || day === 6;
    const rate = isWeekend ? (userInfo.weekendRate || userInfo.hourlyRate) : userInfo.hourlyRate;
    return sum + (entry.hours * rate);
  }, 0);

  const wb = XLSX.utils.book_new();
  const finalWs = XLSX.utils.aoa_to_sheet([
    ['GRÜNER IDRETTSLAG - TIMEREGISTRERING'],
    [`Periode: ${MONTHS[month]} ${year}`],
    [''],
    ['NAVN:', userInfo.name],
    ['ANSATTNR:', userInfo.employeeId],
    ['KONTONUMMER:', userInfo.accountNumber],
    ['AVDELING:', userInfo.department],
    ['LØNN TIMER/ØKT:', userInfo.hourlyRate.toLocaleString('nb-NO') + ' kr'],
    ['LØNN HELG:', (userInfo.weekendRate || userInfo.hourlyRate).toLocaleString('nb-NO') + ' kr'],
    [''],
    ['Dato', 'Ukedag', 'Timer/Økt', 'Kommentar', 'Beløp'],
    ...data.map(d => [d.Dato, d.Ukedag, d['Timer/Økt'], d.Beskrivelse, d.Beløp]),
    [''],
    ['TOTALTIMER', '', totalHours.toLocaleString('nb-NO'), '', ''],
    ['TOTALBELØP', '', '', '', totalAmount.toLocaleString('nb-NO', { minimumFractionDigits: 2 }) + ' kr']
  ]);

  XLSX.utils.book_append_sheet(wb, finalWs, 'Timer');
  XLSX.writeFile(wb, getFileName(userInfo, month, year, 'xlsx'));
};

export const generatePDF = async (userInfo: UserInfo, month: number, year: number, entries: TimeEntry[]) => {
  const doc = new jsPDF();
  const title = `Timeregistrering`;
  const org = `Grüner Idrettslag`;
  const period = `${MONTHS[month]} ${year}`;

  doc.setFillColor(67, 34, 113);
  doc.rect(0, 0, 210, 40, 'F');

  try {
    const logoInfo = await getBase64ImageFromURL(LOGO_URL);
    const logoW = 45;
    const logoH = (logoW * logoInfo.height) / logoInfo.width;
    
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(155, 8, logoW + 10, logoH + 10, 2, 2, 'F');
    doc.addImage(logoInfo.dataUrl, 'PNG', 160, 13, logoW, logoH);
  } catch (e) {
    console.error("Kunne ikke laste logo til PDF", e);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(org, 15, 18);
  doc.setFontSize(12);
  doc.text(title, 15, 26);
  doc.setFontSize(14);
  doc.text(period, 15, 34);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  let y = 50;
  doc.text(`Navn: ${userInfo.name}`, 15, y);
  doc.text(`Ansattnummer: ${userInfo.employeeId}`, 15, y + 6);
  doc.text(`Kontonummer: ${userInfo.accountNumber}`, 15, y + 12);
  doc.text(`Epost: ${userInfo.email}`, 15, y + 18);
  doc.text(`Telefon: ${userInfo.phone}`, 15, y + 24);
  
  doc.text(`Avdeling: ${userInfo.department}`, 110, y);
  doc.text(`Lønn timer/økt: ${userInfo.hourlyRate.toLocaleString('nb-NO')} kr`, 110, y + 6);
  doc.text(`Lønn helg: ${(userInfo.weekendRate || userInfo.hourlyRate).toLocaleString('nb-NO')} kr`, 110, y + 12);

  const activeEntries = entries.filter(entry => entry.hours > 0);
  const tableData = activeEntries.map(entry => {
    const dayNum = entry.date.getDay();
    const isWeekend = dayNum === 0 || dayNum === 6;
    const rate = isWeekend ? (userInfo.weekendRate || userInfo.hourlyRate) : userInfo.hourlyRate;
    const amount = entry.hours * rate;

    return [
      entry.date.toLocaleDateString('nb-NO'),
      WEEKDAYS[dayNum],
      entry.hours.toLocaleString('nb-NO'),
      entry.description || '',
      amount.toLocaleString('nb-NO', { minimumFractionDigits: 2 }) + ' kr'
    ];
  });

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalAmount = entries.reduce((sum, entry) => {
    const day = entry.date.getDay();
    const isWeekend = day === 0 || day === 6;
    const rate = isWeekend ? (userInfo.weekendRate || userInfo.hourlyRate) : userInfo.hourlyRate;
    return sum + (entry.hours * rate);
  }, 0);

  autoTable(doc, {
    startY: 85,
    head: [['Dato', 'Ukedag', 'Timer/Økt', 'Beskrivelse', 'Beløp']],
    body: tableData,
    foot: [
      ['', 'TOTALTIMER', totalHours.toLocaleString('nb-NO'), '', ''],
      ['', 'TOTALBELØP', '', '', totalAmount.toLocaleString('nb-NO', { minimumFractionDigits: 2 }) + ' kr']
    ],
    theme: 'striped',
    headStyles: { fillColor: [67, 34, 113], textColor: [255, 255, 255] },
    footStyles: { fillColor: [67, 34, 113], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right' }
    },
    margin: { bottom: 20 },
    didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text("Signatur: ___________________________", 15, doc.internal.pageSize.height - 10);
    }
  });

  return doc;
};

export const downloadPDF = async (userInfo: UserInfo, month: number, year: number, entries: TimeEntry[]) => {
  const doc = await generatePDF(userInfo, month, year, entries);
  const fileName = getFileName(userInfo, month, year, 'pdf');
  doc.save(fileName);
};

export const sendEmail = async (type: 'excel' | 'pdf', userInfo: UserInfo, month: number, year: number, entries: TimeEntry[]) => {
  // Trigger nedlasting først
  if (type === 'excel') {
    exportToExcel(userInfo, month, year, entries);
  } else {
    await downloadPDF(userInfo, month, year, entries);
  }

  // Vent litt (500ms) for å sikre at nettleseren har trigget fil-lagringen før vi endrer location.href
  await new Promise(resolve => setTimeout(resolve, 500));

  const recipient = type === 'excel' ? 'torgny@gruner.no' : 'gruneril@ebilag.com';
  const subject = `Timeregistrering ${MONTHS[month]} ${year} - ${userInfo.name}`;
  const total = entries.reduce((s, e) => s + e.hours, 0);
  const amount = entries.reduce((sum, entry) => {
    const day = entry.date.getDay();
    const isWeekend = day === 0 || day === 6;
    const rate = isWeekend ? (userInfo.weekendRate || userInfo.hourlyRate) : userInfo.hourlyRate;
    return sum + (entry.hours * rate);
  }, 0);
  
  const body = `Hei,\n\nTimeregistrering for ${userInfo.name} (${MONTHS[month]} ${year}) er nå generert.\n\nVIKTIG: Filen ble nettopp lastet ned til din maskin. Vennligst LEGG VED filen i denne e-posten før du sender den.\n\nOppsummering:\nTotal timer: ${total.toLocaleString('nb-NO')}\nLønn timer/økt: ${userInfo.hourlyRate.toLocaleString('nb-NO')} kr\nLønn helg: ${(userInfo.weekendRate || userInfo.hourlyRate).toLocaleString('nb-NO')} kr\nTotalbeløp: ${amount.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr\nAvdeling: ${userInfo.department}\nKontonummer: ${userInfo.accountNumber}\n\nMed vennlig hilsen,\n${userInfo.name}`;

  window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
