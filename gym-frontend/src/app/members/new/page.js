'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createMember } from '@/lib/api';

export default function NewMemberPage() {
  useAuth();

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    membershipType: 'monthly',
    expiryDate: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Membership type select karte hi expiry auto calculate karo
  const handleMembershipChange = (e) => {
    const type = e.target.value;
    const today = new Date();
    let expiry = new Date();

    if (type === 'monthly')   expiry.setMonth(today.getMonth() + 1);
    if (type === 'quarterly') expiry.setMonth(today.getMonth() + 3);
    if (type === 'yearly')    expiry.setFullYear(today.getFullYear() + 1);

    setForm({
      ...form,
      membershipType: type,
      expiryDate: expiry.toISOString().split('T')[0],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createMember(form);
      router.push('/members');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
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

      <main className="pt-24 pb-12 px-6 md:px-10 max-w-2xl mx-auto">

        <div className="mb-8">
          <label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">New Registration</label>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-on-surface">Add <span className="text-primary">Member</span></h1>
        </div>

        {error && (
          <div className="bg-secondary/20 text-secondary text-sm px-4 py-3 rounded-kinetic mb-6 font-bold uppercase tracking-wider">
            ⚠️ {error}
          </div>
        )}

        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-8 border border-outline-variant/10">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                Full Name <span className="text-secondary">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Rahul Sharma"
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                Phone Number <span className="text-secondary">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="9876543210"
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                Email <span className="text-on-surface-variant/50 text-xs font-normal">(optional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="rahul@gmail.com"
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                Address <span className="text-on-surface-variant/50 text-xs font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123, MG Road, Dehradun"
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Membership Type */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                Membership Type <span className="text-secondary">*</span>
              </label>
              <select
                name="membershipType"
                value={form.membershipType}
                onChange={handleMembershipChange}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (3 months)</option>
                <option value="yearly">Yearly (12 months)</option>
              </select>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                Expiry Date <span className="text-secondary">*</span>
              </label>
              <input
                type="date"
                name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
                required
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-on-surface-variant/50 mt-2">
                Auto-calculated from membership type — change manually if needed
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/members')}
                className="flex-1 border border-outline-variant/20 text-on-surface-variant font-bold py-3 rounded-kinetic hover:bg-surface-container/50 hover:border-outline-variant/50 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-outline-variant/50 text-sm uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold py-3 rounded-kinetic transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider shadow-md hover:shadow-primary/30"
              >
                {loading ? 'Saving...' : 'Add Member'}
              </button>
            </div>

          </form>
        </div>

      </main>
    </div>
  );
}