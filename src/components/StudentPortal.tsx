import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Search, 
  Sparkles, Clock, HelpCircle, Loader2, ArrowRight, UserCheck, 
  BookOpen, CornerDownRight, Check, AlertTriangle, FileUp, X, Link
} from 'lucide-react';
import { ClassRoom, Student, Assignment, Submission, SubmissionStatus } from '../types';

interface StudentPortalProps {
  classes: ClassRoom[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  onSubmitAssignment: (data: {
    className: string;
    studentNo: string;
    studentName: string;
    assignmentTitle: string;
    fileName: string;
    fileType: string;
    fileBase64: string;
    remarks: string;
    linkUrl?: string;
  }) => Promise<{ success: boolean; error?: string; submission?: Submission }>;
  appsScriptUrl: string;
}

export default function StudentPortal({
  classes,
  students,
  assignments,
  submissions,
  onSubmitAssignment,
  appsScriptUrl
}: StudentPortalProps) {
  // Navigation tabs: 'submit' | 'status'
  const [activeTab, setActiveTab] = useState<'submit' | 'status'>('submit');

  // Form states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [studentRemarks, setStudentRemarks] = useState('');
  
  // File Upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission method states: 'file' | 'link'
  const [submissionType, setSubmissionType] = useState<'file' | 'link'>('file');
  const [pastedLink, setPastedLink] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Status Check states
  const [statusClassId, setStatusClassId] = useState('');
  const [statusStudentId, setStatusStudentId] = useState('');
  const [statusAssignmentId, setStatusAssignmentId] = useState('');
  const [statusChecked, setStatusChecked] = useState(false);

  // General flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; sub?: Submission } | null>(null);

  // Filter students by selected class
  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => s.classId === selectedClassId)
      .sort((a, b) => parseInt(a.studentId) - parseInt(b.studentId));
  }, [selectedClassId, students]);

  // Filter students for status check
  const statusFilteredStudents = useMemo(() => {
    if (!statusClassId) return [];
    return students.filter(s => s.classId === statusClassId)
      .sort((a, b) => parseInt(a.studentId) - parseInt(b.studentId));
  }, [statusClassId, students]);

  // Selected student details
  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [selectedStudentId, students]);

  // Selected assignment details
  const currentAssignment = useMemo(() => {
    return assignments.find(a => a.id === selectedAssignmentId);
  }, [selectedAssignmentId, assignments]);

  // Handle Drag Over
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Convert File to Base64
  const processFile = (file: File) => {
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFileBase64('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit assignment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !selectedStudentId || !selectedAssignmentId) {
      alert('กรุณากรอกข้อมูลห้องเรียน นักเรียน และภาระงานให้ครบถ้วนก่อนส่งงาน');
      return;
    }

    if (submissionType === 'file' && !uploadedFile) {
      alert('กรุณาอัปโหลดไฟล์งานของคุณก่อนส่งงาน');
      return;
    }

    if (submissionType === 'link') {
      if (!pastedLink.trim()) {
        alert('กรุณากรอกลิงก์ส่งงานของคุณ');
        return;
      }
      if (!pastedLink.startsWith('http://') && !pastedLink.startsWith('https://')) {
        alert('กรุณากรอกลิงก์ที่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)');
        return;
      }
    }

    const classObj = classes.find(c => c.id === selectedClassId);
    const studentObj = students.find(s => s.id === selectedStudentId);
    const assignmentObj = assignments.find(a => a.id === selectedAssignmentId);

    if (!classObj || !studentObj || !assignmentObj) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      let finalFileName = '';
      let finalFileType = '';
      let finalFileBase64 = '';
      let finalLinkUrl = '';

      if (submissionType === 'file' && uploadedFile) {
        finalFileName = uploadedFile.name;
        finalFileType = uploadedFile.type;
        finalFileBase64 = fileBase64;
      } else {
        let autoTitle = linkTitle.trim();
        if (!autoTitle) {
          if (pastedLink.includes('drive.google.com')) {
            autoTitle = 'Google Drive Link';
          } else if (pastedLink.includes('canva.com')) {
            autoTitle = 'Canva Design Link';
          } else if (pastedLink.includes('github.com')) {
            autoTitle = 'GitHub Repository';
          } else if (pastedLink.includes('notion.so')) {
            autoTitle = 'Notion Page Link';
          } else {
            autoTitle = 'ลิงก์ส่งงานภายนอก';
          }
        }
        finalFileName = autoTitle;
        finalFileType = 'url';
        finalFileBase64 = '';
        finalLinkUrl = pastedLink.trim();
      }

      const response = await onSubmitAssignment({
        className: classObj.name,
        studentNo: studentObj.studentId,
        studentName: studentObj.name,
        assignmentTitle: assignmentObj.title,
        fileName: finalFileName,
        fileType: finalFileType,
        fileBase64: finalFileBase64,
        remarks: studentRemarks,
        linkUrl: finalLinkUrl
      });

      if (response.success) {
        setSubmitResult({
          success: true,
          message: 'ระบบได้บันทึกการส่งงานเรียบร้อยแล้ว!',
          sub: response.submission
        });
        // Clear states
        setUploadedFile(null);
        setFileBase64('');
        setPastedLink('');
        setLinkTitle('');
        setStudentRemarks('');
      } else {
        setSubmitResult({
          success: false,
          message: response.error || 'เกิดข้อผิดพลาดบางประการในการส่งงาน'
        });
      }
    } catch (err: any) {
      setSubmitResult({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find status for current selection
  const foundSubmission = useMemo(() => {
    if (!statusChecked) return null;
    
    const classObj = classes.find(c => c.id === statusClassId);
    const studentObj = students.find(s => s.id === statusStudentId);
    const assignmentObj = assignments.find(a => a.id === statusAssignmentId);

    if (!classObj || !studentObj || !assignmentObj) return null;

    // Filter submissions matching this student, class, and assignment title
    return submissions.find(sub => 
      sub.studentName === studentObj.name && 
      sub.className === classObj.name && 
      sub.assignmentTitle === assignmentObj.title
    );
  }, [statusChecked, statusClassId, statusStudentId, statusAssignmentId, submissions, classes, students, assignments]);

  const handleStatusCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusClassId || !statusStudentId || !statusAssignmentId) {
      alert('กรุณาเลือก ห้องเรียน, ชื่อนร. และงานให้ครบถ้วน');
      return;
    }
    setStatusChecked(true);
  };

  // Get status badge classes & icons
  const getStatusMeta = (status: SubmissionStatus | 'ยังไม่ส่ง') => {
    switch (status) {
      case 'ยังไม่ส่ง':
        return {
          bg: 'bg-rose-50 border-rose-100 text-rose-700',
          dot: 'bg-rose-500 animate-pulse',
          label: 'ยังไม่ส่ง',
          text: 'คุณครูยังไม่ได้รับงานชิ้นนี้ กรุณาส่งงานให้ทันเวลาที่กำหนด'
        };
      case 'ส่งแล้ว':
        return {
          bg: 'bg-emerald-50 border-emerald-100 text-emerald-700',
          dot: 'bg-emerald-500',
          label: 'ส่งแล้ว',
          text: 'ส่งงานสำเร็จเรียบร้อย อยู่ในระบบเพื่อเรียงคิวตรวจ'
        };
      case 'รอตรวจ':
        return {
          bg: 'bg-amber-50 border-amber-100 text-amber-700',
          dot: 'bg-amber-500 animate-pulse',
          label: 'รอการตรวจสอบ',
          text: 'ส่งงานสำเร็จแล้ว กำลังรอคุณครูเปิดอ่านและให้คะแนน'
        };
      case 'ตรวจแล้ว':
        return {
          bg: 'bg-sky-50 border-sky-100 text-sky-700',
          dot: 'bg-sky-500',
          label: 'ตรวจแล้ว (ผ่าน)',
          text: 'คุณครูได้ทำการตรวจงานของคุณเรียบร้อยแล้ว ยอดเยี่ยมมาก!'
        };
      case 'ต้องแก้ไข':
        return {
          bg: 'bg-orange-50 border-orange-100 text-orange-700',
          dot: 'bg-orange-500 animate-bounce',
          label: 'ต้องแก้ไขงานใหม่',
          text: 'คุณครูขอความกรุณาให้แก้ไขงานชิ้นนี้ โปรดอ่านรายละเอียดด้านล่างและอัปโหลดส่งใหม่อีกครั้ง'
        };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto font-sans p-2 sm:p-4">
      {/* Tab Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 w-full max-w-md mx-auto border border-slate-200/50 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <button
          onClick={() => { setActiveTab('submit'); setSubmitResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'submit'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
          }`}
          id="btn-tab-student-submit"
          style={{ minHeight: '40px' }}
        >
          <FileUp size={15} />
          <span>ส่งงานใหม่</span>
        </button>
        <button
          onClick={() => { setActiveTab('status'); setStatusChecked(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'status'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
          }`}
          id="btn-tab-student-status"
          style={{ minHeight: '40px' }}
        >
          <Search size={15} />
          <span>เช็กสถานะการส่ง</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: SUBMIT NEW WORK */}
        {activeTab === 'submit' && (
          <motion.div
            key="submit-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {submitResult ? (
              /* Submission Success / Fail Screen */
              <motion.div 
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-8 rounded-3xl border text-center shadow-polished ${
                  submitResult.success 
                    ? 'bg-white border-emerald-100/80 text-slate-800' 
                    : 'bg-white border-rose-100/80 text-slate-800'
                }`}
              >
                <div className="flex justify-center mb-5">
                  {submitResult.success ? (
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full shadow-sm">
                      <CheckCircle2 size={44} />
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-full shadow-sm">
                      <AlertCircle size={44} />
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold mb-2 font-display text-slate-900">
                  {submitResult.success ? 'ส่งงานสำเร็จเรียบร้อย!' : 'เกิดข้อผิดพลาดในการส่งงาน'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
                  {submitResult.message}
                </p>

                {submitResult.success && submitResult.sub && (
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 text-left max-w-lg mx-auto mb-6 text-xs text-slate-600 space-y-2.5">
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400">ผู้ส่ง:</span>
                      <span className="font-semibold text-slate-800">เลขที่ {submitResult.sub.studentNo} - {submitResult.sub.studentName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400">ห้องเรียน:</span>
                      <span className="font-semibold text-slate-800">{submitResult.sub.className}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400">ภาระงาน:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[240px]" title={submitResult.sub.assignmentTitle}>
                        {submitResult.sub.assignmentTitle}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400 font-mono">วันที่และเวลา:</span>
                      <span className="font-semibold text-slate-800 font-mono">{submitResult.sub.submissionDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">สถานะเริ่มต้น:</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        {submitResult.sub.status}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setSubmitResult(null)}
                  className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition-all shadow-sm hover:shadow cursor-pointer inline-flex items-center gap-2"
                  style={{ minHeight: '40px' }}
                >
                  <span>ส่งงานเพิ่มอีก</span>
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            ) : (
              /* Student Submission Form */
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/50 shadow-polished space-y-6">
                
                {/* Header info */}
                <div className="border-b border-slate-100 pb-5 mb-2">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-base mb-1.5 font-display">
                    <Sparkles size={18} />
                    <span>ระบบส่งการบ้านออนไลน์ (สำหรับนักเรียน)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    กรุณาเลือกข้อมูลห้องเรียน รายชื่อของนักเรียน และอัปโหลดไฟล์งานให้ถูกต้องเรียบร้อยก่อนทำการกดส่งข้อมูล
                  </p>
                </div>

                {/* Grid for Selection fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Select Room (ห้องเรียน) */}
                  <div className="space-y-1.5">
                    <label htmlFor="student-class" className="block text-xs font-semibold text-slate-500">
                      1. เลือกห้องเรียนของคุณ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="student-class"
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setSelectedStudentId(''); // Reset student when class changes
                      }}
                      className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all cursor-pointer"
                      required
                      style={{ minHeight: '44px' }}
                    >
                      <option value="">-- เลือกห้องเรียน --</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Name (ชื่อของตนเอง) */}
                  <div className="space-y-1.5">
                    <label htmlFor="student-name" className="block text-xs font-semibold text-slate-500">
                      2. เลือกชื่อ-นามสกุลของคุณ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="student-name"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={!selectedClassId}
                      className="w-full bg-slate-50 border border-slate-200/80 disabled:opacity-60 hover:disabled:border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all cursor-pointer"
                      required
                      style={{ minHeight: '44px' }}
                    >
                      <option value="">
                        {!selectedClassId ? '← กรุณาเลือกห้องเรียนก่อน' : '-- ค้นหาและเลือกชื่อของคุณ --'}
                      </option>
                      {filteredStudents.map((std) => (
                        <option key={std.id} value={std.id}>
                          เลขที่ {std.studentId} - {std.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto student info banner */}
                {currentStudent && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100/60 p-4 rounded-xl text-indigo-800 text-xs shadow-[inset_0_1px_2px_rgba(79,70,229,0.02)]"
                  >
                    <UserCheck className="text-indigo-500 shrink-0" size={18} />
                    <div className="leading-relaxed">
                      ตรวจสอบข้อมูลผู้ส่ง: <span className="font-semibold text-indigo-950">เลขที่ {currentStudent.studentId}</span> | <span className="font-semibold text-indigo-950">{currentStudent.name}</span> | <span className="font-semibold text-indigo-950">{classes.find(c=>c.id===selectedClassId)?.name}</span>
                    </div>
                  </motion.div>
                )}

                {/* Select Assignment (รายการงานที่จะส่ง) */}
                <div className="space-y-1.5">
                  <label htmlFor="student-assignment" className="block text-xs font-semibold text-slate-500">
                    3. เลือกภาระงาน/การบ้าน ที่จะส่งงาน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="student-assignment"
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all cursor-pointer"
                    required
                    style={{ minHeight: '44px' }}
                  >
                    <option value="">-- เลือกรายการงานที่จะส่ง --</option>
                    {assignments.map((asm) => (
                      <option key={asm.id} value={asm.id}>
                        {asm.title} (ครบกำหนด: {asm.dueDate})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Assignment Description Card */}
                {currentAssignment && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs space-y-1.5 shadow-[inset_0_1px_1px_rgba(0,0,0,0.01)]"
                  >
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <BookOpen size={14} className="text-purple-500" />
                        คำอธิบายของภาระงาน:
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                        <Clock size={10} />
                        ส่งภายใน: {currentAssignment.dueDate}
                      </span>
                    </div>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-[11px] pl-4 border-l-2 border-purple-200">
                      {currentAssignment.description}
                    </p>
                  </motion.div>
                )}

                {/* File Upload / Link Submission Area */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-slate-500">
                      4. แนบไฟล์หลักฐานหรือลิงก์ส่งงานของคุณ <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSubmissionType('file')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          submissionType === 'file'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        อัปโหลดไฟล์ (.zip, .pdf, .png)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionType('link')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          submissionType === 'link'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        ส่งเป็นลิงก์ (Google Drive, Canva, Notion)
                      </button>
                    </div>
                  </div>
                  
                  {submissionType === 'file' ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
                        dragActive 
                          ? 'border-indigo-500 bg-indigo-50/40 shadow-sm' 
                          : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-350'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="file-submission"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.rar,.txt,.py"
                      />

                      {uploadedFile ? (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                            <FileText size={22} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 max-w-[280px] sm:max-w-md truncate mx-auto" title={uploadedFile.name}>
                              {uploadedFile.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={removeFile}
                            className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            style={{ minHeight: '28px' }}
                          >
                            <X size={11} />
                            <span>ลบไฟล์ออก</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-sm">
                            <Upload size={20} />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            ลากไฟล์งานมาวางที่นี่ หรือ <span className="text-indigo-600 font-bold hover:text-indigo-700 underline">คลิกเพื่อเลือกไฟล์</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                            รองรับ PDF, Word (.docx), PPT (.pptx), รูปภาพ (.jpg, .png), ZIP, RAR และโค้ดโปรแกรมต่างๆ ขนาดไฟล์ไม่เกิน 15MB
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                      <div className="space-y-1.5">
                        <label htmlFor="pasted-link-input" className="block text-[11px] font-bold text-slate-500">
                          วางลิงก์ส่งงานของคุณ (เช่น ลิงก์ Google Drive, Canva, GitHub) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <Link className="absolute left-3.5 text-slate-400" size={16} />
                          <input
                            type="url"
                            id="pasted-link-input"
                            value={pastedLink}
                            onChange={(e) => setPastedLink(e.target.value)}
                            placeholder="วางลิงก์ที่นี่ (ต้องเป็นลิงก์จริงและเปิดสิทธิ์การเข้าถึงแล้ว)"
                            className="w-full bg-white border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 text-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs outline-none transition-all font-mono"
                            style={{ minHeight: '44px' }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="link-title-input" className="block text-[11px] font-bold text-slate-500">
                          ชื่อเรียกหรือประเภทของลิงก์ (ไม่บังคับ - ระบบจะตรวจจับให้อัตโนมัติ)
                        </label>
                        <input
                          type="text"
                          id="link-title-input"
                          value={linkTitle}
                          onChange={(e) => setLinkTitle(e.target.value)}
                          placeholder="เช่น สไลด์นำเสนอ Canva, ลิงก์โฟลเดอร์ Google Drive, เล่มรายงาน Google Docs"
                          className="w-full bg-white border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 text-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                          style={{ minHeight: '38px' }}
                        />
                      </div>

                      <div className="bg-indigo-50/30 border border-indigo-100/40 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed flex items-start gap-2">
                        <span className="text-indigo-500 font-bold shrink-0 mt-0.5">ℹ️ คำแนะนำในการส่งลิงก์ Google Drive:</span>
                        <span>
                          โปรดตรวจสอบให้แน่ใจว่าได้ตั้งค่าสิทธิ์การแชร์เป็น <b>"ทุกคนที่มีลิงก์ (Anyone with the link)"</b> และเลือกบทบาทเป็น <b>"ผู้มีสิทธิ์อ่าน (Viewer)"</b> เพื่อให้คุณครูเปิดตรวจผลงานและให้คะแนนได้ทันทีโดยไม่ต้องกดขอสิทธิ์การเข้าถึงเพิ่มเติม
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Comments (รายละเอียดเพิ่มเติม / หมายเหตุ) */}
                <div className="space-y-1.5">
                  <label htmlFor="student-remarks" className="block text-xs font-semibold text-slate-500">
                    5. รายละเอียดเพิ่มเติม (ถ้ามี)
                  </label>
                  <textarea
                    id="student-remarks"
                    value={studentRemarks}
                    onChange={(e) => setStudentRemarks(e.target.value)}
                    placeholder="เขียนรายละเอียด ข้อความ หรือบันทึกข้อความเพิ่มเติมถึงคุณครูที่นี่..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white text-slate-700 rounded-xl px-4 py-3 text-xs outline-none transition-all resize-none leading-relaxed"
                  ></textarea>
                </div>

                {/* Action Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || 
                      !selectedClassId || 
                      !selectedStudentId || 
                      !selectedAssignmentId || 
                      (submissionType === 'file' ? !uploadedFile : !pastedLink.trim())
                    }
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-xs transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    style={{ minHeight: '44px' }}
                    id="btn-student-submit-trigger"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin text-white" size={16} />
                        <span>กำลังอัปโหลดไฟล์และบันทึกข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>ยืนยันส่งงาน</span>
                      </>
                    )}
                  </button>
                  {appsScriptUrl === '' && (
                    <p className="text-center text-[10px] text-amber-600 mt-2.5 flex items-center justify-center gap-1.5 font-medium">
                      <AlertTriangle size={12} className="text-amber-500" />
                      <span>โหมดทดลอง: งานจะถูกจำลองบันทึกเก็บไว้ที่เว็บนี้ชั่วคราว</span>
                    </p>
                  )}
                </div>

              </form>
            )}
          </motion.div>
        )}

        {/* TAB 2: CHECK SUBMISSION STATUS */}
        {activeTab === 'status' && (
          <motion.div
            key="status-checker"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
              
              {/* Header */}
              <div className="border-b border-slate-100 pb-4 mb-2">
                <div className="flex items-center gap-2 text-blue-600 font-semibold text-base mb-1">
                  <Search size={18} />
                  <span>ระบบเช็กสถานะการส่งการบ้าน (Student Portfolio Status)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  เลือกห้องเรียน ชื่อของคุณ และงานที่ครูมอบหมาย เพื่อตรวจสอบสถานะ คะแนน และผลตอบรับของคุณครูได้ทันที
                </p>
              </div>

              {/* Selector form */}
              <form onSubmit={handleStatusCheck} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Select Class */}
                <div className="space-y-1">
                  <label htmlFor="status-class" className="block text-[11px] font-semibold text-slate-500">
                    ห้องเรียน
                  </label>
                  <select
                    id="status-class"
                    value={statusClassId}
                    onChange={(e) => {
                      setStatusClassId(e.target.value);
                      setStatusStudentId('');
                      setStatusChecked(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-700 rounded-xl px-3 py-2.5 text-xs outline-none transition-all cursor-pointer"
                    required
                    style={{ minHeight: '44px' }}
                  >
                    <option value="">-- เลือกห้องเรียน --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                {/* Select Student */}
                <div className="space-y-1">
                  <label htmlFor="status-student" className="block text-[11px] font-semibold text-slate-500">
                    ชื่อ-นามสกุล
                  </label>
                  <select
                    id="status-student"
                    value={statusStudentId}
                    onChange={(e) => {
                      setStatusStudentId(e.target.value);
                      setStatusChecked(false);
                    }}
                    disabled={!statusClassId}
                    className="w-full bg-slate-50 border border-slate-200 disabled:opacity-60 focus:border-blue-500 focus:bg-white text-slate-700 rounded-xl px-3 py-2.5 text-xs outline-none transition-all cursor-pointer"
                    required
                    style={{ minHeight: '44px' }}
                  >
                    <option value="">
                      {!statusClassId ? '← เลือกห้องเรียนก่อน' : '-- เลือกชื่อของคุณ --'}
                    </option>
                    {statusFilteredStudents.map((std) => (
                      <option key={std.id} value={std.id}>
                        เลขที่ {std.studentId} - {std.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Assignment */}
                <div className="space-y-1">
                  <label htmlFor="status-assignment" className="block text-[11px] font-semibold text-slate-500">
                    งานที่ครูมอบหมาย
                  </label>
                  <select
                    id="status-assignment"
                    value={statusAssignmentId}
                    onChange={(e) => {
                      setStatusAssignmentId(e.target.value);
                      setStatusChecked(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-700 rounded-xl px-3 py-2.5 text-xs outline-none transition-all cursor-pointer"
                    required
                    style={{ minHeight: '44px' }}
                  >
                    <option value="">-- เลือกรายการงาน --</option>
                    {assignments.map((asm) => (
                      <option key={asm.id} value={asm.id}>{asm.title}</option>
                    ))}
                  </select>
                </div>

                {/* Submit search */}
                <div className="md:col-span-3 pt-2">
                  <button
                    type="submit"
                    disabled={!statusClassId || !statusStudentId || !statusAssignmentId}
                    className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    <Search size={14} />
                    <span>ค้นหาประวัติการส่งงาน</span>
                  </button>
                </div>
              </form>

              {/* Search Result display */}
              <AnimatePresence mode="wait">
                {statusChecked && (
                  <motion.div
                    key={foundSubmission ? 'result-found' : 'result-notfound'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="pt-4 border-t border-slate-100"
                  >
                    {foundSubmission ? (
                      /* Active Submission Status Card */
                      <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-150 space-y-4">
                        
                        {/* Heading & Status Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm">ผลการตรวจสอบส่งงาน</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              รหัสส่งงาน: {foundSubmission.id} | ส่งเมื่อ: {foundSubmission.submissionDate}
                            </p>
                          </div>
                          
                          <div className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 self-start sm:self-center ${getStatusMeta(foundSubmission.status).bg}`}>
                            <span className={`w-2 h-2 rounded-full ${getStatusMeta(foundSubmission.status).dot}`}></span>
                            <span>{getStatusMeta(foundSubmission.status).label}</span>
                          </div>
                        </div>

                        {/* Summary fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-slate-400 font-medium">ชื่อผู้ส่ง:</p>
                            <p className="text-slate-700 font-semibold mt-0.5">เลขที่ {foundSubmission.studentNo} - {foundSubmission.studentName}</p>
                            <p className="text-[10px] text-slate-500">{foundSubmission.className}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-medium">ชื่องานที่ส่ง:</p>
                            <p className="text-slate-700 font-semibold mt-0.5 max-w-sm truncate" title={foundSubmission.assignmentTitle}>
                              {foundSubmission.assignmentTitle}
                            </p>
                          </div>
                        </div>

                        {/* File Link info */}
                        <div className="bg-white rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-600 truncate">
                            <FileText size={16} className="text-blue-500" />
                            <span className="font-medium truncate max-w-[200px] sm:max-w-md" title={foundSubmission.fileName}>
                              {foundSubmission.fileName}
                            </span>
                          </div>
                          {foundSubmission.fileUrl && foundSubmission.fileUrl.startsWith('http') ? (
                            <a 
                              href={foundSubmission.fileUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                            >
                              <span>
                                {foundSubmission.fileUrl.includes('drive.google.com') 
                                  ? 'เปิดดูใน Google Drive' 
                                  : 'เปิดดูลิงก์ส่งงาน'}
                              </span>
                              <ArrowRight size={12} />
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono shrink-0">ไฟล์ตัวอย่าง</span>
                          )}
                        </div>

                        {/* Explanation Text */}
                        <p className="text-[11px] text-slate-500 italic leading-relaxed">
                          ⚠️ {getStatusMeta(foundSubmission.status).text}
                        </p>

                        {/* Teacher's Remarks (คำติชมจากครู) */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-1.5 text-xs">
                          <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-blue-600" />
                            <span>หมายเหตุ / ความเห็นจากคุณครู:</span>
                          </div>
                          {foundSubmission.remarks ? (
                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed pl-5 font-medium">
                              "{foundSubmission.remarks}"
                            </p>
                          ) : (
                            <p className="text-slate-400 italic pl-5">
                              (คุณครูยังไม่ได้เขียนบันทึกหรือความเห็นเพิ่มเติมสำหรับงานชิ้นนี้)
                            </p>
                          )}
                        </div>

                      </div>
                    ) : (
                      /* Not Found Card */
                      <div className="bg-rose-50/30 rounded-2xl p-6 border border-rose-100/50 text-center space-y-3">
                        <div className="mx-auto w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-rose-800 text-sm">ไม่พบประวัติการส่งงาน</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                            ยังไม่มีข้อมูลการส่งงานชิ้นนี้ของนักเรียนที่เลือกในระบบ หรืออยู่ระหว่างการลงทะเบียนข้อมูลงานใหม่ กรุณาเปลี่ยนงานหรือส่งงานอีกครั้ง
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
