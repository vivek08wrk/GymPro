'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getAttendanceByDate, searchMembers, markManualAttendance, getMembers } from '@/lib/api';

export default function AttendancePage() {
  useAuth();

  const router = useRouter();
  const [result, setResult] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [markingLoading, setMarkingLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPastDateModal, setShowPastDateModal] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);
  const [attackMode, setAttackMode] = useState('realtime'); // realtime | batch
  const [markedMembers, setMarkedMembers] = useState(new Set()); // Track marked members to prevent duplicates
  const searchTimeoutRef = useRef(null);
  const resultTimeoutRef = useRef(null);

  // ⏱️ Auto-dismiss result after 3 seconds
  useEffect(() => {
    if (result) {
      resultTimeoutRef.current = setTimeout(() => setResult(null), 3000);
      return () => clearTimeout(resultTimeoutRef.current);
    }
  }, [result]);

  useEffect(() => {
    fetchAttendanceByDate();
    fetchTotalMembers();
  }, [selectedDate]);

  // 📊 Memoize filtered calculations (prevent re-computation on every render)
  const presentMembers = useMemo(
    () => attendanceList.filter(r => r.status === 'present'),
    [attendanceList]
  );

  const absentCount = useMemo(
    () => totalMembers - presentMembers.length,
    [totalMembers, presentMembers.length]
  );

  const fetchTotalMembers = async () => {
    try {
      const res = await getMembers();
      setTotalMembers(res.data.data?.length || 0);
    } catch (err) {
      console.error('Failed to fetch total members:', err);
    }
  };

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

  // 🔍 Debounced search to reduce API calls
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchMembers(query);
        setSearchResults(res.data.data);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300); // 300ms debounce
  }, []);

  // ✅ Mark Present with duplicate detection
  const handleSelectMember = useCallback(async (member) => {
    // Prevent duplicate clicks
    if (markedMembers.has(member._id)) {
      setResult({
        success: false,
        message: `${member.name} already marked in this session`,
        isDuplicate: true
      });
      return;
    }

    setMarkingLoading(true);
    try {
      const res = await markManualAttendance({ 
        memberId: member._id, 
        status: 'present',
        date: selectedDate
      });
      
      const isFirstTime = !res.data.isUpdated;
      const message = isFirstTime 
        ? `✊ Great session ahead, ${res.data.data.memberName}!`
        : `🔄 ${res.data.data.memberName} already checked in`;

      setResult({
        success: true,
        message: message,
        memberName: res.data.data.memberName,
        isUpdated: res.data.isUpdated || false,
        isDuplicate: res.data.isUpdated || false
      });

      // Track marked member
      setMarkedMembers(prev => new Set([...prev, member._id]));

      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      fetchAttendanceByDate();
      
      // Auto-reset to today if in real-time mode
      if (attackMode === 'realtime') {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.message || 'Attendance failed',
        isDuplicate: err.response?.status === 409
      });
    } finally {
      setMarkingLoading(false);
    }
  }, [markedMembers, selectedDate, attackMode]);

  const handleSelectMemberAbsent = async (member) => {
    setMarkingLoading(true);
    try {
      const res = await markManualAttendance({ 
        memberId: member._id, 
        status: 'absent',
        date: selectedDate
      });
      
      const isFirstTime = !res.data.isUpdated;
      const message = isFirstTime 
        ? `� Recorded as absent today`
        : `🔄 Already marked absent`;

      setResult({
        success: true,
        message: message,
        memberName: res.data.data.memberName,
        isUpdated: res.data.isUpdated || false,
        isDuplicate: res.data.isUpdated || false
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

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">Check-in Hub</label>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-on-surface">Mark <span className="text-primary">Attendance</span></h1>
          </div>
          {/* Mode Toggle */}
          <div className="flex gap-2 bg-surface-container-high/50 p-1 rounded-kinetic border border-outline-variant/10">
            <button
              onClick={() => {
                setAttackMode('realtime');
                setMarkedMembers(new Set());
              }}
              className={`px-4 py-2 rounded-kinetic text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                attackMode === 'realtime'
                  ? 'bg-primary text-black shadow-lg'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              ⏱️ Real-time
            </button>
            <button
              onClick={() => {
                setAttackMode('batch');
                setMarkedMembers(new Set());
              }}
              className={`px-4 py-2 rounded-kinetic text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                attackMode === 'batch'
                  ? 'bg-primary text-black shadow-lg'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              📋 Batch Entry
            </button>
          </div>
        </div>

        {/* Result message */}
        {result && (
          <div className={`text-sm px-4 py-3 rounded-kinetic mb-6 font-bold uppercase tracking-wider ${
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-linear-to-b from-surface-container-high to-surface-container border-2 border-primary/30 rounded-kinetic shadow-2xl shadow-primary/20 z-50 max-h-80 overflow-y-auto backdrop-blur-heavy">
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
                        className="flex-1 text-xs bg-linear-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary-light hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-black py-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-lg hover:shadow-primary/50 transform group-hover:-translate-y-0.5"
                      >
                        ✓ PRESENT
                      </button>
                      <button
                        onClick={() => handleSelectMemberAbsent(member)}
                        disabled={markingLoading}
                        className="flex-1 text-xs bg-linear-to-r from-secondary to-orange-400 hover:from-secondary/80 hover:to-secondary hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-black font-black py-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-lg hover:shadow-secondary/50 transform group-hover:-translate-y-0.5"
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

        {/* Date-based attendance list */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-6 border border-outline-variant/10">
          {/* Statistics Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface-container/50 backdrop-blur-sm rounded-kinetic  border border-outline-variant/20">
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Total Members</p>
              <p className="text-3xl font-black text-primary">{totalMembers}</p>
            </div>
            <div className="bg-surface-container/50 backdrop-blur-sm rounded-kinetic  border border-outline-variant/20">
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-4 mt-1">Present</p>
              <p className="text-3xl font-black text-primary">{presentMembers.length}</p>
            </div>
            <div className="bg-surface-container/50 backdrop-blur-sm rounded-kinetic  border border-outline-variant/20">
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-4 mt-1">Absent</p>
              <p className="text-3xl font-black text-secondary">{absentCount}</p>
            </div>
          </div>

          <h3 className="text-lg font-black italic tracking-tighter text-on-surface mb-4" suppressHydrationWarning>
            {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            <span className="ml-3 text-sm font-normal text-on-surface-variant">
              (Present: {presentMembers.length})
            </span>
          </h3>

          {loading ? (
            <p className="text-on-surface-variant text-sm">Loading...</p>
          ) : presentMembers.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No present members marked for this date</p>
          ) : (
            <div className="space-y-2">
              {presentMembers.map((record, index) => (
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
                    <span className="text-xs px-2 py-1 rounded-kinetic font-bold uppercase tracking-wider bg-primary/20 text-primary">
                      {record.status}
                    </span>
                    <button
                      onClick={() => handleSelectMemberAbsent({ _id: record.member._id, name: record.member.name })}
                      disabled={markingLoading}
                      className="text-xs px-3 py-1 rounded-kinetic font-bold transition uppercase tracking-wider bg-secondary/20 hover:bg-secondary/30 text-secondary"
                    >
                      ✗ Mark Absent
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