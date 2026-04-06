'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { markAttendance, getAttendanceByDate, searchMembers, markManualAttendance } from '@/lib/api';

export default function AttendancePage() {
  useAuth();

  const router = useRouter();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [markingLoading, setMarkingLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPastDateModal, setShowPastDateModal] = useState(false);

  useEffect(() => {
    fetchAttendanceByDate();
  }, [selectedDate]);

  const fetchAttendanceByDate = async () => {
    try {
      setLoading(true);
      const res = await getAttendanceByDate(selectedDate);
      setAttendanceList(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setAttendanceList([]);
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    const { Html5QrcodeScanner } = await import('html5-qrcode');

    setScanning(true);
    setResult(null);

    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        scanner.clear();
        setScanning(false);

        try {
          const res = await markAttendance({ memberId: decodedText });
          setResult({
            success: true,
            message: res.data.message,
          });
          fetchAttendanceByDate();
        } catch (err) {
          setResult({
            success: false,
            message: err.response?.data?.message || 'Attendance failed',
          });
        }
      },
      (error) => {
        // Scanning errors ignore karo — continuously scan karta rahega
      }
    );
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const res = await searchMembers(query);
      setSearchResults(res.data.data);
      setShowDropdown(true);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleSelectMember = async (member) => {
    setMarkingLoading(true);
    try {
      const res = await markManualAttendance({ 
        memberId: member._id, 
        status: 'present',
        date: selectedDate
      });
      setResult({
        success: true,
        message: res.data.message,
        memberName: res.data.data.memberName,
        isUpdated: res.data.isUpdated || false
      });
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      setShowPastDateModal(false);
      fetchAttendanceByDate();
      setSelectedDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.message || 'Attendance failed',
        isDuplicate: err.response?.status === 409
      });
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleSelectMemberAbsent = async (member) => {
    setMarkingLoading(true);
    try {
      const res = await markManualAttendance({ 
        memberId: member._id, 
        status: 'absent',
        date: selectedDate
      });
      setResult({
        success: true,
        message: res.data.message,
        memberName: res.data.data.memberName,
        isUpdated: res.data.isUpdated || false
      });
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      setShowPastDateModal(false);
      fetchAttendanceByDate();
      setSelectedDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.message || 'Failed to mark absent',
        isDuplicate: err.response?.status === 409
      });
    } finally {
      setMarkingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-heavy shadow-kinetic flex justify-between items-center px-6 h-16">
        <span 
          className="text-2xl font-black italic tracking-tighter text-primary cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          GymPro
        </span>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-on-surface-variant hover:text-primary text-sm font-inter-tight font-bold uppercase tracking-widest"
        >
          ← Dashboard
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 md:px-10 max-w-5xl mx-auto">

        <label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">Check-in Hub</label>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-on-surface mb-8">Mark <span className="text-primary">Attendance</span></h1>

        {/* Date selector */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-4 mb-6 flex items-center gap-3 border border-outline-variant/10">
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
          />
          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <span className="text-xs bg-secondary/20 text-secondary px-3 py-1.5 rounded-kinetic font-bold tracking-widest uppercase" suppressHydrationWarning>
              {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Manual Attendance Search */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-6 mb-6 border border-outline-variant/10">
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-3">Add Member</h3>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search member name..."
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
            
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-b from-surface-container-high to-surface-container border-2 border-primary/30 rounded-kinetic shadow-2xl shadow-primary/20 z-50 max-h-80 overflow-y-auto backdrop-blur-heavy">
                {searchResults.map((member, idx) => (
                  <div
                    key={member._id}
                    className="px-5 py-4 border-b border-outline-variant/20 last:border-0 bg-surface-container-high/70 backdrop-blur-sm hover:bg-surface-container-high/90 hover:shadow-inner transition-all duration-200 group rounded-lg mx-2 my-1"
                  >
                    {/* Member Info */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/10">
                      <div className="flex-1">
                        <p className="text-sm font-black text-primary mb-1 group-hover:text-primary-light transition">{idx + 1}. {member.name}</p>
                        <p className="text-xs text-on-surface-variant font-medium">📱 {member.phone}</p>
                      </div>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap ml-2 shadow-md ${
                        member.isActive 
                          ? 'bg-primary text-black' 
                          : 'bg-secondary/20 text-secondary'
                      }`}>
                        {member.isActive ? '✓ Active' : '✗ Inactive'}
                      </span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleSelectMember(member)}
                        disabled={markingLoading}
                        className="flex-1 text-xs bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary-light hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-black py-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-lg hover:shadow-primary/50 transform group-hover:-translate-y-0.5"
                      >
                        ✓ PRESENT
                      </button>
                      <button
                        onClick={() => handleSelectMemberAbsent(member)}
                        disabled={markingLoading}
                        className="flex-1 text-xs bg-gradient-to-r from-secondary to-orange-400 hover:from-secondary/80 hover:to-secondary hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-black font-black py-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-lg hover:shadow-secondary/50 transform group-hover:-translate-y-0.5"
                      >
                        ✗ ABSENT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {searchQuery && searchResults.length === 0 && showDropdown && (
            <p className="text-xs text-on-surface-variant mt-2">No members found</p>
          )}
        </div>

        {/* QR Scanner section */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-6 mb-6 border border-outline-variant/10">
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-3">QR Scanner</h3>

          {/* Result message */}
          {result && (
            <div className={`text-sm px-4 py-3 rounded-kinetic mb-4 font-bold uppercase tracking-wider ${
              result.success
                ? result.isUpdated
                  ? 'bg-tertiary/20 text-tertiary'
                  : 'bg-primary/20 text-primary'
                : result.isDuplicate
                ? 'bg-secondary/20 text-secondary'
                : 'bg-secondary/20 text-secondary'
            }`}>
              {result.success 
                ? result.isUpdated ? '🔄' : '✅' 
                : result.isDuplicate ? '⚠️' : '❌'} {result.message}
            </div>
          )}

          {/* QR Reader div */}
          <div id="qr-reader" className="w-full mb-4" />

          {/* Buttons */}
          {!scanning ? (
            <button
              onClick={startScanner}
              className="w-full bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold py-3 rounded-kinetic transition-all duration-200 text-sm uppercase tracking-wider font-inter-tight shadow-lg hover:shadow-primary/30"
            >
              📷 Start QR Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="w-full bg-secondary hover:bg-secondary/80 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-black font-bold py-3 rounded-kinetic transition-all duration-200 text-sm uppercase tracking-wider font-inter-tight shadow-lg hover:shadow-secondary/30"
            >
              Stop Scanner
            </button>
          )}
        </div>

        {/* Date-based attendance list */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-6 border border-outline-variant/10">
          <h3 className="text-lg font-black italic tracking-tighter text-on-surface mb-4" suppressHydrationWarning>
            {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            <span className="ml-3 text-sm font-normal text-on-surface-variant">
              ({attendanceList.length} marked)
            </span>
          </h3>

          {loading ? (
            <p className="text-on-surface-variant text-sm">Loading...</p>
          ) : attendanceList.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No attendance marked for this date</p>
          ) : (
            <div className="space-y-2">
              {attendanceList.map((record, index) => (
                <div
                  key={record._id}
                  className="flex items-center justify-between py-3 px-4 border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/50 transition rounded"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-on-surface-variant w-6">{index + 1}.</span>
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {record.member?.name}
                        </p>
                        <p className="text-xs text-on-surface-variant" suppressHydrationWarning>
                          {new Date(record.checkInTime).toLocaleTimeString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-kinetic font-bold uppercase tracking-wider ${
                      record.status === 'present'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary/20 text-secondary'
                    }`}>
                      {record.status}
                    </span>
                    <button
                      onClick={() => handleSelectMember({ _id: record.member._id, name: record.member.name })}
                      disabled={markingLoading || record.status === 'present'}
                      className={`text-xs px-3 py-1 rounded-kinetic font-bold transition uppercase tracking-wider ${
                        record.status === 'present'
                          ? 'bg-primary/20 text-primary opacity-50 cursor-not-allowed'
                          : 'bg-primary/20 hover:bg-primary/30 text-primary'
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleSelectMemberAbsent({ _id: record.member._id, name: record.member.name })}
                      disabled={markingLoading || record.status === 'absent'}
                      className={`text-xs px-3 py-1 rounded-kinetic font-bold transition uppercase tracking-wider ${
                        record.status === 'absent'
                          ? 'bg-secondary/20 text-secondary opacity-50 cursor-not-allowed'
                          : 'bg-secondary/20 hover:bg-secondary/30 text-secondary'
                      }`}
                    >
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}