'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Users, CheckCircle2, XCircle, BookOpen, Plus,
  Trash2, ShieldAlert, Download, Sliders
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'directory' | 'tasks' | 'targets' | 'metadata'>('approvals');
  
  // Data States
  const [students, setStudents] = useState<any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */>([]);
  const [tasks, setTasks] = useState<any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */>([]);
  const [targets, setTargets] = useState<any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<{ courses: Record<string, string[]>, rollNumbersByBatch: Record<string, string[]> }>({ courses: {}, rollNumbersByBatch: {} });
  const [selectedPending, setSelectedPending] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; confirmLabel: string; onConfirm: () => void } | null>(null);

  // Metadata Form States
  const [newCourse, setNewCourse] = useState('');
  const [selectedCourseForBatch, setSelectedCourseForBatch] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [selectedBatchForRoll, setSelectedBatchForRoll] = useState('');
  const [newRoll, setNewRoll] = useState('');


  // Filter States for Student Directory
  const [filterCourse, setFilterCourse] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterRoll, setFilterRoll] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States - Task Creation
  const [taskTitle, setTaskTitle] = useState('');
  const [taskContent, setTaskContent] = useState('');
  const [taskLanguage, setTaskLanguage] = useState('ENGLISH');
  const [taskTargetWpm, setTaskTargetWpm] = useState('40');
  const [taskTargetAccuracy, setTaskTargetAccuracy] = useState('95');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPoints, setTaskPoints] = useState('100');
  const [taskBatches, setTaskBatches] = useState(''); // comma separated

  // Form States - Target Setting
  const [targetBatchName, setTargetBatchName] = useState('');
  const [targetMins, setTargetMins] = useState('5');
  const [targetPenalty, setTargetPenalty] = useState('10');

  // Load Admin Data
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const query = new URLSearchParams();
      if (filterCourse) query.append('course', filterCourse);
      if (filterBatch) query.append('batch', filterBatch);
      if (filterRoll) query.append('roll', filterRoll);
      if (filterStatus) query.append('status', filterStatus);

      const studentsRes = await fetch(`/api/admin/students?${query.toString()}`);
      const studentsData = await studentsRes.json();
      setStudents(studentsData.students || []);

      // 2. Fetch Tasks
      const tasksRes = await fetch('/api/admin/tasks');
      const tasksData = await tasksRes.json();
      setTasks(tasksData.tasks || []);

      // 3. Fetch Targets
      const targetsRes = await fetch('/api/admin/targets');
      const targetsData = await targetsRes.json();
      setTargets(targetsData.targets || []);
      
      // 4. Fetch Metadata
      const metadataRes = await fetch('/api/admin/metadata');
      const metadataData = await metadataRes.json();
      setMetadata({
        courses: metadataData.courses || {},
        rollNumbersByBatch: metadataData.rollNumbersByBatch || {}
      });

    } catch (err) {
      console.error('Error fetching admin details:', err);
      setError('Failed to load administration assets');
    } finally {
      setLoading(false);
    }
  }, [filterCourse, filterBatch, filterRoll, filterStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAdminData();
  }, [loadAdminData]);

  // Update Student Status (Approve/Reject/Suspend)
  const handleUpdateStatus = async (studentId: string, status: string) => {
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        loadAdminData();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to update student state.');
    }
  };

  // Bulk Update Status
  const handleBulkAction = (action: 'APPROVE' | 'REJECT') => {
    if (selectedPending.length === 0) return;

    // Warn before rejecting
    if (action === 'REJECT') {
      setConfirmDialog({
        message: `Reject and delete ${selectedPending.length} user(s)? This cannot be undone.`,
        confirmLabel: 'Delete',
        onConfirm: () => {
          setConfirmDialog(null);
          performBulkAction(action);
        },
      });
      return;
    }

    performBulkAction(action);
  };

  const performBulkAction = async (action: 'APPROVE' | 'REJECT') => {
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/admin/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedPending, action }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setSelectedPending([]);
        loadAdminData();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to perform bulk action.');
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!taskTitle || !taskContent || !taskDeadline || !taskBatches) {
      setError('All task parameters are required.');
      return;
    }

    const batchesArray = taskBatches.split(',').map(b => b.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          textContent: taskContent,
          language: taskLanguage,
          targetWpm: taskTargetWpm,
          targetAccuracy: taskTargetAccuracy,
          deadline: taskDeadline,
          pointsAwardable: taskPoints,
          batches: batchesArray,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Task created successfully and assigned to batch(es).');
        setTaskTitle('');
        setTaskContent('');
        setTaskDeadline('');
        setTaskBatches('');
        loadAdminData();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to deploy task.');
    }
  };

  // Create/Update Batch Target
  const handleUpsertTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!targetBatchName) {
      setError('Batch name is required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: targetBatchName,
          dailyTargetMinutes: targetMins,
          pointsDeduction: targetPenalty,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setTargetBatchName('');
        setTargetMins('5');
        setTargetPenalty('10');
        loadAdminData();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to update target parameters.');
    }
  };

  // Update Metadata
  const handleSaveMetadata = async (newMetadata: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMetadata),
      });
      if (res.ok) {
        setMetadata(newMetadata);
        setMessage('Registration options updated successfully.');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update metadata.');
      }
    } catch {
      setError('Failed to save metadata.');
    }
  };

  // Export CSV Report Client-Side
  const handleExportCSV = async () => {
    setMessage('Compiling report...');
    try {
      const res = await fetch('/api/admin/reports');
      if (!res.ok) throw new Error('Fetch reports failed');
      const data = await res.json();
      const report = data.report || [];

      if (report.length === 0) {
        setError('No student records found to export.');
        setMessage('');
        return;
      }

      // CSV Header
      const headers = [
        'Name',
        'Email',
        'Course',
        'Batch',
        'Roll Number',
        'Status',
        'Points',
        'Total Sessions',
        'Average WPM',
        'Average Accuracy',
        'Total Practice Mins',
        'Task Completions',
        'Join Date'
      ];

      const rows = report.map((r: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.email}"`,
        `"${r.course}"`,
        `"${r.batch}"`,
        `"${r.rollNumber}"`,
        `"${r.status}"`,
        r.points,
        r.totalSessions,
        r.averageWpm,
        r.averageAccuracy,
        r.totalMinutesPracticed,
        r.taskCompletions,
        `"${r.joinDate}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map((row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => row.join(','))].join('\n');
      
      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Student_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage('CSV exported successfully.');
    } catch {
      setError('Failed to export CSV report.');
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-[#111215] text-[#d1d0c5] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6 select-none">
        
        {/* Header Block */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert size={14} />
              Control Panel
            </span>
            <h1 className="text-2xl font-black text-neutral-100 leading-tight">Institute Administration</h1>
            <p className="text-xs text-neutral-500">Manage student directories, pending credentials, assignments, and CSV exports.</p>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-amber-400 hover:border-amber-500/40 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all active:scale-95 shadow-md"
          >
            <Download size={14} />
            Export CSV Report
          </button>
        </section>

        {/* Global Notifications */}
        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-xs font-semibold">
            {message}
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <section className="flex flex-wrap gap-1 border-b border-neutral-900 pb-1">
          {[
            { id: 'approvals', label: 'Pending Approvals', count: students.filter(s => s.status === 'PENDING').length },
            { id: 'directory', label: 'Student Directory', count: students.length },
            { id: 'tasks', label: 'Task Assignments', count: tasks.length },
            { id: 'targets', label: 'Inactivity targets', count: targets.length },
            { id: 'metadata', label: 'Registration Options', count: 0 },

          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)}
              className={`px-4 py-3 text-xs font-bold transition-all relative border-b-2 -mb-[6px] ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </section>

        {/* Sub-view Rendering */}
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-400 border-r-2 border-transparent"></div>
          </div>
        ) : (
          <>
            {/* 1. Pending Approvals View */}
            {activeTab === 'approvals' && (
              <div className="bg-neutral-900/10 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                {students.filter(s => s.status === 'PENDING').length === 0 ? (
                  <div className="p-12 text-center text-sm text-neutral-500 font-medium">
                    No pending registration approvals found.
                  </div>
                ) : (
                  <div className="overflow-x-auto relative">
                    {/* Floating Action Bar */}
                    {selectedPending.length > 0 && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-neutral-900 border border-neutral-700 shadow-xl shadow-black/50 px-4 py-2.5 rounded-xl flex items-center gap-4 animate-in slide-in-from-top-4 fade-in duration-200">
                        <span className="text-xs font-bold text-neutral-300">
                          {selectedPending.length} selected
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBulkAction('APPROVE')}
                            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                          >
                            <CheckCircle2 size={14} />
                            Bulk Approve
                          </button>
                          <button
                            onClick={() => handleBulkAction('REJECT')}
                            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-neutral-950 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                          >
                            <Trash2 size={14} />
                            Bulk Reject
                          </button>
                        </div>
                      </div>
                    )}
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-neutral-800/80 bg-neutral-950/20 text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                          <th className="py-4 px-6 w-10">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-950 cursor-pointer"
                              checked={
                                students.filter(s => s.status === 'PENDING').length > 0 &&
                                selectedPending.length === students.filter(s => s.status === 'PENDING').length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPending(students.filter(s => s.status === 'PENDING').map(s => s.id));
                                } else {
                                  setSelectedPending([]);
                                }
                              }}
                            />
                          </th>
                          <th className="py-4 px-6">Student Name</th>
                          <th className="py-4 px-6">Email Address</th>
                          <th className="py-4 px-6">Course</th>
                          <th className="py-4 px-6">Batch</th>
                          <th className="py-4 px-6">Roll Number</th>
                          <th className="py-4 px-6 text-right pr-6 w-52">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/60">
                        {students.filter(s => s.status === 'PENDING').map((student) => (
                          <tr key={student.id} className={`hover:bg-neutral-900/10 transition-colors ${selectedPending.includes(student.id) ? 'bg-amber-500/5' : ''}`}>
                            <td className="py-4 px-6">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-950 cursor-pointer"
                                checked={selectedPending.includes(student.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPending(prev => [...prev, student.id]);
                                  } else {
                                    setSelectedPending(prev => prev.filter(id => id !== student.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="py-4 px-6 font-bold text-neutral-200">{student.name}</td>
                            <td className="py-4 px-6 text-neutral-400">{student.email}</td>
                            <td className="py-4 px-6 text-neutral-400">{student.courseName}</td>
                            <td className="py-4 px-6 text-neutral-400 font-mono">{student.batchName}</td>
                            <td className="py-4 px-6 text-neutral-400 font-mono">{student.rollNumber}</td>
                            <td className="py-4 px-6 text-right pr-6 flex gap-2 justify-end">
                              <button
                                onClick={() => handleUpdateStatus(student.id, 'APPROVED')}
                                className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-neutral-950 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                              >
                                <CheckCircle2 size={12} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(student.id, 'REJECTED')}
                                className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-neutral-950 border border-red-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                              >
                                <XCircle size={12} />
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. Student Directory View */}
            {activeTab === 'directory' && (
              <div className="flex flex-col gap-4">
                {/* Search & Filter bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900/40 p-4 rounded-xl border border-neutral-800/80 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Course Filter</label>
                    <input
                      type="text"
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                      placeholder="e.g. Web Dev"
                      className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 focus:outline-hidden focus:border-amber-500/40"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Batch Filter</label>
                    <input
                      type="text"
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      placeholder="e.g. Batch-A"
                      className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 focus:outline-hidden focus:border-amber-500/40"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Roll Filter</label>
                    <input
                      type="text"
                      value={filterRoll}
                      onChange={(e) => setFilterRoll(e.target.value)}
                      placeholder="e.g. IT-102"
                      className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 focus:outline-hidden focus:border-amber-500/40"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Status Filter</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 focus:outline-hidden focus:border-amber-500/40 font-semibold"
                    >
                      <option value="">All Statuses</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PENDING">Pending</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Directory Table */}
                <div className="bg-neutral-900/10 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                  {students.length === 0 ? (
                    <div className="p-12 text-center text-sm text-neutral-500 font-medium">
                      No matching student accounts found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-neutral-800/80 bg-neutral-950/20 text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                            <th className="py-4 px-6">Student Name</th>
                            <th className="py-4 px-6">Course / Batch / Roll</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6 font-mono">Score</th>
                            <th className="py-4 px-6 text-right pr-6 w-44">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900/60">
                          {students.map((student) => (
                            <tr key={student.id} className="hover:bg-neutral-900/10 transition-colors">
                              <td className="py-4 px-6">
                                <div className="font-bold text-neutral-200">{student.name}</div>
                                <div className="text-[10px] text-neutral-500 mt-0.5">{student.email}</div>
                              </td>
                              <td className="py-4 px-6 text-neutral-400">
                                {student.courseName} | <strong className="text-neutral-300 font-mono text-[11px]">{student.batchName}</strong> | <strong className="text-neutral-300 font-mono text-[11px]">{student.rollNumber}</strong>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold tracking-wider ${
                                  student.status === 'APPROVED'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : student.status === 'PENDING'
                                      ? 'bg-amber-500/10 text-amber-400'
                                      : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {student.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-mono font-bold text-amber-500">{student.points} pts</td>
                              <td className="py-4 px-6 text-right pr-6">
                                {student.status === 'APPROVED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(student.id, 'SUSPENDED')}
                                    className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-neutral-950 border border-red-500/20 px-2 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all active:scale-95"
                                  >
                                    Suspend
                                  </button>
                                )}
                                {student.status === 'SUSPENDED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(student.id, 'APPROVED')}
                                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-neutral-950 border border-emerald-500/20 px-2 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all active:scale-95"
                                  >
                                    Unsuspend
                                  </button>
                                )}
                                {student.status === 'PENDING' && (
                                  <span className="text-[10px] text-neutral-500 italic">Approve in pending tab</span>
                                )}
                                {student.status === 'REJECTED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(student.id, 'APPROVED')}
                                    className="bg-neutral-850 hover:bg-neutral-800 text-neutral-400 px-2 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all active:scale-95"
                                  >
                                    Approve Profile
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Tasks Management View */}
            {activeTab === 'tasks' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Creation Form */}
                <div className="md:col-span-1 bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 h-max flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-neutral-200 border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                    <Plus size={16} className="text-amber-500" />
                    Deploy New Assignment
                  </h3>

                  <form onSubmit={handleCreateTask} className="flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Assignment Title</label>
                      <input
                        type="text"
                        required
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="e.g. Mid-term speed test"
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Language Mode</label>
                      <select
                        value={taskLanguage}
                        onChange={(e) => setTaskLanguage(e.target.value)}
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40 font-bold"
                      >
                        <option value="ENGLISH">English</option>
                        <option value="BANGLA">বাংলা (Bangla)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Min Speed (WPM)</label>
                        <input
                          type="number"
                          required
                          value={taskTargetWpm}
                          onChange={(e) => setTaskTargetWpm(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40 font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Min Accuracy (%)</label>
                        <input
                          type="number"
                          required
                          value={taskTargetAccuracy}
                          onChange={(e) => setTaskTargetAccuracy(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Target Batch(es) (comma separated)</label>
                      <input
                        type="text"
                        required
                        value={taskBatches}
                        onChange={(e) => setTaskBatches(e.target.value)}
                        placeholder="e.g. Batch-2026-A, Batch-A"
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Points Rewardable</label>
                        <input
                          type="number"
                          value={taskPoints}
                          onChange={(e) => setTaskPoints(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40 font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Deadline</label>
                        <input
                          type="datetime-local"
                          required
                          value={taskDeadline}
                          onChange={(e) => setTaskDeadline(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 focus:outline-hidden focus:border-amber-500/40 text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Typing Text Content</label>
                      <textarea
                        required
                        value={taskContent}
                        onChange={(e) => setTaskContent(e.target.value)}
                        rows={4}
                        placeholder="Paste the custom text students must type..."
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40 leading-relaxed font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Publish Task
                    </button>
                  </form>
                </div>

                {/* Active Tasks list */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-neutral-200 border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                    <BookOpen size={16} className="text-amber-500" />
                    Published Tasks & Submissions
                  </h3>

                  {tasks.length === 0 ? (
                    <div className="bg-neutral-900/10 border border-neutral-800 p-8 rounded-2xl text-center text-sm text-neutral-500">
                      No published typing assignments found. Use the creation panel to add one.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {tasks.map((task) => (
                        <div key={task.id} className="p-4 rounded-xl border border-neutral-800 bg-[#1d1e22]/10 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-neutral-200">{task.title}</h4>
                              <p className="text-[11px] text-neutral-500 mt-1 max-w-lg leading-relaxed truncate">
                                Text: {task.textContent}
                              </p>
                            </div>
                            <span className="text-[9px] bg-neutral-950 text-neutral-400 px-2 py-0.5 rounded border border-neutral-900 font-bold uppercase tracking-wider font-mono">
                              {task.language}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-neutral-800/40 pt-3 text-neutral-500">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span>Target: <strong className="text-neutral-300 font-mono">{task.targetWpm} WPM / {task.targetAccuracy}% Acc</strong></span>
                              <span>Batches: <strong className="text-neutral-300 font-mono">{task.batches.join(', ') || 'None'}</strong></span>
                              <span>Reward: <strong className="text-neutral-300 font-mono">+{task.pointsAwardable} pts</strong></span>
                              <span>Completions: <strong className="text-amber-400 font-mono font-bold">{task.completionsCount}</strong></span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-medium">
                              Deadline: {new Date(task.deadline).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Inactivity Targets View */}
            {activeTab === 'targets' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form to upsert */}
                <div className="md:col-span-1 bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 h-max flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-neutral-200 border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                    <Sliders size={16} className="text-amber-500" />
                    Configure Batch Rules
                  </h3>

                  <form onSubmit={handleUpsertTarget} className="flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Batch Name</label>
                      <input
                        type="text"
                        required
                        value={targetBatchName}
                        onChange={(e) => setTargetBatchName(e.target.value)}
                        placeholder="e.g. Batch-2026-A"
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Daily Target (Minutes)</label>
                      <input
                        type="number"
                        required
                        value={targetMins}
                        onChange={(e) => setTargetMins(e.target.value)}
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40 font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Daily Inactivity Penalty (Points)</label>
                      <input
                        type="number"
                        required
                        value={targetPenalty}
                        onChange={(e) => setTargetPenalty(e.target.value)}
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2.5 focus:outline-hidden focus:border-amber-500/40 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Save Rule
                    </button>
                  </form>
                </div>

                {/* Targets List */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-neutral-200 border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                    <Sliders size={16} className="text-amber-500" />
                    Configured Batch Targets
                  </h3>

                  {targets.length === 0 ? (
                    <div className="bg-neutral-900/10 border border-neutral-800 p-8 rounded-2xl text-center text-sm text-neutral-500 font-medium">
                      No custom targets configured yet. (Default: 5 minutes goal, -10 points daily penalty).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {targets.map((t) => (
                        <div 
                          key={t.id} 
                          className="p-4 rounded-xl border border-neutral-800 bg-[#1d1e22]/10 flex flex-col justify-between gap-2"
                        >
                          <div className="flex justify-between items-start border-b border-neutral-900 pb-2">
                            <span className="font-bold text-sm text-neutral-200 font-mono">{t.batchName}</span>
                            <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/10 px-1.5 py-0.5 rounded font-bold font-mono">
                              -{t.pointsDeduction} pts/day
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1 font-semibold">
                            <Sliders size={12} className="text-amber-500" />
                            Daily Practice Target: <strong className="text-neutral-200 font-mono">{t.dailyTargetMinutes} mins</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Metadata/Selectors Management View */}
            {activeTab === 'metadata' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Course & Batch Management */}
                <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 flex flex-col gap-6">
                  <h3 className="text-sm font-bold text-neutral-200 border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                    <BookOpen size={16} className="text-amber-500" />
                    Courses & Batches
                  </h3>
                  
                  {/* Add Course */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCourse}
                      onChange={(e) => setNewCourse(e.target.value)}
                      placeholder="New Course Name..."
                      className="flex-1 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-amber-500/40"
                    />
                    <button
                      onClick={() => {
                        if (!newCourse.trim()) return;
                        if (metadata.courses[newCourse.trim()]) {
                          setError('Course already exists');
                          return;
                        }
                        handleSaveMetadata({
                          ...metadata,
                          courses: { ...metadata.courses, [newCourse.trim()]: [] }
                        });
                        setNewCourse('');
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      Add Course
                    </button>
                  </div>

                  {/* Add Batch to Course */}
                  <div className="flex flex-col gap-2 p-4 border border-neutral-800 rounded-xl bg-neutral-950/50">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Add Batch to Course</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedCourseForBatch}
                        onChange={(e) => setSelectedCourseForBatch(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-amber-500/40"
                      >
                        <option value="">Select Course...</option>
                        {Object.keys(metadata.courses).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newBatch}
                        onChange={(e) => setNewBatch(e.target.value)}
                        placeholder="New Batch Name..."
                        className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-amber-500/40"
                      />
                      <button
                        onClick={() => {
                          if (!selectedCourseForBatch || !newBatch.trim()) return;
                          const currentBatches = metadata.courses[selectedCourseForBatch] || [];
                          if (currentBatches.includes(newBatch.trim())) {
                            setError('Batch already exists in this course');
                            return;
                          }
                          handleSaveMetadata({
                            ...metadata,
                            courses: {
                              ...metadata.courses,
                              [selectedCourseForBatch]: [...currentBatches, newBatch.trim()]
                            }
                          });
                          setNewBatch('');
                        }}
                        className="bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-neutral-950 border border-amber-500/20 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        Add Batch
                      </button>
                    </div>
                  </div>

                  {/* List Courses & Batches */}
                  <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {Object.keys(metadata.courses).length === 0 ? (
                      <div className="text-center text-xs text-neutral-500 py-4">No courses configured.</div>
                    ) : (
                      Object.entries(metadata.courses).map(([course, batches]) => (
                        <div key={course} className="flex flex-col gap-2 p-3 rounded-xl border border-neutral-800 bg-neutral-900/40">
                          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                            <span className="font-bold text-sm text-neutral-200">{course}</span>
                            <button
                              onClick={() => {
                                const newCourses = { ...metadata.courses };
                                delete newCourses[course];
                                handleSaveMetadata({ ...metadata, courses: newCourses });
                              }}
                              className="text-red-400 hover:text-red-300 bg-red-400/10 p-1.5 rounded-lg transition-colors"
                              title="Delete Course"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {batches.length === 0 ? (
                              <span className="text-xs text-neutral-600 italic">No batches yet.</span>
                            ) : (
                              batches.map(batch => (
                                <div key={batch} className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-md border border-neutral-800 text-xs font-mono text-neutral-400">
                                  {batch}
                                  <button
                                    onClick={() => {
                                      const updatedBatches = batches.filter(b => b !== batch);
                                      handleSaveMetadata({
                                        ...metadata,
                                        courses: { ...metadata.courses, [course]: updatedBatches }
                                      });
                                    }}
                                    className="text-neutral-500 hover:text-red-400 ml-1"
                                  >
                                    <XCircle size={12} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Roll Numbers Management */}
                <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 flex flex-col gap-6">
                  <h3 className="text-sm font-bold text-neutral-200 border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                    <Users size={16} className="text-amber-500" />
                    Allowed Roll Numbers by Batch
                  </h3>
                  
                  {/* Select Batch for Rolls */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Select Batch to Manage Rolls</span>
                    <select
                      value={selectedBatchForRoll}
                      onChange={(e) => setSelectedBatchForRoll(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-amber-500/40"
                    >
                      <option value="">-- Select a Batch --</option>
                      {Object.values(metadata.courses).flat().map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {selectedBatchForRoll && (
                    <>
                      {/* Add Roll */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newRoll}
                          onChange={(e) => setNewRoll(e.target.value)}
                          placeholder="e.g. IT-101 (comma separate for multiple)"
                          className="flex-1 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-amber-500/40 font-mono"
                        />
                        <button
                          onClick={() => {
                            if (!newRoll.trim()) return;
                            const rollsToAdd = newRoll.split(',').map(r => r.trim()).filter(Boolean);
                            const currentRolls = metadata.rollNumbersByBatch[selectedBatchForRoll] || [];
                            const uniqueNewRolls = rollsToAdd.filter(r => !currentRolls.includes(r));
                            if (uniqueNewRolls.length === 0) {
                              setError('Roll number(s) already exist in this batch');
                              return;
                            }
                            handleSaveMetadata({
                              ...metadata,
                              rollNumbersByBatch: {
                                ...metadata.rollNumbersByBatch,
                                [selectedBatchForRoll]: [...currentRolls, ...uniqueNewRolls].sort()
                              }
                            });
                            setNewRoll('');
                          }}
                          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        >
                          Add Roll(s)
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Total Roll Numbers: {(metadata.rollNumbersByBatch[selectedBatchForRoll] || []).length}</span>
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              message: 'Clear all roll numbers for this batch? This cannot be undone.',
                              confirmLabel: 'Clear All',
                              onConfirm: () => {
                                setConfirmDialog(null);
                                handleSaveMetadata({
                                  ...metadata,
                                  rollNumbersByBatch: {
                                    ...metadata.rollNumbersByBatch,
                                    [selectedBatchForRoll]: []
                                  }
                                });
                              },
                            });
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider"
                        >
                          Clear All
                        </button>
                      </div>

                      {/* List Rolls */}
                      <div className="flex flex-wrap gap-2 max-h-[500px] overflow-y-auto pr-2">
                        {!(metadata.rollNumbersByBatch[selectedBatchForRoll] || []).length ? (
                          <div className="text-center text-xs text-neutral-500 py-4 w-full">No roll numbers configured for this batch.</div>
                        ) : (
                          (metadata.rollNumbersByBatch[selectedBatchForRoll] || []).map(roll => (
                            <div key={roll} className="flex items-center gap-1.5 bg-neutral-900/50 px-2.5 py-1.5 rounded-md border border-neutral-800 text-xs font-mono text-neutral-300">
                              {roll}
                              <button
                                onClick={() => {
                                  const currentRolls = metadata.rollNumbersByBatch[selectedBatchForRoll] || [];
                                  handleSaveMetadata({
                                    ...metadata,
                                    rollNumbersByBatch: {
                                      ...metadata.rollNumbersByBatch,
                                      [selectedBatchForRoll]: currentRolls.filter(r => r !== roll)
                                    }
                                  });
                                }}
                                className="text-neutral-500 hover:text-red-400 ml-1"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}
          </>
        )}

      </main>

      <ConfirmDialog
        open={!!confirmDialog}
        message={confirmDialog?.message ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Confirm'}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
