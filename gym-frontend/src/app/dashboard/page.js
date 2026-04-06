'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getMembers, getTodayAttendance, getAllPayments, getPaymentStats } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  useAuth();

  const router = useRouter();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    todayAttendance: 0,
    expiringMembers: 0,
    expiringPercentage: 0,
    totalRevenue: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [membersRes, attendanceRes, paymentsRes, statsRes] = await Promise.all([
        getMembers(),
        getTodayAttendance(),
        getAllPayments(),
        getPaymentStats(),
      ]);

      const members = membersRes.data.data;
      const attendance = attendanceRes.data.data;
      const payments = paymentsRes.data.data;
      const revenue = statsRes.data.data;

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const activeMembers = members.filter((m) => m.isActive).length;

      // Calculate members expiring in next 7 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      const expiringMembers = members.filter((m) => {
        const expiryDate = new Date(m.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        return expiryDate > today && expiryDate <= sevenDaysLater;
      }).length;

      const expiringPercentage = activeMembers > 0 ? Math.round((expiringMembers / activeMembers) * 100) : 0;

      setStats({ 
        totalMembers: members.length, 
        activeMembers, 
        todayAttendance: attendance.length,
        expiringMembers,
        expiringPercentage,
        totalRevenue 
      });
      setRevenueData(revenue);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-on-surface-variant animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-heavy shadow-kinetic flex justify-between items-center px-6 h-16">
        <span className="text-2xl font-black italic tracking-tighter text-primary">GymPro</span>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-8 font-inter-tight font-bold tracking-tighter">
            <a className="text-primary hover:text-primary-light transition-colors" href="#dashboard">Dashboard</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#members">Members</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#performance">Performance</a>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-on-surface-variant hover:text-primary hover:scale-110 active:scale-95 text-sm font-inter-tight font-bold uppercase tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-6 md:px-10 max-w-7xl mx-auto">

        {/* Hero Section */}
        <section className="mb-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8">
            <label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">
              Performance Hub
            </label>
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-on-surface leading-none mb-4">
              Welcome Back,<br/><span className="text-primary">Athlete</span>
            </h1>
            <p className="text-on-surface-variant max-w-lg text-lg">
              {stats.activeMembers} active members today. {stats.todayAttendance} checked in. <span className="text-tertiary font-bold">{stats.expiringMembers} expiring soon!</span>
            </p>
          </div>
          <div className="md:col-span-4 flex justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" fill="transparent" r="88" stroke="#262626" strokeWidth="12"></circle>
                <circle 
                  cx="96" cy="96" fill="transparent" r="88" 
                  stroke={stats.expiringPercentage > 30 ? "#ff7439" : stats.expiringPercentage > 15 ? "#8ff5ff" : "#cafd00"} strokeDasharray={`${(stats.expiringPercentage / 100) * 552.92}`} strokeDashoffset={`${(1 - stats.expiringPercentage / 100) * 138.23}`}
                  strokeLinecap="round" strokeWidth="12"
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black italic text-on-surface">{stats.expiringMembers}</span>
                <span className="text-sm font-bold text-on-surface mt-1">{stats.expiringPercentage}%</span>
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Expiring Soon</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid & Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Stats Cards - Glass Morphism (no borders, bg shifts) */}
          <div className="md:col-span-8 grid grid-cols-2 gap-4">
            <StatCard icon="🔥" label="Total Members" value={stats.totalMembers} unit="" />
            <StatCard icon="❤️" label="Active Today" value={stats.todayAttendance} unit="checked in" />
            <StatCard icon="✅" label="Active Members" value={stats.activeMembers} unit="members" />
            <StatCard icon="💰" label="Total Revenue" value={`₹${(stats.totalRevenue / 1000).toFixed(1)}k`} unit="revenue" />
          </div>

          {/* Intensity Heatmap */}
          <div className="md:col-span-4 bg-surface-container-high/50 backdrop-blur-heavy p-6 rounded-kinetic border border-outline-variant/10">
            <h3 className="text-on-surface text-lg font-black italic tracking-tight mb-4">Weekly Intensity</h3>
            <div className="grid grid-cols-7 gap-2">
              <div className="w-6 h-6 rounded-sm bg-primary-dim/20"></div>
              <div className="w-6 h-6 rounded-sm bg-primary-dim/40"></div>
              <div className="w-6 h-6 rounded-sm bg-primary-dim"></div>
              <div className="w-6 h-6 rounded-sm bg-secondary"></div>
              <div className="w-6 h-6 rounded-sm bg-primary-dim/60"></div>
              <div className="w-6 h-6 rounded-sm bg-surface-container-high"></div>
              <div className="w-6 h-6 rounded-sm bg-primary-dim"></div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-4 leading-relaxed">
              Peak performance recorded on Thursday during strength training.
            </p>
          </div>

          {/* Revenue Chart */}
          {revenueData.length > 0 && (
            <div className="md:col-span-7 bg-surface-container-high/50 backdrop-blur-heavy p-8 rounded-kinetic border border-outline-variant/10">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h3 className="text-on-surface text-2xl font-black italic tracking-tighter">Monthly Revenue</h3>
                  <p className="text-on-surface-variant text-sm">Consistent growth this quarter</p>
                </div>
                <div className="text-right">
                  <p className="text-primary text-3xl font-black italic">₹{(stats.totalRevenue / 1000).toFixed(1)}k</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Total</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#adaaaa" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#adaaaa" }} />
                  <Tooltip 
                    formatter={(val) => `₹${val.toLocaleString()}`}
                    contentStyle={{ backgroundColor: "#131313", border: "1px solid #262626" }}
                  />
                  <Bar dataKey="revenue" fill="#cafd00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quick Actions */}
          <div className="md:col-span-5 bg-surface-container-high/50 backdrop-blur-heavy p-8 rounded-kinetic border border-outline-variant/10">
            <h3 className="text-on-surface text-2xl font-black italic tracking-tighter mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <ActionButton label="AI Assistant" icon="🤖" onClick={() => router.push('/ai-chat')} />
              <ActionButton label="Mark Attendance" icon="📍" onClick={() => router.push('/attendance')} />
              <ActionButton label="Add Member" icon="➕" onClick={() => router.push('/members/new')} />
              <ActionButton label="View Members" icon="👥" onClick={() => router.push('/members')} />
              <ActionButton label="Record Payment" icon="💳" onClick={() => router.push('/payments')} />
              <ActionButton label="Member Progress" icon="📊" onClick={() => router.push('/progress')} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, unit }) {
  return (
    <div className="bg-surface-container-high/50 backdrop-blur-heavy p-6 rounded-kinetic border border-outline-variant/10 group hover:bg-surface-container-high/70 transition-colors">
      <span className="text-3xl mb-4 block">{icon}</span>
      <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">{label}</h3>
      <p className="text-3xl font-black text-on-surface mt-2">
        {value} 
        {unit && <span className="text-sm font-normal text-on-surface-variant ml-2">{unit}</span>}
      </p>
    </div>
  );
}

function ActionButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-surface-container hover:bg-surface-container-high hover:border-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 rounded-kinetic border border-outline-variant/10 text-left focus:outline-none focus:ring-2 focus:ring-primary/50 hover:shadow-lg hover:shadow-primary/20"
    >
      <span className="text-2xl hover:scale-110 transition-transform duration-200">{icon}</span>
      <span className="flex-1 font-inter-tight font-bold text-sm text-on-surface">{label}</span>
      <span className="text-primary group-hover:translate-x-1 transition-transform duration-200">→</span>
    </button>
  );
}