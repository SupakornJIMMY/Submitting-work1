import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, CheckCircle, Database, Plus, Edit, Trash2, Filter, 
  ExternalLink, MessageSquare, RefreshCw, LogOut, Check, X, 
  Search, FileSpreadsheet, PlusCircle, AlertTriangle, User, 
  BookOpen, Folder, Settings, ShieldCheck, Download, Calendar, 
  Activity, Info
} from 'lucide-react';
import { ClassRoom, Student, Assignment, Submission, SubmissionStatus, SystemConfig } from '../types';

interface TeacherPortalProps {
  classes: ClassRoom[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  config: SystemConfig;
  onUpdateConfig: (newConfig: Partial<SystemConfig>) => void;
  onAddClass: (name: string) => Promise<{ success: boolean; id?: string }>;
  onEditClass: (id: string, name: string) => Promise<{ success: boolean }>;
  onDeleteClass: (id: string) => Promise<{ success: boolean }>;
  onAddStudent: (studentId: string, name: string, classId: string) => Promise<{ success: boolean; id?: string }>;
  onEditStudent: (id: string, studentId: string, name: string, classId: string) => Promise<{ success: boolean }>;
  onDeleteStudent: (id: string) => Promise<{ success: boolean }>;
  onAddAssignment: (title: string, description: string, dueDate: string) => Promise<{ success: boolean; id?: string }>;
  onEditAssignment: (id: string, title: string, description: string, dueDate: string) => Promise<{ success: boolean }>;
  onDeleteAssignment: (id: string) => Promise<{ success: boolean }>;
  onUpdateSubmissionStatus: (submissionId: string, status: SubmissionStatus, remarks: string) => Promise<{ success: boolean }>;
  onSyncData: () => Promise<boolean>;
  syncError?: string | null;
}

export default function TeacherPortal({
  classes,
  students,
  assignments,
  submissions,
  config,
  onUpdateConfig,
  onAddClass,
  onEditClass,
  onDeleteClass,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onUpdateSubmissionStatus,
  onSyncData,
  syncError
}: TeacherPortalProps) {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const defaultPasscode = '1234'; // Default passcode displayed for convenience

  // Dashboard Sub-navigation tabs: 'submissions' | 'classes' | 'students' | 'assignments' | 'config'
  const [activeTab, setActiveTab] = useState<'submissions' | 'classes' | 'students' | 'assignments' | 'config'>('submissions');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  // Filter States for Submissions
  const [filterClass, setFilterClass] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Editing Submissions Status
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [tempStatus, setTempStatus] = useState<SubmissionStatus>('ส่งแล้ว');
  const [tempRemarks, setTempRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Manage Classes States
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classNameInput, setClassNameInput] = useState('');

  // Manage Students States
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentNoInput, setStudentNoInput] = useState('');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentClassIdInput, setStudentClassIdInput] = useState('');

  // Manage Assignments States
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [assignmentTitleInput, setAssignmentTitleInput] = useState('');
  const [assignmentDescInput, setAssignmentDescInput] = useState('');
  const [assignmentDueDateInput, setAssignmentDueDateInput] = useState('');

  // Local config settings
  const [inputUrl, setInputUrl] = useState(config.appsScriptUrl);

  // Update local input state if config changes from outer components
  useEffect(() => {
    setInputUrl(config.appsScriptUrl);
  }, [config.appsScriptUrl]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === defaultPasscode || passcode === 'admin1234') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Sync database with sheets
  const handleSync = async () => {
    if (!config.appsScriptUrl) {
      alert('กรุณาเชื่อมโยงสคริปต์ Google Apps Script ก่อนทำการซิงก์ข้อมูล');
      setActiveTab('config');
      return;
    }
    setIsSyncing(true);
    setSyncSuccess(null);
    try {
      const ok = await onSyncData();
      setSyncSuccess(ok);
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch {
      setSyncSuccess(false);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Apps Script Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      appsScriptUrl: inputUrl,
      isDemoMode: inputUrl.trim() === ''
    });
    alert(inputUrl.trim() === '' 
      ? 'เปลี่ยนเป็นโหมดจำลองทดสอบเรียบร้อย (บันทึกข้อมูลไว้ในเครื่องชั่วคราว)' 
      : 'บันทึก URL การเชื่อมต่อสำเร็จ ระบบจะดึงข้อมูลจริงจาก Google Sheets'
    );
  };

  // Export submissions to CSV (Client-side Export)
  const exportToCSV = () => {
    if (submissions.length === 0) {
      alert('ไม่มีข้อมูลงานที่ส่งในขณะนี้');
      return;
    }

    // Thai characters need BOM for proper Excel compatibility
    const headers = ['รหัสส่งงาน', 'เลขที่', 'ชื่อ-นามสกุล', 'ห้องเรียน', 'ชื่องาน', 'วันที่ส่ง', 'สถานะ', 'ลิงก์ไฟล์งาน', 'หมายเหตุ'];
    const rows = submissions.map(sub => [
      sub.id,
      sub.studentNo,
      sub.studentName,
      sub.className,
      sub.assignmentTitle,
      sub.submissionDate,
      sub.status,
      sub.fileUrl,
      sub.remarks
    ]);

    const csvContent = 
      '\uFEFF' + // UTF-8 BOM
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานการส่งงาน_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Submissions list
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchClass = filterClass === '' || sub.className === filterClass;
      const matchAssignment = filterAssignment === '' || sub.assignmentTitle === filterAssignment;
      const matchStatus = filterStatus === '' || sub.status === filterStatus;
      const matchSearch = filterSearch === '' || 
        sub.studentName.toLowerCase().includes(filterSearch.toLowerCase()) ||
        sub.id.toLowerCase().includes(filterSearch.toLowerCase());
      return matchClass && matchAssignment && matchStatus && matchSearch;
    }).sort((a, b) => b.submissionDate.localeCompare(a.submissionDate));
  }, [submissions, filterClass, filterAssignment, filterStatus, filterSearch]);

  // Open Edit Submission remarks/status modal
  const openEditStatus = (sub: Submission) => {
    setSelectedSubmission(sub);
    setTempStatus(sub.status);
    setTempRemarks(sub.remarks || '');
  };

  // Save Submission edit
  const handleSaveSubmissionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setIsUpdatingStatus(true);
    try {
      const res = await onUpdateSubmissionStatus(selectedSubmission.id, tempStatus, tempRemarks);
      if (res.success) {
        setSelectedSubmission(null);
      } else {
        alert('เกิดข้อผิดพลาดในการปรับปรุงข้อมูล');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Classes operations
  const openClassModal = (id: string | null = null) => {
    if (id) {
      const cls = classes.find(c => c.id === id);
      if (cls) {
        setEditingClassId(id);
        setClassNameInput(cls.name);
      }
    } else {
      setEditingClassId(null);
      setClassNameInput('');
    }
    setIsClassModalOpen(true);
  };

  const handleClassSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (classNameInput.trim() === '') return;

    if (editingClassId) {
      const res = await onEditClass(editingClassId, classNameInput.trim());
      if (res.success) setIsClassModalOpen(false);
    } else {
      const res = await onAddClass(classNameInput.trim());
      if (res.success) setIsClassModalOpen(false);
    }
  };

  const handleClassDelete = async (id: string) => {
    if (confirm('ยืนยันที่จะลบห้องเรียนนี้? การลบห้องเรียนจะทำให้รายชื่อนักเรียนในห้องนี้ไม่แสดงผลในบางส่วน')) {
      await onDeleteClass(id);
    }
  };

  // Students operations
  const openStudentModal = (id: string | null = null) => {
    if (id) {
      const std = students.find(s => s.id === id);
      if (std) {
        setEditingStudentId(id);
        setStudentNoInput(std.studentId);
        setStudentNameInput(std.name);
        setStudentClassIdInput(std.classId);
      }
    } else {
      setEditingStudentId(null);
      setStudentNoInput('');
      setStudentNameInput('');
      setStudentClassIdInput(classes[0]?.id || '');
    }
    setIsStudentModalOpen(true);
  };

  const handleStudentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentNameInput.trim() === '' || studentNoInput.trim() === '' || !studentClassIdInput) return;

    if (editingStudentId) {
      const res = await onEditStudent(editingStudentId, studentNoInput.trim(), studentNameInput.trim(), studentClassIdInput);
      if (res.success) setIsStudentModalOpen(false);
    } else {
      const res = await onAddStudent(studentNoInput.trim(), studentNameInput.trim(), studentClassIdInput);
      if (res.success) setIsStudentModalOpen(false);
    }
  };

  const handleStudentDelete = async (id: string) => {
    if (confirm('คุณต้องการลบรายชื่อนักเรียนคนนี้ออกจากระบบใช่หรือไม่?')) {
      await onDeleteStudent(id);
    }
  };

  // Assignments operations
  const openAssignmentModal = (id: string | null = null) => {
    if (id) {
      const asm = assignments.find(a => a.id === id);
      if (asm) {
        setEditingAssignmentId(id);
        setAssignmentTitleInput(asm.title);
        setAssignmentDescInput(asm.description);
        setAssignmentDueDateInput(asm.dueDate);
      }
    } else {
      setEditingAssignmentId(null);
      setAssignmentTitleInput('');
      setAssignmentDescInput('');
      setAssignmentDueDateInput(new Date().toISOString().split('T')[0]);
    }
    setIsAssignmentModalOpen(true);
  };

  const handleAssignmentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignmentTitleInput.trim() === '' || assignmentDueDateInput.trim() === '') return;

    if (editingAssignmentId) {
      const res = await onEditAssignment(editingAssignmentId, assignmentTitleInput.trim(), assignmentDescInput.trim(), assignmentDueDateInput);
      if (res.success) setIsAssignmentModalOpen(false);
    } else {
      const res = await onAddAssignment(assignmentTitleInput.trim(), assignmentDescInput.trim(), assignmentDueDateInput);
      if (res.success) setIsAssignmentModalOpen(false);
    }
  };

  const handleAssignmentDelete = async (id: string) => {
    if (confirm('คุณแน่ใจว่าต้องการลบรายการงานนี้ออก?')) {
      await onDeleteAssignment(id);
    }
  };

  const getStatusStyle = (status: SubmissionStatus) => {
    switch (status) {
      case 'ยังไม่ส่ง': return 'bg-rose-50 border-rose-100 text-rose-700';
      case 'ส่งแล้ว': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'รอตรวจ': return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'ตรวจแล้ว': return 'bg-sky-50 border-sky-100 text-sky-700';
      case 'ต้องแก้ไข': return 'bg-orange-50 border-orange-100 text-orange-700';
    }
  };

  // Display passcode-based authentication gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200/50 p-8 shadow-polished font-sans">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100/60">
            <Lock size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-display">ระบบควบคุมสำหรับครูผู้สอน</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">กรุณากรอกรหัสครูเพื่อเข้าสู่ระบบแดชบอร์ดหลังบ้าน</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="passcode" className="block text-xs font-semibold text-slate-500">
              รหัสผ่านคุณครู (รหัสผ่านเริ่มต้นคือ <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50">1234</span>)
            </label>
            <input
              type="password"
              id="passcode"
              placeholder="กรอกรหัสผ่าน..."
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all text-center tracking-widest font-mono font-semibold"
              required
              style={{ minHeight: '44px' }}
            />
          </div>

          {authError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50/50 p-3 rounded-xl border border-rose-100/80 animate-pulse">
              <AlertTriangle size={14} className="shrink-0 text-rose-500" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold py-3 rounded-xl text-xs transition-all shadow-sm hover:shadow cursor-pointer"
            style={{ minHeight: '44px' }}
            id="btn-teacher-login"
          >
            ยืนยันเข้าระบบ
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-[10px] text-slate-400 leading-relaxed">
          ความปลอดภัยสูง ข้อมูลทั้งหมดถูกเชื่อมโยงและสำรองผ่านฐานข้อมูลหลัก Google Cloud และ Google Spreadsheet
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-sans space-y-6">
      
      {/* Header and sync panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/50 p-5 shadow-polished">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/55 shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 font-display">แผงควบคุมคุณครู (Teacher Admin Dashboard)</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                config.isDemoMode 
                  ? 'bg-amber-50 border-amber-100 text-amber-700' 
                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                {config.isDemoMode ? 'โหมดทดลอง' : 'เชื่อมต่อ Sheets แล้ว'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">ยินดีต้อนรับอาจารย์ คุณสามารถควบคุม จัดการคะแนน และดูงานส่งได้แบบเรียลไทม์</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          {!config.isDemoMode && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-55 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              style={{ minHeight: '38px' }}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูล Sheets'}</span>
            </button>
          )}

          <button
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100/80 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            style={{ minHeight: '38px' }}
          >
            <LogOut size={14} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Sync result notification */}
      {syncSuccess !== null && (
        <div className={`p-4 rounded-xl text-xs border flex flex-col gap-1.5 ${
          syncSuccess 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          <div className="flex items-center gap-2 font-semibold">
            {syncSuccess ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{syncSuccess ? 'ซิงก์ข้อมูลจาก Google Sheets และ Google Drive เรียบร้อยแล้ว ข้อมูลเป็นปัจจุบันที่สุด!' : 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets'}</span>
          </div>
          {!syncSuccess && (
            <p className="text-[11px] opacity-90 pl-6 leading-relaxed">
              {syncError || 'โปรดตรวจสอบให้แน่ใจว่า URL ถูกต้องและมีสิทธิ์การเข้าถึงแบบสาธารณะ'}
            </p>
          )}
        </div>
      )}

      {/* Main Dashboard Navigation tabs */}
      <div className="flex flex-wrap border-b border-slate-100 gap-1 overflow-x-auto pb-1">
        {[
          { key: 'submissions', label: 'รายการงานที่ส่งเข้ามา', icon: Folder },
          { key: 'classes', label: 'จัดการห้องเรียน', icon: Info },
          { key: 'students', label: 'จัดการรายชื่อนักเรียน', icon: User },
          { key: 'assignments', label: 'จัดการรายการงาน', icon: BookOpen },
          { key: 'config', label: 'เชื่อมต่อระบบ (Sheets/Drive)', icon: Settings },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/15'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200'
              }`}
              style={{ minHeight: '44px' }}
            >
              <TabIcon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div>
        <AnimatePresence mode="wait">
          
          {/* TAB 1: SUBMISSIONS PANEL */}
          {activeTab === 'submissions' && (
            <motion.div
              key="submissions-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Filter tools */}
              <div className="bg-white rounded-2xl border border-slate-200/50 p-4 shadow-polished grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                {/* Search */}
                <div className="space-y-1.5">
                  <label htmlFor="search-input" className="block text-[10px] font-semibold text-slate-500">ค้นหานักเรียน / รหัสส่งงาน</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      id="search-input"
                      placeholder="ใส่ชื่อหรือรหัส..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Filter Class */}
                <div className="space-y-1.5">
                  <label htmlFor="filter-class-select" className="block text-[10px] font-semibold text-slate-500">กรองห้องเรียน</label>
                  <select
                    id="filter-class-select"
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none cursor-pointer transition-all"
                    style={{ minHeight: '34px' }}
                  >
                    <option value="">ทั้งหมด</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {/* Filter Assignment */}
                <div className="space-y-1.5">
                  <label htmlFor="filter-assignment-select" className="block text-[10px] font-semibold text-slate-500">กรองชิ้นงาน</label>
                  <select
                    id="filter-assignment-select"
                    value={filterAssignment}
                    onChange={(e) => setFilterAssignment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none cursor-pointer transition-all"
                    style={{ minHeight: '34px' }}
                  >
                    <option value="">ทั้งหมด</option>
                    {assignments.map(a => <option key={a.id} value={a.title}>{a.title}</option>)}
                  </select>
                </div>

                {/* Filter Status */}
                <div className="space-y-1.5">
                  <label htmlFor="filter-status-select" className="block text-[10px] font-semibold text-slate-500">กรองสถานะ</label>
                  <select
                    id="filter-status-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none cursor-pointer transition-all"
                    style={{ minHeight: '34px' }}
                  >
                    <option value="">ทั้งหมด</option>
                    <option value="ส่งแล้ว">ส่งแล้ว</option>
                    <option value="รอตรวจ">รอตรวจ</option>
                    <option value="ตรวจแล้ว">ตรวจแล้ว</option>
                    <option value="ต้องแก้ไข">ต้องแก้ไข</option>
                  </select>
                </div>

                {/* Export Buttons */}
                <div className="flex gap-1.5">
                  <button
                    onClick={exportToCSV}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-150 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    style={{ minHeight: '34px' }}
                  >
                    <Download size={13} />
                    <span>ดึงรายงาน CSV</span>
                  </button>

                  {!config.isDemoMode && (
                    <a
                      href={config.appsScriptUrl.replace('/exec', '')}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center p-2 bg-indigo-50/55 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-100/60 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      title="เปิดใน Google Sheets"
                      style={{ minHeight: '34px' }}
                    >
                      <FileSpreadsheet size={15} />
                    </a>
                  )}
                </div>
              </div>

              {/* Submissions Table / Cards */}
              <div className="bg-white rounded-2xl border border-slate-200/50 shadow-polished overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                        <th className="py-3.5 px-4 font-mono">เลขที่ / ห้องเรียน</th>
                        <th className="py-3.5 px-4">นักเรียน</th>
                        <th className="py-3.5 px-4">งานที่ส่ง</th>
                        <th className="py-3.5 px-4 font-mono">วันที่ส่ง</th>
                        <th className="py-3.5 px-4">สถานะ</th>
                        <th className="py-3.5 px-4">ลิงก์ไฟล์</th>
                        <th className="py-3.5 px-4 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400 italic font-medium">
                            (ไม่พบข้อมูลงานที่ส่งเข้ามาตามตัวกรองในขณะนี้)
                          </td>
                        </tr>
                      ) : (
                        filteredSubmissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-800">เลขที่ {sub.studentNo}</span>
                              <div className="text-[10px] text-slate-400 mt-0.5">{sub.className}</div>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-900">{sub.studentName}</td>
                            <td className="py-3.5 px-4 max-w-[180px]">
                              <div className="truncate font-semibold text-slate-800" title={sub.assignmentTitle}>{sub.assignmentTitle}</div>
                              {sub.remarks && (
                                <div className="text-[10px] text-slate-500 truncate max-w-[160px] flex items-center gap-1 mt-0.5">
                                  <MessageSquare size={10} className="shrink-0 text-indigo-500" />
                                  <span>หมายเหตุ: "{sub.remarks}"</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[10px] text-slate-400 font-mono">{sub.submissionDate}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(sub.status)}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {sub.fileUrl && sub.fileUrl.startsWith('http') ? (
                                <a
                                  href={sub.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                                >
                                  <span>เปิดลิงก์</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">(ไฟล์ตัวอย่าง)</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => openEditStatus(sub)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                                style={{ minHeight: '30px' }}
                              >
                                ตรวจงาน / แก้ไข
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: CLASSES MANAGEMENT */}
          {activeTab === 'classes' && (
            <motion.div
              key="classes-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 font-display">รายชื่อห้องเรียนทั้งหมด ({classes.length} ห้อง)</h3>
                <button
                  onClick={() => openClassModal()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  style={{ minHeight: '36px' }}
                >
                  <Plus size={14} />
                  <span>เพิ่มห้องเรียนใหม่</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/50 shadow-polished overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-4 font-mono">รหัสห้องเรียน (ID)</th>
                      <th className="py-3.5 px-4">ชื่อห้องเรียน</th>
                      <th className="py-3.5 px-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-400">{cls.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{cls.name}</td>
                        <td className="py-3.5 px-4 text-center flex justify-center gap-2">
                          <button
                            onClick={() => openClassModal(cls.id)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/40 transition-all cursor-pointer"
                            title="แก้ไขห้องเรียน"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleClassDelete(cls.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100/40 transition-all cursor-pointer"
                            title="ลบห้องเรียน"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 3: STUDENTS MANAGEMENT */}
          {activeTab === 'students' && (
            <motion.div
              key="students-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 font-display">รายชื่อนักเรียนในระบบทั้งหมด ({students.length} คน)</h3>
                <button
                  onClick={() => openStudentModal()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  style={{ minHeight: '36px' }}
                >
                  <Plus size={14} />
                  <span>เพิ่มรายชื่อนักเรียน</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/50 shadow-polished overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                        <th className="py-3.5 px-4 font-mono">เลขที่</th>
                        <th className="py-3.5 px-4">ชื่อ-นามสกุล</th>
                        <th className="py-3.5 px-4">ห้องเรียน</th>
                        <th className="py-3.5 px-4 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {students.map((std) => (
                        <tr key={std.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">เลขที่ {std.studentId}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{std.name}</td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium">
                            {classes.find(c => c.id === std.classId)?.name || 'ไม่พบบัญชีห้องเรียน'}
                          </td>
                          <td className="py-3.5 px-4 text-center flex justify-center gap-2">
                            <button
                              onClick={() => openStudentModal(std.id)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/40 transition-all cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleStudentDelete(std.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100/40 transition-all cursor-pointer"
                              title="ลบรายชื่อ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: ASSIGNMENTS MANAGEMENT */}
          {activeTab === 'assignments' && (
            <motion.div
              key="assignments-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 font-display">รายการงาน/การบ้านที่กําหนด ({assignments.length} งาน)</h3>
                <button
                  onClick={() => openAssignmentModal()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  style={{ minHeight: '36px' }}
                >
                  <Plus size={14} />
                  <span>เพิ่มรายการงานใหม่</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/50 shadow-polished overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                        <th className="py-3.5 px-4">ชื่องาน</th>
                        <th className="py-3.5 px-4">คำอธิบาย</th>
                        <th className="py-3.5 px-4 font-mono">กำหนดส่ง</th>
                        <th className="py-3.5 px-4 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {assignments.map((asm) => (
                        <tr key={asm.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-800 max-w-[200px] truncate" title={asm.title}>{asm.title}</td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium max-w-[300px] truncate" title={asm.description}>{asm.description}</td>
                          <td className="py-3.5 px-4 text-rose-600 font-bold font-mono">{asm.dueDate}</td>
                          <td className="py-3.5 px-4 text-center flex justify-center gap-2">
                            <button
                              onClick={() => openAssignmentModal(asm.id)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/40 transition-all cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleAssignmentDelete(asm.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100/40 transition-all cursor-pointer"
                              title="ลบภาระงาน"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: SYSTEM CONFIGURATION (SHEETS/DRIVE CONNECT) */}
          {activeTab === 'config' && (
            <motion.div
              key="config-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200/50 p-6 shadow-polished space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Database size={20} className="text-indigo-500" />
                  <h3 className="font-semibold text-slate-800 text-sm font-display">การเชื่อมต่อฐานข้อมูล Google Workspace (Google Sheets & Google Drive)</h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  หากต้องการให้ระบบเก็บข้อมูลและส่งไฟล์ไปยังบัญชี Google Drive และ Google Sheets ของคุณครูจริงๆ ให้ทำการติดตั้งโค้ดฝั่งหลังบ้าน (รายละเอียดดังหน้าคู่มือช่วยเหลือ) แล้วนำ URL ที่ได้มาใส่ด้านล่างนี้
                </p>

                <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label htmlFor="config-url-input" className="block text-xs font-semibold text-slate-500">
                      Google Apps Script Web App URL:
                    </label>
                    <input
                      type="url"
                      id="config-url-input"
                      placeholder="เช่น https://script.google.com/macros/s/.../exec"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-800 rounded-xl px-4 py-3 text-xs outline-none transition-all font-mono"
                      style={{ minHeight: '44px' }}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Info size={12} className="text-indigo-500 shrink-0" />
                    <span>หากเว้นว่างไว้ ระบบจะปรับเข้าสู่ <b>"โหมดทดลองบราวเซอร์ (Local Demo Mode)"</b> โดยบันทึกข้อมูลทั้งหมดไว้บนเว็บบราวเซอร์ของคุณครูชั่วคราว</span>
                  </div>

                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm hover:shadow cursor-pointer"
                    style={{ minHeight: '40px' }}
                    id="btn-teacher-save-config"
                  >
                    บันทึกตั้งค่าเชื่อมต่อ
                  </button>
                </form>
              </div>

              {/* Status report card */}
              <div className="bg-slate-50/60 border border-slate-200/60 rounded-2xl p-5 text-xs space-y-3">
                <h4 className="font-semibold text-slate-700 flex items-center gap-1.5 font-display">
                  <Activity size={14} className="text-indigo-500" />
                  สถานะการทำงานปัจจุบันของเซิร์ฟเวอร์หลังบ้าน
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/50 shadow-sm flex items-center justify-between">
                    <span className="text-slate-400 font-medium">โหมดจัดเก็บ:</span>
                    <span className={`font-bold ${config.isDemoMode ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {config.isDemoMode ? 'จำลองออฟไลน์ (LocalState)' : 'คลาวด์ออนไลน์ (Apps Script)'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/50 shadow-sm flex items-center justify-between">
                    <span className="text-slate-400 font-medium">การตอบกลับภายนอก:</span>
                    <span className={`font-bold ${config.appsScriptUrl ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {config.appsScriptUrl ? 'ระบุ URL ไว้แล้ว' : 'ไม่ได้เชื่อมต่อ'}
                    </span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL 1: SUBMISSION DETAIL / EDIT GRADE */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200/50 p-6 sm:p-8 max-w-lg w-full shadow-polished space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm font-display">ตรวจสอบและบันทึกผลการส่งงาน</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">รหัสส่งงาน: {selectedSubmission.id}</p>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
                  style={{ minHeight: '36px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSubmissionEdit} className="space-y-4">
                {/* Details summary */}
                <div className="bg-slate-50/70 border border-slate-200/50 p-4 rounded-xl space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">ชื่อนักเรียน:</span>
                    <span className="font-bold text-slate-800">เลขที่ {selectedSubmission.studentNo} - {selectedSubmission.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">ห้องเรียน:</span>
                    <span className="font-bold text-slate-800">{selectedSubmission.className}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">งานที่ส่ง:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[220px]" title={selectedSubmission.assignmentTitle}>
                      {selectedSubmission.assignmentTitle}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">วันที่ส่งงาน:</span>
                    <span className="font-semibold text-slate-700 font-mono">{selectedSubmission.submissionDate}</span>
                  </div>
                  {selectedSubmission.fileUrl && (
                    <div className="flex justify-between border-t border-slate-200/50 pt-2.5 mt-1">
                      <span className="text-slate-400 font-medium">ลิงก์ไฟล์:</span>
                      <a
                        href={selectedSubmission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        เปิดดูใน Google Drive
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Edit status dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-status-select" className="block text-xs font-semibold text-slate-500">
                    เปลี่ยนสถานะส่งงาน:
                  </label>
                  <select
                    id="modal-status-select"
                    value={tempStatus}
                    onChange={(e) => setTempStatus(e.target.value as SubmissionStatus)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-800 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer transition-all"
                    style={{ minHeight: '38px' }}
                  >
                    <option value="ส่งแล้ว">ส่งแล้ว (Submitted)</option>
                    <option value="รอตรวจ">รอตรวจ (Pending Review)</option>
                    <option value="ตรวจแล้ว">ตรวจแล้ว/ผ่าน (Reviewed)</option>
                    <option value="ต้องแก้ไข">ต้องแก้ไข (Needs Correction)</option>
                  </select>
                </div>

                {/* Edit Remarks text area */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-remarks-input" className="block text-xs font-semibold text-slate-500">
                    หมายเหตุ / ข้อความติชมถึงนักเรียน:
                  </label>
                  <textarea
                    id="modal-remarks-input"
                    value={tempRemarks}
                    onChange={(e) => setTempRemarks(e.target.value)}
                    placeholder="ใส่หมายเหตุหรือระบุข้อผิดพลาดงาน เช่น 'งานเรียบร้อยดีมาก', 'กรุณาแก้ไขข้อ 3 ใหม่และอัปโหลดส่งอีกรอบค่ะ'"
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-3 py-2.5 text-xs outline-none resize-none transition-all"
                  ></textarea>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    style={{ minHeight: '40px' }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingStatus}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-55 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ minHeight: '40px' }}
                  >
                    {isUpdatingStatus ? (
                      <>
                        <RefreshCw className="animate-spin text-white" size={13} />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>บันทึกผลตรวจสอบ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CLASS ADD / EDIT */}
      <AnimatePresence>
        {isClassModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200/50 shadow-polished space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h3 className="font-bold text-slate-800 text-sm font-display">
                  {editingClassId ? 'แก้ไขข้อมูลห้องเรียน' : 'เพิ่มห้องเรียนใหม่'}
                </h3>
                <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl p-1 transition-all cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleClassSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="class-name-input" className="block text-xs font-semibold text-slate-500">
                    ชื่อห้องเรียน: <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    id="class-name-input"
                    placeholder="เช่น มัธยมศึกษาปีที่ 4/4"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-3 py-2 text-xs outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsClassModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    style={{ minHeight: '38px' }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    style={{ minHeight: '38px' }}
                  >
                    {editingClassId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: STUDENT ADD / EDIT */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200/50 shadow-polished space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h3 className="font-bold text-slate-800 text-sm font-display">
                  {editingStudentId ? 'แก้ไขรายชื่อนักเรียน' : 'เพิ่มรายชื่อนักเรียนใหม่'}
                </h3>
                <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl p-1 transition-all cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleStudentSave} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-1">
                    <label htmlFor="student-id-input" className="block text-xs font-semibold text-slate-500">เลขที่:</label>
                    <input
                      type="number"
                      id="student-id-input"
                      placeholder="เช่น 1"
                      value={studentNoInput}
                      onChange={(e) => setStudentNoInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-3 py-2 text-xs outline-none transition-all font-semibold text-center"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label htmlFor="student-name-input" className="block text-xs font-semibold text-slate-500">ชื่อ-นามสกุล:</label>
                    <input
                      type="text"
                      id="student-name-input"
                      placeholder="ชื่อและนามสกุล..."
                      value={studentNameInput}
                      onChange={(e) => setStudentNameInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-3 py-2 text-xs outline-none transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="student-class-id-input" className="block text-xs font-semibold text-slate-500">ระบุห้องเรียน:</label>
                  <select
                    id="student-class-id-input"
                    value={studentClassIdInput}
                    onChange={(e) => setStudentClassIdInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-850 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer transition-all font-medium"
                    style={{ minHeight: '38px' }}
                    required
                  >
                    <option value="">-- เลือกห้องเรียน --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStudentModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    style={{ minHeight: '38px' }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    style={{ minHeight: '38px' }}
                  >
                    {editingStudentId ? 'บันทึกการแก้ไข' : 'เพิ่มรายชื่อ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: ASSIGNMENT ADD / EDIT */}
      <AnimatePresence>
        {isAssignmentModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200/50 shadow-polished space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h3 className="font-bold text-slate-800 text-sm font-display">
                  {editingAssignmentId ? 'แก้ไขข้อมูลงาน' : 'เพิ่มรายการงานใหม่'}
                </h3>
                <button onClick={() => setIsAssignmentModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl p-1 transition-all cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAssignmentSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="assignment-title-input" className="block text-xs font-semibold text-slate-500">ชื่องาน: <span className="text-rose-500 font-bold">*</span></label>
                  <input
                    type="text"
                    id="assignment-title-input"
                    placeholder="เช่น ใบงานที่ 3: ระบบคลาวด์เบื้องต้น"
                    value={assignmentTitleInput}
                    onChange={(e) => setAssignmentTitleInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-3 py-2 text-xs outline-none font-bold transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="assignment-desc-input" className="block text-xs font-semibold text-slate-500">คำอธิบายรายละเอียด:</label>
                  <textarea
                    id="assignment-desc-input"
                    placeholder="ระบุข้อกำหนดของงาน รูปแบบสคริปต์ไฟล์ที่จะให้เด็กส่ง..."
                    value={assignmentDescInput}
                    onChange={(e) => setAssignmentDescInput(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-3 py-2.5 text-xs outline-none resize-none transition-all"
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="assignment-due-date-input" className="block text-xs font-semibold text-slate-500">วันครบกำหนดส่ง: <span className="text-rose-500 font-bold">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="date"
                      id="assignment-due-date-input"
                      value={assignmentDueDateInput}
                      onChange={(e) => setAssignmentDueDateInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs outline-none cursor-pointer transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignmentModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    style={{ minHeight: '38px' }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    style={{ minHeight: '38px' }}
                  >
                    {editingAssignmentId ? 'บันทึกการแก้ไข' : 'เพิ่มรายการงาน'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
