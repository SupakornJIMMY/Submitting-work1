import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, ShieldAlert, Settings, BookOpen, 
  HelpCircle, Sparkles, FolderSync, Info, AlertCircle, FileText
} from 'lucide-react';

import { ClassRoom, Student, Assignment, Submission, SubmissionStatus, SystemConfig } from './types';
import { 
  initialClasses, initialStudents, initialAssignments, initialSubmissions 
} from './data/mockData';

import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AppsScriptGuide from './components/AppsScriptGuide';

export default function App() {
  // Navigation: 'student' | 'teacher' | 'guide'
  const [currentRole, setCurrentRole] = useState<'student' | 'teacher' | 'guide'>('student');

  // Database States
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  // System Configuration State
  const [config, setConfig] = useState<SystemConfig>({
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyQmJftAFMLkuuA5PuGK06va9tmJRQUsNH4zJRwqoy2OgJI3o0QqzYSLBbHb8XwZNEnPg/exec',
    isDemoMode: false
  });

  // Load Initial Configurations and Local Database
  useEffect(() => {
    // 1. Load System Config
    const savedConfig = localStorage.getItem('submission_system_config');
    let loadedConfig: SystemConfig = { 
      appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyQmJftAFMLkuuA5PuGK06va9tmJRQUsNH4zJRwqoy2OgJI3o0QqzYSLBbHb8XwZNEnPg/exec', 
      isDemoMode: false 
    };
    if (savedConfig) {
      try {
        loadedConfig = JSON.parse(savedConfig);
        setConfig(loadedConfig);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Save the default cloud config
      localStorage.setItem('submission_system_config', JSON.stringify(loadedConfig));
      setConfig(loadedConfig);
    }

    // 2. Load DB States
    if (loadedConfig.isDemoMode || !loadedConfig.appsScriptUrl) {
      // Load offline states
      const savedClasses = localStorage.getItem('local_db_classes');
      const savedStudents = localStorage.getItem('local_db_students');
      const savedAssignments = localStorage.getItem('local_db_assignments');
      const savedSubmissions = localStorage.getItem('local_db_submissions');

      if (savedClasses && savedStudents && savedAssignments && savedSubmissions) {
        try {
          setClasses(JSON.parse(savedClasses));
          setStudents(JSON.parse(savedStudents));
          setAssignments(JSON.parse(savedAssignments));
          setSubmissions(JSON.parse(savedSubmissions));
        } catch (e) {
          useMockSeededData();
        }
      } else {
        useMockSeededData();
      }
    } else {
      // If we are in Live Mode, first load cached states to prevent visual stutter
      const cachedClasses = localStorage.getItem('cached_classes');
      const cachedStudents = localStorage.getItem('cached_students');
      const cachedAssignments = localStorage.getItem('cached_assignments');
      const cachedSubmissions = localStorage.getItem('cached_submissions');

      let hasCache = false;
      if (cachedClasses && cachedStudents && cachedAssignments && cachedSubmissions) {
        try {
          setClasses(JSON.parse(cachedClasses));
          setStudents(JSON.parse(cachedStudents));
          setAssignments(JSON.parse(cachedAssignments));
          setSubmissions(JSON.parse(cachedSubmissions));
          hasCache = true;
        } catch (e) {}
      }
      
      // Pull fresh data from cloud
      triggerCloudSync(loadedConfig.appsScriptUrl).then(success => {
        if (!success && !hasCache) {
          // If live sync fails on first load and we don't have any cached data,
          // automatically fall back to seeded mock data and switch to Demo Mode.
          console.warn('Sync failed and no cache found. Falling back to local demo mode.');
          useMockSeededData();
          
          const updated = { ...loadedConfig, isDemoMode: true };
          setConfig(updated);
          localStorage.setItem('submission_system_config', JSON.stringify(updated));
        }
      });
    }
  }, []);

  // Seed local states with mock data
  function useMockSeededData() {
    setClasses(initialClasses);
    setStudents(initialStudents);
    setAssignments(initialAssignments);
    setSubmissions(initialSubmissions);

    localStorage.setItem('local_db_classes', JSON.stringify(initialClasses));
    localStorage.setItem('local_db_students', JSON.stringify(initialStudents));
    localStorage.setItem('local_db_assignments', JSON.stringify(initialAssignments));
    localStorage.setItem('local_db_submissions', JSON.stringify(initialSubmissions));
  }

  // Sync with Google Apps Script
  const triggerCloudSync = async (url: string = config.appsScriptUrl) => {
    if (!url) return false;
    setSyncError(null);
    try {
      const proxyUrl = `/api/sync?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, { method: 'GET' });
      const result = await response.json();
      if (result.success && result.data) {
        const { classes: cl, students: st, assignments: as, submissions: su } = result.data;
        
        setClasses(cl);
        setStudents(st);
        setAssignments(as);
        setSubmissions(su);

        // Cache cloud states
        localStorage.setItem('cached_classes', JSON.stringify(cl));
        localStorage.setItem('cached_students', JSON.stringify(st));
        localStorage.setItem('cached_assignments', JSON.stringify(as));
        localStorage.setItem('cached_submissions', JSON.stringify(su));
        return true;
      } else {
        setSyncError(result.error || 'ดึงข้อมูลจากระบบ Google Apps Script ไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error('Error syncing data with Google Sheet Web App:', err);
      setSyncError(err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ตัวแทนได้');
    }
    return false;
  };

  // Save new Configuration
  const handleUpdateConfig = (newConfig: Partial<SystemConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem('submission_system_config', JSON.stringify(updated));

    if (updated.isDemoMode) {
      // Reload local data
      const savedClasses = localStorage.getItem('local_db_classes');
      const savedStudents = localStorage.getItem('local_db_students');
      const savedAssignments = localStorage.getItem('local_db_assignments');
      const savedSubmissions = localStorage.getItem('local_db_submissions');

      if (savedClasses && savedStudents && savedAssignments && savedSubmissions) {
        setClasses(JSON.parse(savedClasses));
        setStudents(JSON.parse(savedStudents));
        setAssignments(JSON.parse(savedAssignments));
        setSubmissions(JSON.parse(savedSubmissions));
      } else {
        useMockSeededData();
      }
    } else {
      // Pull fresh data from newly configured script url
      triggerCloudSync(updated.appsScriptUrl);
    }
  };

  // Apps Script caller wrapper
  const callAppsScript = async (action: string, payload: any) => {
    if (!config.appsScriptUrl) throw new Error('กรุณากำหนดตั้งค่า URL ระบบหลังบ้านก่อนใช้งาน');
    
    const response = await fetch('/api/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: config.appsScriptUrl,
        action,
        ...payload
      })
    });
    return await response.json();
  };

  // -------------------------------------------------------------
  // CLIENT ACTIONS (Dual support: Apps Script Post vs localStorage)
  // -------------------------------------------------------------

  // 1. Submit Assignment
  const handleSubmitAssignment = async (data: {
    className: string;
    studentNo: string;
    studentName: string;
    assignmentTitle: string;
    fileName: string;
    fileType: string;
    fileBase64: string;
    remarks: string;
    linkUrl?: string;
  }) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      // Real Web App Post
      try {
        const res = await callAppsScript('submitAssignment', data);
        if (res.success) {
          // Re-sync all data to get the newly appended row perfectly formatted
          await triggerCloudSync();
          // Find the new submission in local state
          const newSub: Submission = {
            id: res.submissionId || ('SUB' + Date.now()),
            studentNo: data.studentNo,
            studentName: data.studentName,
            className: data.className,
            assignmentTitle: data.assignmentTitle,
            submissionDate: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            status: 'รอตรวจ',
            fileUrl: res.fileUrl || data.linkUrl || '',
            fileName: data.fileName,
            remarks: data.remarks
          };
          return { success: true, submission: newSub };
        } else {
          return { success: false, error: res.message || 'เกิดข้อผิดพลาดในการส่งข้อมูลเข้าสเปรดชีต' };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์หลังบ้านได้' };
      }
    } else {
      // Local Mock Mode Submission
      const newSub: Submission = {
        id: 'SUB' + Date.now(),
        studentNo: data.studentNo,
        studentName: data.studentName,
        className: data.className,
        assignmentTitle: data.assignmentTitle,
        submissionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'รอตรวจ',
        fileUrl: data.linkUrl || '', // Use the link submitted by the student as fileUrl
        fileName: data.fileName,
        remarks: data.remarks
      };

      const updated = [newSub, ...submissions];
      setSubmissions(updated);
      localStorage.setItem('local_db_submissions', JSON.stringify(updated));
      return { success: true, submission: newSub };
    }
  };

  // 2. Update Submission Status (Teachers only)
  const handleUpdateSubmissionStatus = async (submissionId: string, status: SubmissionStatus, remarks: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('updateSubmission', { submissionId, status, remarks });
        if (res.success) {
          await triggerCloudSync();
          return { success: true };
        }
        return { success: false };
      } catch (err) {
        return { success: false };
      }
    } else {
      const updated = submissions.map(sub => {
        if (sub.id === submissionId) {
          return { ...sub, status, remarks };
        }
        return sub;
      });
      setSubmissions(updated);
      localStorage.setItem('local_db_submissions', JSON.stringify(updated));
      return { success: true };
    }
  };

  // 3. Manage Classes (Add/Edit/Delete)
  const handleAddClass = async (name: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageClasses', { operation: 'add', classData: { name } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true, id: res.id };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const newId = 'C' + Date.now();
      const newClass: ClassRoom = { id: newId, name };
      const updated = [...classes, newClass];
      setClasses(updated);
      localStorage.setItem('local_db_classes', JSON.stringify(updated));
      return { success: true, id: newId };
    }
  };

  const handleEditClass = async (id: string, name: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageClasses', { operation: 'edit', classData: { id, name } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const updated = classes.map(c => c.id === id ? { ...c, name } : c);
      setClasses(updated);
      localStorage.setItem('local_db_classes', JSON.stringify(updated));
      return { success: true };
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageClasses', { operation: 'delete', classData: { id } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const updated = classes.filter(c => c.id !== id);
      setClasses(updated);
      localStorage.setItem('local_db_classes', JSON.stringify(updated));
      return { success: true };
    }
  };

  // 4. Manage Students (Add/Edit/Delete)
  const handleAddStudent = async (studentId: string, name: string, classId: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageStudents', { operation: 'add', studentData: { studentId, name, classId } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true, id: res.id };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const newId = 'S' + Date.now();
      const newStudent: Student = { id: newId, studentId, name, classId };
      const updated = [...students, newStudent];
      setStudents(updated);
      localStorage.setItem('local_db_students', JSON.stringify(updated));
      return { success: true, id: newId };
    }
  };

  const handleEditStudent = async (id: string, studentId: string, name: string, classId: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageStudents', { operation: 'edit', studentData: { id, studentId, name, classId } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const updated = students.map(s => s.id === id ? { ...s, studentId, name, classId } : s);
      setStudents(updated);
      localStorage.setItem('local_db_students', JSON.stringify(updated));
      return { success: true };
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageStudents', { operation: 'delete', studentData: { id } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const updated = students.filter(s => s.id !== id);
      setStudents(updated);
      localStorage.setItem('local_db_students', JSON.stringify(updated));
      return { success: true };
    }
  };

  // 5. Manage Assignments (Add/Edit/Delete)
  const handleAddAssignment = async (title: string, description: string, dueDate: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageAssignments', { operation: 'add', assignmentData: { title, description, dueDate } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true, id: res.id };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const newId = 'A' + Date.now();
      const newAsm: Assignment = { id: newId, title, description, dueDate };
      const updated = [...assignments, newAsm];
      setAssignments(updated);
      localStorage.setItem('local_db_assignments', JSON.stringify(updated));
      return { success: true, id: newId };
    }
  };

  const handleEditAssignment = async (id: string, title: string, description: string, dueDate: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageAssignments', { operation: 'edit', assignmentData: { id, title, description, dueDate } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const updated = assignments.map(a => a.id === id ? { ...a, title, description, dueDate } : a);
      setAssignments(updated);
      localStorage.setItem('local_db_assignments', JSON.stringify(updated));
      return { success: true };
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!config.isDemoMode && config.appsScriptUrl) {
      try {
        const res = await callAppsScript('manageAssignments', { operation: 'delete', assignmentData: { id } });
        if (res.success) {
          await triggerCloudSync();
          return { success: true };
        }
        return { success: false };
      } catch {
        return { success: false };
      }
    } else {
      const updated = assignments.filter(a => a.id !== id);
      setAssignments(updated);
      localStorage.setItem('local_db_assignments', JSON.stringify(updated));
      return { success: true };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-800 antialiased font-sans">
      
      {/* Top Navigation bar */}
      <header className="sticky top-0 bg-white/75 backdrop-blur-md border-b border-slate-200/50 z-40 shadow-[0_1px_3px_rgba(15,23,42,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-sm hover:scale-[1.02] transition-transform duration-200">
              <GraduationCap size={22} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight font-display">ระบบส่งงานนักเรียน</h1>
              <p className="text-[10px] text-slate-400 font-medium">เชื่อมต่อ Google Sheets & Drive เต็มระบบ</p>
            </div>
          </div>

          {/* Quick Stats Grid / Buttons */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl items-center gap-1 border border-slate-200/40">
            <button
              onClick={() => setCurrentRole('student')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'student'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
              style={{ minHeight: '34px' }}
              id="btn-role-student"
            >
              หน้าบ้านนักเรียน
            </button>
            <button
              onClick={() => setCurrentRole('teacher')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'teacher'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
              style={{ minHeight: '34px' }}
              id="btn-role-teacher"
            >
              แดชบอร์ดคุณครู
            </button>
            <button
              onClick={() => setCurrentRole('guide')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'guide'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
              style={{ minHeight: '34px' }}
              id="btn-role-guide"
            >
              คู่มือการตั้งค่า
            </button>
          </div>

        </div>
      </header>

      {/* Demo warning bar */}
      {config.isDemoMode && (
        <div className="bg-amber-500/5 border-b border-amber-500/10 py-2.5 px-4 text-center text-[11px] text-amber-800 font-medium flex items-center justify-center gap-1.5 flex-wrap">
          <AlertCircle size={14} className="text-amber-500" />
          <span><b>โหมดทดลองบราวเซอร์ (Offline Demo Mode):</b> ระบบกำลังบันทึกข้อมูลแบบออฟไลน์ชั่วคราว</span>
          <button
            onClick={() => setCurrentRole('guide')}
            className="underline hover:text-amber-950 cursor-pointer font-bold ml-1"
          >
            ตั้งค่า Google Sheets และ Drive ตอนนี้เลย &gt;
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          
          {/* Student View */}
          {currentRole === 'student' && (
            <motion.div
              key="role-student-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <StudentPortal 
                classes={classes}
                students={students}
                assignments={assignments}
                submissions={submissions}
                onSubmitAssignment={handleSubmitAssignment}
                appsScriptUrl={config.appsScriptUrl}
              />
            </motion.div>
          )}

          {/* Teacher View */}
          {currentRole === 'teacher' && (
            <motion.div
              key="role-teacher-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TeacherPortal 
                classes={classes}
                students={students}
                assignments={assignments}
                submissions={submissions}
                config={config}
                onUpdateConfig={handleUpdateConfig}
                onAddClass={handleAddClass}
                onEditClass={handleEditClass}
                onDeleteClass={handleDeleteClass}
                onAddStudent={handleAddStudent}
                onEditStudent={handleEditStudent}
                onDeleteStudent={handleDeleteStudent}
                onAddAssignment={handleAddAssignment}
                onEditAssignment={handleEditAssignment}
                onDeleteAssignment={handleDeleteAssignment}
                onUpdateSubmissionStatus={handleUpdateSubmissionStatus}
                onSyncData={triggerCloudSync}
                syncError={syncError}
              />
            </motion.div>
          )}

          {/* Guide View */}
          {currentRole === 'guide' && (
            <motion.div
              key="role-guide-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AppsScriptGuide />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Beautiful Footer */}
      <footer className="border-t border-slate-200/50 bg-white py-8 text-center text-xs text-slate-400 mt-12 leading-relaxed">
        <p>© 2026 ระบบส่งการบ้านออนไลน์สำหรับโรงเรียนและวิทยาลัย • ขับเคลื่อนด้วย Google Workspace Cloud APIs</p>
        <p className="mt-1 text-[10px] text-slate-400/80">บันทึกข้อมูลอย่างปลอดภัย แยกโฟลเดอร์ใน Drive อัตโนมัติด้วยสคริปต์ความปลอดภัยสูง</p>
      </footer>

    </div>
  );
}
