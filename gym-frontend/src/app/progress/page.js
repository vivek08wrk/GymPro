'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getMembers, getMemberProgress, addMemberProgress } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ProgressPage() {
  useAuth();

  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [progressData, setProgressData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    weight: '',
    height: '',
    chest: '',
    waist: '',
    hips: '',
    trainerNotes: '',
    diet: { calories: '', proteinGrams: '', notes: '' },
    exercisesPerformed: [{ name: '', sets: '', reps: '', weightKg: '' }],
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) fetchProgress();
  }, [selectedMember]);

  const fetchMembers = async () => {
    try {
      const res = await getMembers();
      setMembers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const filtered = members.filter(m =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.phone.includes(query)
    );
    setSearchResults(filtered);
    setShowResults(true);
  };

  const handleSelectMember = (memberId) => {
    setSelectedMember(memberId);
    setSearchQuery('');
    setShowResults(false);
  };

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const res = await getMemberProgress(selectedMember);
      setProgressData(res.data.data.reverse()); // oldest first for chart
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = () => {
    setForm({
      ...form,
      exercisesPerformed: [
        ...form.exercisesPerformed,
        { name: '', sets: '', reps: '', weightKg: '' }
      ]
    });
  };

  const handleExerciseChange = (index, field, value) => {
    const updated = [...form.exercisesPerformed];
    updated[index][field] = value;
    setForm({ ...form, exercisesPerformed: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addMemberProgress({
        ...form,
        member: selectedMember,
        weight: Number(form.weight),
        height: Number(form.height),
        chest: Number(form.chest),
        waist: Number(form.waist),
        hips: Number(form.hips),
        diet: {
          calories: Number(form.diet.calories),
          proteinGrams: Number(form.diet.proteinGrams),
          notes: form.diet.notes,
        },
        exercisesPerformed: form.exercisesPerformed.map((e) => ({
          name: e.name,
          sets: Number(e.sets),
          reps: Number(e.reps),
          weightKg: Number(e.weightKg),
        })),
      });
      setSuccess('Progress recorded successfully!');
      setShowForm(false);
      fetchProgress();
    } catch (err) {
      console.error('Failed to add progress:', err);
    }
  };

  // Chart ke liye weight data prepare karo
  const weightChartData = progressData.map((p) => ({
    date: new Date(p.recordedAt).toLocaleDateString('en-IN'),
    weight: p.weight,
  })).filter((d) => d.weight);

  // 📥 Download progress history as PDF
  const downloadProgressPDF = async () => {
    const selectedMemberData = members.find(m => m._id === selectedMember);
    if (!selectedMemberData || progressData.length === 0) return;

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const lineHeight = 7;
      const margin = 12;

      // 🏋️ Header - Member Info
      pdf.setFontSize(20);
      pdf.setTextColor(202, 253, 0); // Primary color
      pdf.text('GymPro Progress Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Member Details Box
      pdf.setDrawColor(202, 253, 0);
      pdf.setFillColor(30, 30, 30);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 24, 'F');
      pdf.setTextColor(202, 253, 0);
      pdf.setFontSize(11);
      pdf.text('MEMBER INFORMATION', margin + 2, yPosition);
      
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 200);
      yPosition += 6;
      pdf.text(`Name: ${selectedMemberData.name}`, margin + 2, yPosition);
      yPosition += 5;
      pdf.text(`Phone: ${selectedMemberData.phone}`, margin + 2, yPosition);
      yPosition += 5;
      pdf.text(`Status: ${selectedMemberData.isActive ? 'Active' : 'Inactive'}`, margin + 2, yPosition);
      yPosition += 5;
      pdf.text(`Expiry: ${new Date(selectedMemberData.expiryDate).toLocaleDateString('en-IN')}`, margin + 2, yPosition);
      yPosition += 12;

      // 📊 Progress History
      pdf.setTextColor(202, 253, 0);
      pdf.setFontSize(12);
      pdf.text('PROGRESS HISTORY', margin, yPosition);
      yPosition += 8;

      // Progress records
      pdf.setFontSize(8);
      pdf.setTextColor(180, 180, 180);

      [...progressData].reverse().forEach((record, idx) => {
        // Check if need new page
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 15;
        }

        // Record date
        pdf.setTextColor(202, 253, 0);
        pdf.setFont(undefined, 'bold');
        const recordDate = new Date(record.recordedAt).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        pdf.text(`${idx + 1}. ${recordDate}`, margin, yPosition);
        yPosition += 5;

        // Body measurements
        if (record.weight || record.chest || record.waist || record.hips) {
          pdf.setTextColor(180, 180, 180);
          pdf.setFont(undefined, 'normal');
          let measurements = [];
          if (record.weight) measurements.push(`Weight: ${record.weight} kg`);
          if (record.chest) measurements.push(`Chest: ${record.chest} cm`);
          if (record.waist) measurements.push(`Waist: ${record.waist} cm`);
          if (record.hips) measurements.push(`Hips: ${record.hips} cm`);
          
          const measurementsText = measurements.join(' | ');
          pdf.text(measurementsText, margin + 2, yPosition, { maxWidth: pageWidth - 2 * margin - 2 });
          yPosition += 4;
        }

        // Exercises
        if (record.exercisesPerformed?.length > 0) {
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(150, 200, 100);
          pdf.text('Exercises:', margin + 2, yPosition);
          yPosition += 3;
          
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(160, 160, 160);
          record.exercisesPerformed.forEach((ex) => {
            const exText = `• ${ex.name} — ${ex.sets}×${ex.reps} @ ${ex.weightKg}kg`;
            pdf.text(exText, margin + 4, yPosition);
            yPosition += 3;
          });
        }

        // Diet
        if (record.diet?.calories || record.diet?.proteinGrams) {
          yPosition += 1;
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(150, 200, 100);
          pdf.text('Diet:', margin + 2, yPosition);
          yPosition += 3;
          
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(160, 160, 160);
          if (record.diet.calories) {
            pdf.text(`• Calories: ${record.diet.calories}`, margin + 4, yPosition);
            yPosition += 3;
          }
          if (record.diet.proteinGrams) {
            pdf.text(`• Protein: ${record.diet.proteinGrams}g`, margin + 4, yPosition);
            yPosition += 3;
          }
        }

        // Trainer notes
        if (record.trainerNotes) {
          yPosition += 1;
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(150, 200, 100);
          pdf.text('Trainer Notes:', margin + 2, yPosition);
          yPosition += 3;
          
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(160, 160, 160);
          const splitText = pdf.splitTextToSize(record.trainerNotes, pageWidth - 2 * margin - 4);
          splitText.forEach((line) => {
            if (yPosition > pageHeight - 10) {
              pdf.addPage();
              yPosition = 15;
            }
            pdf.text(line, margin + 4, yPosition);
            yPosition += 3;
          });
        }

        yPosition += 4;
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`End of Report | GymPro © 2026`, pageWidth / 2, pageHeight - 5, { align: 'center' });

      // Download
      pdf.save(`${selectedMemberData.name}_Progress_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Error generating PDF');
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
          onClick={() => router.push('/dashboard')}
          className="text-on-surface-variant hover:text-primary text-sm font-inter-tight font-bold uppercase tracking-widest"
        >
          ← Dashboard
        </button>
      </header>

      <main className="pt-24 pb-12 px-6 md:px-10 max-w-5xl mx-auto">

        <div className="mb-8">
          <label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">Performance Metrics</label>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-on-surface">Member <span className="text-primary">Progress</span></h1>
        </div>

        {/* Member search */}
        <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-6 mb-6 border border-outline-variant/10">
          <label className="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-widest">
            Search Member
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
            
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-high border border-primary/30 rounded-kinetic shadow-lg shadow-primary/20 z-50 max-h-64 overflow-y-auto backdrop-blur-heavy">
                {searchResults.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => handleSelectMember(member._id)}
                    className="w-full text-left px-4 py-3 bg-white hover:bg-gray-100 border-b border-gray-200 last:border-0 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-on-surface">{member.name}</p>
                      <p className="text-xs text-on-surface-variant">📱 {member.phone}</p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap ml-2 ${
                      member.isActive 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-secondary/20 text-secondary'
                    }`}>
                      {member.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {searchQuery && searchResults.length === 0 && showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-high border border-outline-variant/20 rounded-kinetic p-4 text-center">
                <p className="text-xs text-on-surface-variant">No members found</p>
              </div>
            )}
          </div>

          {selectedMember && members.find(m => m._id === selectedMember) && (
            <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-kinetic">
              <p className="text-xs text-primary font-bold">
                ✓ Selected: {members.find(m => m._id === selectedMember)?.name}
              </p>
            </div>
          )}
        </div>

        {selectedMember && (
          <>
            {/* Success message */}
            {success && (
              <div className="bg-primary/20 text-primary text-sm px-4 py-3 rounded-kinetic mb-6 font-bold uppercase tracking-wider">
                ✅ {success}
              </div>
            )}

            {/* Add progress & Download buttons */}
            <div className="flex gap-3 justify-end mb-6">
              <button
                onClick={downloadProgressPDF}
                disabled={progressData.length === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-kinetic transition-all duration-200 text-sm uppercase tracking-wider font-inter-tight font-bold ${
                  progressData.length === 0
                    ? 'bg-on-surface-variant/20 text-on-surface-variant cursor-not-allowed'
                    : 'bg-secondary hover:bg-secondary/90 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-black shadow-lg hover:shadow-secondary/30'
                }`}
              >
                📥 Download PDF
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold px-6 py-3 rounded-kinetic transition-all duration-200 text-sm uppercase tracking-wider font-inter-tight shadow-lg hover:shadow-primary/30"
              >
                + Add Progress Entry
              </button>
            </div>

            {/* Progress form */}
            {showForm && (
              <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-8 mb-6 border border-outline-variant/10">
                <h3 className="text-lg font-bold text-on-surface mb-6 uppercase tracking-widest">New Progress Entry</h3>
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Body measurements */}
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-widest">Body Measurements</p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {['weight', 'height', 'chest', 'waist', 'hips'].map((field) => (
                        <div key={field}>
                          <label className="block text-xs text-on-surface-variant mb-1 font-bold uppercase tracking-wider">
                            {field} {field === 'weight' || field === 'height' ? `(${field === 'weight' ? 'kg' : 'cm'})` : '(cm)'}
                          </label>
                          <input
                            type="number"
                            value={form[field]}
                            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                            placeholder="0"
                            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Diet */}
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-widest">Diet</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-1 font-bold uppercase tracking-wider">Calories</label>
                        <input
                          type="number"
                          value={form.diet.calories}
                          onChange={(e) => setForm({ ...form, diet: { ...form.diet, calories: e.target.value } })}
                          placeholder="2000"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-1 font-bold uppercase tracking-wider">Protein (g)</label>
                        <input
                          type="number"
                          value={form.diet.proteinGrams}
                          onChange={(e) => setForm({ ...form, diet: { ...form.diet, proteinGrams: e.target.value } })}
                          placeholder="150"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs text-on-surface-variant mb-1 font-bold uppercase tracking-wider">Diet Notes</label>
                      <input
                        type="text"
                        value={form.diet.notes}
                        onChange={(e) => setForm({ ...form, diet: { ...form.diet, notes: e.target.value } })}
                        placeholder="Avoided sugar today"
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Exercises */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Exercises</p>
                      <button
                        type="button"
                        onClick={handleAddExercise}
                        className="text-xs text-primary hover:text-primary-light font-bold uppercase tracking-wider"
                      >
                        + Add Exercise
                      </button>
                    </div>
                    {form.exercisesPerformed.map((ex, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2 mb-2 md:grid-cols-4">
                        <input
                          type="text"
                          value={ex.name}
                          onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                          placeholder="Bench Press"
                          className="bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                        />
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                          placeholder="Sets"
                          className="bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                        />
                        <input
                          type="number"
                          value={ex.reps}
                          onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                          placeholder="Reps"
                          className="bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                        />
                        <input
                          type="number"
                          value={ex.weightKg}
                          onChange={(e) => handleExerciseChange(index, 'weightKg', e.target.value)}
                          placeholder="Weight (kg)"
                          className="bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Trainer notes */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                      Trainer Notes
                    </label>
                    <textarea
                      value={form.trainerNotes}
                      onChange={(e) => setForm({ ...form, trainerNotes: e.target.value })}
                      placeholder="Member is improving on squats..."
                      rows={3}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                    />
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
                      className="flex-1 bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-bold py-3 rounded-kinetic transition-all duration-200 text-sm uppercase tracking-wider shadow-md hover:shadow-primary/30"
                    >
                      Save Progress
                    </button>
                  </div>

                </form>
              </div>
            )}

            {/* Weight chart */}
            {weightChartData.length > 1 && (
              <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-8 mb-6 border border-outline-variant/10">
                <h3 className="text-lg font-bold text-on-surface mb-4 uppercase tracking-widest">Weight Progress</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weightChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999999' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#999999' }} unit="kg" />
                    <Tooltip contentStyle={{ backgroundColor: '#1c1c1c', border: '1px solid #cafd00' }} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#cafd00"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#cafd00' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Progress history */}
            {loading ? (
              <p className="text-on-surface-variant text-sm">Loading...</p>
            ) : progressData.length === 0 ? (
              <div className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-10 text-center border border-outline-variant/10">
                <p className="text-on-surface-variant text-sm">No progress records yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...progressData].reverse().map((record) => (
                  <div key={record._id} className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic p-6 border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/10">
                      <p className="text-sm font-bold text-on-surface">
                        {new Date(record.recordedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                      {record.bmi && (
                        <span className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-kinetic font-bold uppercase tracking-wider">
                          BMI: {record.bmi}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4 md:grid-cols-5">
                      {record.weight && <MiniStat label="Weight" value={`${record.weight} kg`} />}
                      {record.chest  && <MiniStat label="Chest"  value={`${record.chest} cm`} />}
                      {record.waist  && <MiniStat label="Waist"  value={`${record.waist} cm`} />}
                      {record.hips   && <MiniStat label="Hips"   value={`${record.hips} cm`} />}
                    </div>

                    {record.exercisesPerformed?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-on-surface-variant font-bold mb-2 uppercase tracking-widest">Exercises</p>
                        <div className="flex flex-wrap gap-2">
                          {record.exercisesPerformed.map((ex, i) => (
                            <span key={i} className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-kinetic font-bold">
                              {ex.name} — {ex.sets}×{ex.reps} @ {ex.weightKg}kg
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.trainerNotes && (
                      <p className="text-xs text-on-surface-variant bg-surface-container rounded-kinetic px-4 py-3 border border-outline-variant/10">
                        📝 {record.trainerNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-surface-container rounded-kinetic p-3 text-center border border-outline-variant/10">
      <p className="text-xs text-on-surface-variant font-bold mb-1 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-on-surface">{value}</p>
    </div>
  );
}