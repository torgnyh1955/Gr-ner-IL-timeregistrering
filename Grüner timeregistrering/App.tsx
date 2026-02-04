import React, { useState, useEffect, useMemo } from 'react';
import { UserInfo, Department, ActivityType, MONTHS, YEARS, TimeEntry, WEEKDAYS } from './types';
import { exportToExcel, downloadPDF, sendEmail } from './services/exportService';
import { Calendar, User, Phone, Mail, Hash, Briefcase, Download, Send, Clock, Info, Banknote, CreditCard } from 'lucide-react';

const initialUserInfo: UserInfo = {
  name: '',
  employeeId: '',
  email: '',
  phone: '',
  department: '',
  hourlyRate: 0,
  weekendRate: 0,
  accountNumber: ''
};

const App: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [resetKey, setResetKey] = useState(0); 
  const [showMailTip, setShowMailTip] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [userInfo, setUserInfo] = useState<UserInfo>({ ...initialUserInfo });
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  // Initialiser eller nullstill rader når måned, år eller reset-trigger endres
  useEffect(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const newEntries: TimeEntry[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      newEntries.push({
        date: new Date(selectedYear, selectedMonth, d),
        hours: 0,
        description: ''
      });
    }
    setTimeEntries(newEntries);
  }, [selectedMonth, selectedYear, resetKey]);

  const totalHours = useMemo(() => {
    return timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  }, [timeEntries]);

  const totalPay = useMemo(() => {
    return timeEntries.reduce((sum, entry) => {
      const day = entry.date.getDay();
      const isWeekend = day === 0 || day === 6;
      const rate = isWeekend ? (userInfo.weekendRate || userInfo.hourlyRate) : userInfo.hourlyRate;
      return sum + (entry.hours * rate);
    }, 0);
  }, [timeEntries, userInfo.hourlyRate, userInfo.weekendRate]);

  const handleHourChange = (index: number, val: string) => {
    const normalizedVal = val.replace(',', '.');
    const hours = normalizedVal === '' ? 0 : parseFloat(normalizedVal);
    const updated = [...timeEntries];
    updated[index] = { ...updated[index], hours: isNaN(hours) ? 0 : hours };
    setTimeEntries(updated);
  };

  const handleDescriptionChange = (index: number, val: string) => {
    const updated = [...timeEntries];
    updated[index] = { ...updated[index], description: val };
    setTimeEntries(updated);
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 4) {
      formatted = raw.slice(0, 4) + ' ' + raw.slice(4);
    }
    if (raw.length > 6) {
      formatted = raw.slice(0, 4) + ' ' + raw.slice(4, 6) + ' ' + raw.slice(6);
    }
    setUserInfo({ ...userInfo, accountNumber: formatted });
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    await downloadPDF(userInfo, selectedMonth, selectedYear, timeEntries);
    setIsExporting(false);
  };

  const handleSendEmail = async (type: 'excel' | 'pdf') => {
    setIsExporting(true);
    await sendEmail(type, userInfo, selectedMonth, selectedYear, timeEntries);
    setIsExporting(false);
    if (type === 'pdf') {
      setShowMailTip(true);
      setTimeout(() => setShowMailTip(false), 8000);
    }
  };

  const isAccountNumberValid = userInfo.accountNumber.replace(/\s/g, '').length === 11;
  const isFormValid = userInfo.name !== '' && userInfo.email !== '' && userInfo.employeeId !== '' && userInfo.department !== '' && userInfo.hourlyRate > 0 && isAccountNumberValid;
  const buttonBaseClass = "flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full h-[58px] text-sm";

  const formatHours = (h: number) => h.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const formatCurrency = (val: number) => val.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';

  const hourOptions = useMemo(() => {
    const options = [];
    for (let i = 0.5; i <= 12; i += 0.5) {
      options.push(i.toLocaleString('nb-NO', { minimumFractionDigits: 1 }));
    }
    return options;
  }, []);

  return (
    <div className="min-h-screen pb-12" key={`root-reset-${resetKey}`}>
      <datalist id="hour-options">
        {hourOptions.map(opt => (
          <option key={opt} value={opt} />
        ))}
      </datalist>

      {/* Header */}
      <header className="bg-[#432271] text-white py-8 px-6 shadow-lg mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-white p-3 rounded-xl shadow-inner flex items-center justify-center min-w-[120px]">
              <img 
                src="https://cdn-bloc.no/background/200000195/9005/2025/10/2/gruner_rgb_u2net.png?maxwidth=600&height=184&quality=90&scale=both" 
                alt="Grüner IL Logo" 
                className="h-12 md:h-16 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/en/2/2c/GrunerILlogo.png";
                }}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Timeregistrering</h1>
              <p className="text-violet-200 text-lg font-medium">Grüner idrettslag</p>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            <div className="flex flex-col bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
              <label className="text-[10px] uppercase font-bold text-violet-200 mb-1">Periode</label>
              <div className="flex gap-2">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-white text-gray-900 px-2 py-1 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-400 outline-none font-medium cursor-pointer"
                >
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-white text-gray-900 px-2 py-1 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-400 outline-none font-medium cursor-pointer"
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex flex-col bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
                <label className="text-[10px] uppercase font-bold text-violet-200 mb-1">Lønn timer/økt</label>
                <input 
                  type="number"
                  placeholder="0"
                  className="bg-white text-gray-900 px-2 py-1 rounded-lg border-none text-sm w-28 focus:ring-2 focus:ring-violet-400 outline-none font-medium"
                  value={userInfo.hourlyRate === 0 ? '' : userInfo.hourlyRate}
                  onChange={e => setUserInfo({...userInfo, hourlyRate: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="flex flex-col bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
                <label className="text-[10px] uppercase font-bold text-violet-200 mb-1">Lønn helg</label>
                <input 
                  type="number"
                  placeholder="Valgfritt"
                  className="bg-white text-gray-900 px-2 py-1 rounded-lg border-none text-sm w-28 focus:ring-2 focus:ring-violet-400 outline-none font-medium"
                  value={userInfo.weekendRate === 0 ? '' : userInfo.weekendRate}
                  onChange={e => setUserInfo({...userInfo, weekendRate: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20 min-w-[100px]">
                <label className="text-[10px] uppercase font-bold text-violet-200 mb-1">Totaltimer</label>
                <div className="flex items-center gap-1.5 py-0.5">
                  <Clock className="w-3.5 h-3.5 text-violet-200" />
                  <span className="text-lg font-bold tracking-tight">{formatHours(totalHours)}</span>
                </div>
              </div>

              <div className="flex flex-col bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20 min-w-[120px]">
                <label className="text-[10px] uppercase font-bold text-violet-200 mb-1">Total lønn</label>
                <div className="flex items-center gap-1.5 py-0.5">
                  <Banknote className="w-3.5 h-3.5 text-violet-200" />
                  <span className="text-lg font-bold tracking-tight">{totalPay.toLocaleString('nb-NO')} kr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 space-y-8">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#432271]" />
              <h2 className="font-semibold text-gray-800 uppercase tracking-wide text-sm">Ansattinformasjon</h2>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block">Navn</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Ola Nordmann"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#432271] focus:ring-1 focus:ring-[#432271] outline-none transition"
                  value={userInfo.name}
                  onChange={e => setUserInfo({...userInfo, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block">Ansattnummer</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Eks: 12345"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#432271] focus:ring-1 focus:ring-[#432271] outline-none transition"
                  value={userInfo.employeeId}
                  onChange={e => setUserInfo({...userInfo, employeeId: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block">E-post</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email"
                  placeholder="ola@eksempel.no"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#432271] focus:ring-1 focus:ring-[#432271] outline-none transition"
                  value={userInfo.email}
                  onChange={e => setUserInfo({...userInfo, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block">Telefonnummer</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="tel"
                  placeholder="Eks: 987 65 432"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#432271] focus:ring-1 focus:ring-[#432271] outline-none transition"
                  value={userInfo.phone}
                  onChange={e => setUserInfo({...userInfo, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block">Idrettsgren / Avdeling</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#432271] focus:ring-1 focus:ring-[#432271] outline-none transition appearance-none bg-white cursor-pointer"
                  value={userInfo.department}
                  onChange={e => setUserInfo({...userInfo, department: e.target.value as Department})}
                >
                  <option value="" disabled>Velg avdeling...</option>
                  {Object.values(Department).map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block">Kontonummer</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="1234 56 78901"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-1 outline-none transition ${userInfo.accountNumber && !isAccountNumberValid ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#432271] focus:ring-[#432271]'}`}
                  value={userInfo.accountNumber}
                  onChange={handleAccountNumberChange}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#432271]" />
              <h2 className="font-semibold text-gray-800 uppercase tracking-wide text-sm">Timeliste - {MONTHS[selectedMonth]}</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-left text-xs uppercase font-bold text-gray-500 tracking-wider">
                  <th className="px-6 py-4 w-28 border-b">Dato</th>
                  <th className="px-6 py-4 w-28 border-b">Ukedag</th>
                  <th className="px-6 py-4 w-32 border-b text-center">Timer/Økt</th>
                  <th className="px-6 py-4 border-b">Aktivitet</th>
                  <th className="px-6 py-4 w-32 border-b text-right">Beløp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timeEntries.map((entry, index) => {
                  const dayNum = entry.date.getDay();
                  const dayName = WEEKDAYS[dayNum];
                  const isWeekend = dayNum === 0 || dayNum === 6;
                  const currentRate = isWeekend ? (userInfo.weekendRate || userInfo.hourlyRate) : userInfo.hourlyRate;
                  const rowAmount = entry.hours * currentRate;
                  
                  return (
                    <tr key={`${index}`} className={`hover:bg-gray-50 transition ${isWeekend ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-6 py-3 text-sm font-medium text-gray-700">
                        {entry.date.getDate()}. {MONTHS[selectedMonth].substring(0, 3)}
                      </td>
                      <td className={`px-6 py-3 text-sm ${isWeekend ? 'text-red-500 font-semibold' : 'text-gray-500 font-medium'}`}>
                        {dayName}
                      </td>
                      <td className="px-6 py-2">
                        <input 
                          list="hour-options"
                          type="text"
                          inputMode="decimal"
                          className="w-24 mx-auto block px-3 py-1.5 rounded-md border border-gray-200 text-center focus:ring-1 focus:ring-violet-400 outline-none hover:border-gray-300 transition"
                          value={entry.hours === 0 ? '' : entry.hours.toString().replace('.', ',')}
                          placeholder="0,0"
                          onChange={e => handleHourChange(index, e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-2">
                        <select 
                          className="w-full px-3 py-1.5 rounded-md border border-transparent hover:border-gray-200 focus:border-gray-200 focus:bg-white focus:ring-1 focus:ring-violet-400 outline-none transition bg-transparent text-sm appearance-none cursor-pointer"
                          value={entry.description}
                          onChange={e => handleDescriptionChange(index, e.target.value)}
                        >
                          <option value="">Velg aktivitet...</option>
                          {Object.values(ActivityType).map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        {entry.hours > 0 ? formatCurrency(rowAmount) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Actions Section */}
        <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm mb-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#432271]"></div>
          
          <div className="flex flex-col gap-8">
            <div className="max-w-3xl">
              <h3 className="font-bold text-[#432271] text-xl mb-2 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Ferdig med utfylling?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Vennligst kontroller at alle felter er utfylt korrekt. Du kan laste ned filene til din maskin, eller sende PDF-en direkte til administrasjonen via e-post.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              <button 
                onClick={() => exportToExcel(userInfo, selectedMonth, selectedYear, timeEntries)}
                disabled={!isFormValid || isExporting}
                className={`${buttonBaseClass} bg-white text-[#432271] border-2 border-violet-100 hover:bg-violet-50 hover:border-[#432271]`}
              >
                <Download className="w-5 h-5" /> Last ned Excel
              </button>

              <button 
                onClick={handleDownloadPDF}
                disabled={!isFormValid || isExporting}
                className={`${buttonBaseClass} bg-[#432271] text-white hover:bg-[#341b58]`}
              >
                <Download className="w-5 h-5" /> {isExporting ? 'Genererer...' : 'Last ned PDF'}
              </button>

              <button 
                onClick={() => handleSendEmail('pdf')}
                disabled={!isFormValid || isExporting}
                className={`${buttonBaseClass} bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200`}
              >
                <Send className="w-5 h-5" /> {isExporting ? 'Lagrer fil...' : 'Send til ebilag'}
              </button>
            </div>
          </div>

          {showMailTip && (
            <div className="absolute top-4 right-8 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 z-50">
              <Info className="w-5 h-5" />
              <span className="text-sm font-bold">PDF er lagret! Husk å legge den ved i e-posten.</span>
            </div>
          )}
        </section>
      </main>

      {!isFormValid && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-800 px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-pulse z-50">
          <div className="bg-amber-100 p-1 rounded-full">
            <Info className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold">Fyll ut ansattinfo (inkl. 11 siffer kontonr) og lønnssats</span>
        </div>
      )}
    </div>
  );
};

export default App;
