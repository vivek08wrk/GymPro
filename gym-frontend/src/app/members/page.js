'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getMembers, deleteMember } from '@/lib/api';

export default function MembersPage() {
  useAuth();

  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  // Search filter
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      members.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.phone.includes(q)
      )
    );
  }, [search, members]);

  const fetchMembers = async () => {
    try {
      const res = await getMembers();
      setMembers(res.data.data);
      setFiltered(res.data.data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this member?')) return;
    try {
      await deleteMember(id);
      fetchMembers();
    } catch (err) {
      console.error('Failed to delete member:', err);
    }
  };

  const getStatusBadge = (member) => {
    const today = new Date();
today.setHours(0, 0, 0, 0);

const expiry = new Date(member.expiryDate);
expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded-kinetic font-bold uppercase tracking-wider">Expired</span>;
    } else if (daysLeft <= 7) {
      return <span className="text-xs bg-tertiary/20 text-tertiary px-2 py-1 rounded-kinetic font-bold uppercase tracking-wider">Expiring in {daysLeft}d</span>;
    } else {
      return <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-kinetic font-bold uppercase tracking-wider">Active</span>;
    }
  };

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

      <main className="pt-24 pb-12 px-6 md:px-10 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">Member Directory</label>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-on-surface">Manage <span className="text-primary">Members</span></h1>
          </div>
          <button
            onClick={() => router.push('/members/new')}
            className="bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold px-6 py-3 rounded-kinetic transition-all duration-200 text-sm uppercase tracking-wider font-inter-tight shadow-lg hover:shadow-primary/30"
          >
            + Add Member
          </button>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Members list */}
        {filtered.length === 0 ? (
          <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-10 text-center border border-outline-variant/10">
            <p className="text-on-surface-variant text-sm">No members found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic overflow-hidden border border-outline-variant/10">
              <table className="w-full text-sm">
                <thead className="bg-surface-container border-b border-outline-variant/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Name</th>
                    <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Phone</th>
                    <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Membership</th>
                    <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Status</th>
                    <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Expiry</th>
                    <th className="text-left px-6 py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filtered.map((member, idx) => (
                    <tr key={member._id} className="hover:bg-surface-container/50 transition">
                      <td className="px-6 py-4 font-bold text-on-surface">{idx + 1}. {member.name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{member.phone}</td>
                      <td className="px-6 py-4 text-on-surface-variant text-xs  uppercase">{member.membershipType}</td>
                      <td className="px-6 py-4">{getStatusBadge(member)}</td>
                      <td className="px-6 py-4 text-on-surface-variant text-xs">
                        {new Date(member.expiryDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/members/${member._id}`)}
                            className="text-xs bg-primary/20 text-primary hover:bg-primary/40 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 px-3 py-1.5 rounded-kinetic transition-all duration-200 font-bold uppercase tracking-wider shadow-md hover:shadow-primary/30"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(member._id)}
                            className="text-xs bg-secondary/20 text-secondary hover:bg-secondary/40 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 px-3 py-1.5 rounded-kinetic transition-all duration-200 font-bold uppercase tracking-wider shadow-md hover:shadow-secondary/30"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filtered.map((member, idx) => (
                <div key={member._id} className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-4 border border-outline-variant/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-on-surface text-sm">{idx + 1}. {member.name}</p>
                      <p className="text-xs text-on-surface-variant">{member.phone}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">Membership</p>
                      <p className="text-xs text-on-surface  mt-1 uppercase">{member.membershipType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">Expiry</p>
                      <p className="text-xs text-on-surface-variant mt-1">{new Date(member.expiryDate).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-1">Status</p>
                    {getStatusBadge(member)}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/members/${member._id}`)}
                      className="flex-1 text-xs bg-primary/20 text-primary hover:bg-primary/40 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 px-3 py-2 rounded-kinetic transition-all duration-200 font-bold uppercase tracking-wider shadow-md hover:shadow-primary/30"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(member._id)}
                      className="flex-1 text-xs bg-secondary/20 text-secondary hover:bg-secondary/40 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 px-3 py-2 rounded-kinetic transition-all duration-200 font-bold uppercase tracking-wider shadow-md hover:shadow-secondary/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}