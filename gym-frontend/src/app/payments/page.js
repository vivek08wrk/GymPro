'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getAllPayments, getMembers, recordPayment } from '@/lib/api';

export default function PaymentsPage() {
  useAuth();

  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    memberId: '',
    amount: '',
    paymentMethod: 'cash',
    membershipType: 'monthly',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, membersRes] = await Promise.all([
        getAllPayments(),
        getMembers(),
      ]);
      setPayments(paymentsRes.data.data);
      setMembers(membersRes.data.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateNewExpiry = (membershipType) => {
    const today = new Date();
    if (membershipType === 'monthly')   today.setMonth(today.getMonth() + 1);
    if (membershipType === 'quarterly') today.setMonth(today.getMonth() + 3);
    if (membershipType === 'yearly')    today.setFullYear(today.getFullYear() + 1);
    return today.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await recordPayment({
        ...form,
        amount: Number(form.amount),
        newExpiryDate: calculateNewExpiry(form.membershipType),
      });
      setSuccess('Payment recorded successfully!');
      setShowForm(false);
      setForm({ memberId: '', amount: '', paymentMethod: 'cash', membershipType: 'monthly' });
      fetchData();
    } catch (err) {
      console.error('Payment failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Total revenue calculate karo
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

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
          onClick={() => router.push('/dashboard')}
          className="text-on-surface-variant hover:text-primary text-sm font-inter-tight font-bold uppercase tracking-widest"
        >
          ← Dashboard
        </button>
      </header>

      <main className="pt-24 pb-12 px-6 md:px-10 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">Payment Tracking</label>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-on-surface">Manage <span className="text-primary">Payments</span></h1>
            <p className="text-sm text-on-surface-variant mt-3">
              Total Revenue: <span className="text-primary font-bold">₹{totalRevenue.toLocaleString()}</span>
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold px-6 py-3 rounded-kinetic transition-all duration-200 text-sm uppercase tracking-wider font-inter-tight shadow-lg hover:shadow-primary/30"
          >
            + Record Payment
          </button>
        </div>

        {/* Success message */}
        {success && (
          <div className="bg-primary/20 text-primary text-sm px-4 py-3 rounded-kinetic mb-6 font-bold uppercase tracking-wider">
            ✅ {success}
          </div>
        )}

        {/* Payment form */}
        {showForm && (
          <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-8 mb-6 border border-outline-variant/10">
            <h3 className="text-lg font-bold text-on-surface mb-6 uppercase tracking-widest">New Payment</h3>
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                  Select Member <span className="text-secondary">*</span>
                </label>
                <select
                  value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                  required
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">-- Select member --</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} — {m.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                  Membership Type
                </label>
                <select
                  value={form.membershipType}
                  onChange={(e) => setForm({ ...form, membershipType: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (3 months)</option>
                  <option value="yearly">Yearly (12 months)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                  Amount (₹) <span className="text-secondary">*</span>
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
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
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-outline-variant/20 text-on-surface-variant font-bold py-3 rounded-kinetic hover:bg-surface-container/50 transition text-sm uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold py-3 rounded-kinetic transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider shadow-md hover:shadow-primary/30"
                >
                  {submitting ? 'Saving...' : 'Record Payment'}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Payments list */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic overflow-hidden border border-outline-variant/10">
          <table className="w-full text-sm">
            <thead className="bg-surface-container border-b border-outline-variant/10">
              <tr>
                <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Member</th>
                <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Amount</th>
                <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Type</th>
                <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Method</th>
                <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">
                    No payments recorded yet
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-surface-container/50 transition">
                    <td className="px-6 py-4 font-bold text-on-surface">
                      {payment.member?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-primary font-bold text-lg">
                      ₹{payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs font-bold uppercase">
                      {payment.membershipType}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-kinetic font-bold uppercase tracking-wider">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs">
                      {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}