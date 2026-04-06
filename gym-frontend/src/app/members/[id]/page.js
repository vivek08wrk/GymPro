'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getMember, recordPayment, toggleMemberStatus, sendMotivationalMessage, getMemberAttendanceByDateRange, getMemberMonthlySummary } from '@/lib/api';

export default function MemberDetailPage() {
  useAuth();

  const router = useRouter();
  const { id } = useParams();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [renewal, setRenewal] = useState({
    amount: '',
    paymentMethod: 'cash',
    membershipType: 'monthly',
  });
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewSuccess, setRenewSuccess] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);
  const [motivationLoading, setMotivationLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState('30days');
  const [monthlySummary, setMonthlySummary] = useState(null);

  useEffect(() => {
    fetchMember();
  }, [id]);

  const fetchAttendanceHistory = async (filter = '30days') => {
    try {
      setAttendanceLoading(true);
      const today = new Date();
      let startDate;

      if (filter === '7days') {
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filter === '30days') {
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (filter === '90days') {
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];

      const res = await getMemberAttendanceByDateRange(id, startDateStr, endDateStr);
      setAttendanceHistory(res.data.data);
      setMonthlySummary(res.data.statistics);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleAttendanceFilterChange = (filter) => {
    setAttendanceFilter(filter);
    fetchAttendanceHistory(filter);
  };

  const fetchMember = async () => {
    try {
      const res = await getMember(id);
      setMember(res.data.data);
      // Fetch attendance after member is loaded
      await fetchAttendanceHistory('30days');
    } catch (err) {
      console.error('Failed to fetch member:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    const today = new Date();
    const expiry = new Date(member.expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0)  return { label: 'Expired',                    color: 'red' };
    if (daysLeft <= 7) return { label: `Expiring in ${daysLeft} days`, color: 'amber' };
    return             { label: 'Active',                             color: 'green' };
  };

  const handleRenewal = async (e) => {
    e.preventDefault();
    setRenewLoading(true);

    try {
      const today = new Date();
      let newExpiry = new Date(member.expiryDate);

      // Agar already expired hai toh aaj se calculate karo
      if (newExpiry < today) newExpiry = new Date();

      if (renewal.membershipType === 'monthly')   newExpiry.setMonth(newExpiry.getMonth() + 1);
      if (renewal.membershipType === 'quarterly') newExpiry.setMonth(newExpiry.getMonth() + 3);
      if (renewal.membershipType === 'yearly')    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      await recordPayment({
        memberId: id,
        amount: Number(renewal.amount),
        paymentMethod: renewal.paymentMethod,
        membershipType: renewal.membershipType,
        newExpiryDate: newExpiry.toISOString(),
      });

      setRenewSuccess('Membership renewed successfully!');
      setShowRenewalForm(false);
      fetchMember();
    } catch (err) {
      console.error('Renewal failed:', err);
    } finally {
      setRenewLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!window.confirm(`Mark ${member.name} as ${member.isActive ? 'Inactive' : 'Active'}?`)) {
      return;
    }

    setToggleLoading(true);
    try {
      await toggleMemberStatus(id);
      setMessage(`✅ Member marked as ${!member.isActive ? 'Active' : 'Inactive'}`);
      fetchMember();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleSendMotivation = async () => {
    setMotivationLoading(true);
    try {
      const res = await sendMotivationalMessage(id);
      setMessage(`✅ Motivational message sent!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setMotivationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-on-surface-variant">Member not found</p>
      </div>
    );
  }

  const status = getStatusInfo();
  const statusColors = {
    green: 'bg-primary/20 text-primary',
    amber: 'bg-tertiary/20 text-tertiary',
    red:   'bg-secondary/20 text-secondary',
  };

  return (
    <div className="min-h-screen bg-surface">

      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-heavy shadow-kinetic flex justify-between items-center px-6 h-16">
        <span 
          className="text-2xl font-black italic tracking-tighter text-primary cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          GymPro
        </span>
        <button
          onClick={() => router.push('/members')}
          className="text-on-surface-variant hover:text-primary text-sm font-inter-tight font-bold uppercase tracking-widest"
        >
          ← Members
        </button>
      </header>

      <main className="pt-24 pb-12 px-6 md:px-10 max-w-4xl mx-auto">

        {/* Success/Error message */}
        {renewSuccess && (
          <div className="bg-primary/20 text-primary text-sm px-4 py-3 rounded-kinetic mb-6 font-bold uppercase tracking-wider">
            ✅ {renewSuccess}
          </div>
        )}
        
        {message && (
          <div className={`text-sm px-4 py-3 rounded-kinetic mb-6 font-bold uppercase tracking-wider ${
            message.includes('✅') 
              ? 'bg-primary/20 text-primary' 
              : 'bg-secondary/20 text-secondary'
          }`}>
            {message}
          </div>
        )}

        {/* Member card */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-8 mb-6 border border-outline-variant/10">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-outline-variant/10">
            <div className="flex-1">
              <h2 className="text-3xl font-black italic tracking-tighter text-on-surface">{member.name}</h2>
              <p className="text-on-surface-variant text-sm mt-2">{member.phone}</p>
              {member.email && (
                <p className="text-on-surface-variant text-sm">{member.email}</p>
              )}
              <div className="mt-3 flex gap-2">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-kinetic uppercase tracking-wider ${
                  member.isActive 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {member.isActive ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-kinetic uppercase tracking-wider whitespace-nowrap ml-4 ${statusColors[status.color]}`}>
              {status.label}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <InfoBox label="Membership" value={member.membershipType} />
            <InfoBox
              label="Join Date"
              value={new Date(member.joinDate).toLocaleDateString('en-IN')}
            />
            <InfoBox
              label="Expiry Date"
              value={new Date(member.expiryDate).toLocaleDateString('en-IN')}
            />
            {member.address && (
              <InfoBox label="Address" value={member.address} />
            )}
          </div>

          {/* QR Code */}
          {member.qrCode && (
            <div className="mt-6 pt-6 border-t border-outline-variant/10">
              <p className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-widest">Member QR Code</p>
              <div className="flex items-center gap-4">
                <img
                  src={member.qrCode}
                  alt="QR Code"
                  className="w-32 h-32 rounded-kinetic border border-outline-variant/20"
                />
                <div>
                  <p className="text-xs text-on-surface-variant/50 mb-3">
                    Print or show this QR code for attendance
                  </p>
                  <a
                    href={member.qrCode}
                    download={`${member.name}-qr.png`}
                    className="text-xs bg-primary/20 text-primary hover:bg-primary/30 px-3 py-2 rounded-kinetic inline-block transition font-bold uppercase tracking-wider"
                  >
                    ⬇ Download QR
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Buttons section */}
          {!showRenewalForm && (
            <div className="grid grid-cols-3 gap-3 mt-6">
              <button
                onClick={() => setShowRenewalForm(true)}
                className="bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold py-3 rounded-kinetic transition-all duration-200 text-sm uppercase tracking-wider shadow-md hover:shadow-primary/30"
              >
                Renew
              </button>
              <button
                onClick={handleSendMotivation}
                disabled={motivationLoading}
                className="bg-primary/20 hover:bg-primary/40 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-primary font-bold py-3 rounded-kinetic transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shadow-md hover:shadow-primary/30"
              >
                {motivationLoading ? '⏳' : '💪'} Motivate
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={toggleLoading}
                className={`font-bold py-3 rounded-kinetic transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 shadow-md ${
                  member.isActive 
                    ? 'bg-secondary/20 hover:bg-secondary/40 text-secondary focus:ring-secondary/50 hover:shadow-secondary/30' 
                    : 'bg-primary/20 hover:bg-primary/40 text-primary focus:ring-primary/50 hover:shadow-primary/30'
                }`}
              >
                {toggleLoading ? '⏳' : (member.isActive ? '✗ Inactive' : '✓ Active')}
              </button>
            </div>
          )}
        </div>

        {/* Attendance History Section */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-8 mb-6 border border-outline-variant/10">
          <h3 className="text-lg font-bold text-on-surface mb-6 uppercase tracking-widest">Attendance History</h3>

          {/* Filter buttons */}
          <div className="flex gap-2 mb-6 border-b border-outline-variant/10 pb-4">
            <button
              onClick={() => handleAttendanceFilterChange('7days')}
              className={`text-xs px-4 py-2 rounded-kinetic font-bold transition uppercase tracking-wider ${
                attendanceFilter === '7days'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-container/50 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleAttendanceFilterChange('30days')}
              className={`text-xs px-4 py-2 rounded-kinetic font-bold transition uppercase tracking-wider ${
                attendanceFilter === '30days'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-container/50 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleAttendanceFilterChange('90days')}
              className={`text-xs px-4 py-2 rounded-kinetic font-bold transition uppercase tracking-wider ${
                attendanceFilter === '90days'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-container/50 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Last 90 Days
            </button>
          </div>

          {/* Stats */}
          {monthlySummary && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-surface-container rounded-kinetic p-4 text-center border border-outline-variant/10">
                <p className="text-s font-black text-primary">{monthlySummary.total}</p>
                <p className="text-xs text-on-surface-variant mt-1 font-bold uppercase tracking-wider">Total Records</p>
              </div>
              <div className="bg-surface-container rounded-kinetic p-4 text-center border border-outline-variant/10">
                <p className="text-s font-black text-primary">{monthlySummary.present}</p>
                <p className="text-xs text-on-surface-variant mt-1 font-bold uppercase tracking-wider">Present</p>
              </div>
              <div className="bg-surface-container rounded-kinetic p-4 text-center border border-outline-variant/10">
                <p className="text-s font-black text-secondary">{monthlySummary.absent}</p>
                <p className="text-xs text-on-surface-variant mt-1 font-bold uppercase tracking-wider">Absent</p>
              </div>
              <div className="bg-surface-container rounded-kinetic p-4 text-center border border-outline-variant/10">
                <p className="text-s font-black text-tertiary">{monthlySummary.attendancePercentage}%</p>
                <p className="text-xs text-on-surface-variant mt-1 font-bold uppercase tracking-wider">Attendance %</p>
              </div>
            </div>
          )}

          {/* Attendance records */}
          {attendanceLoading ? (
            <p className="text-on-surface-variant text-sm">Loading attendance records...</p>
          ) : attendanceHistory.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No attendance records found</p>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-outline-variant/10 rounded-kinetic">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-container border-b border-outline-variant/10">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-on-surface-variant text-xs uppercase tracking-widest">Date</th>
                    <th className="px-4 py-3 text-left font-bold text-on-surface-variant text-xs uppercase tracking-widest">Time</th>
                    <th className="px-4 py-3 text-left font-bold text-on-surface-variant text-xs uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record) => (
                    <tr key={record._id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/50 transition">
                      <td className="px-4 py-3 text-on-surface font-medium text-sm">
                        {new Date(record.checkInTime).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-sm">
                        {new Date(record.checkInTime).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-kinetic font-bold uppercase tracking-wider ${
                          record.status === 'present'
                            ? 'bg-primary/20 text-primary'
                            : record.status === 'absent'
                            ? 'bg-secondary/20 text-secondary'
                            : 'bg-tertiary/20 text-tertiary'
                        }`}>
                          {record.status === 'present' ? '✓ Present' : record.status === 'absent' ? '✗ Absent' : '⊘ Denied'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Renewal form */}
        {showRenewalForm && (
          <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-8 border border-outline-variant/10">
            <h3 className="text-lg font-bold text-on-surface mb-6 uppercase tracking-widest">Renew Membership</h3>
            <form onSubmit={handleRenewal} className="space-y-5">

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                  Membership Type
                </label>
                <select
                  value={renewal.membershipType}
                  onChange={(e) => setRenewal({ ...renewal, membershipType: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (3 months)</option>
                  <option value="yearly">Yearly (12 months)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={renewal.amount}
                  onChange={(e) => setRenewal({ ...renewal, amount: e.target.value })}
                  required
                  placeholder="1500"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                  Payment Method
                </label>
                <select
                  value={renewal.paymentMethod}
                  onChange={(e) => setRenewal({ ...renewal, paymentMethod: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRenewalForm(false)}
                  className="flex-1 border border-outline-variant/20 text-on-surface-variant font-bold py-3 rounded-kinetic hover:bg-surface-container/50 hover:border-outline-variant/50 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-outline-variant/50 text-sm uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewLoading}
                  className="flex-1 bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold py-3 rounded-kinetic transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider shadow-md hover:shadow-primary/30"
                >
                  {renewLoading ? 'Processing...' : 'Confirm Renewal'}
                </button>
              </div>

            </form>
          </div>
        )}

      </main>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="bg-surface-container rounded-kinetic p-4 border border-outline-variant/10">
      <p className="text-xs text-on-surface-variant font-bold mb-1 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-on-surface capitalize">{value}</p>
    </div>
  );
}