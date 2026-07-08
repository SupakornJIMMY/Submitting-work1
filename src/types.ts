export interface ClassRoom {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  studentId: string; // เลขที่
  name: string;      // ชื่อ-นามสกุล
  classId: string;   // ID ของห้องเรียน
}

export interface Assignment {
  id: string;
  title: string;       // ชื่องาน
  description: string; // คำอธิบาย/รายละเอียด
  dueDate: string;     // วันครบกำหนดส่ง (YYYY-MM-DD)
}

export type SubmissionStatus = 'ยังไม่ส่ง' | 'ส่งแล้ว' | 'รอตรวจ' | 'ตรวจแล้ว' | 'ต้องแก้ไข';

export interface Submission {
  id: string;
  studentNo: string;      // เลขที่
  studentName: string;    // ชื่อ-นามสกุล
  className: string;      // ห้องเรียน (ชื่อห้อง)
  assignmentTitle: string;// ชื่องาน
  submissionDate: string; // วันที่ส่ง (YYYY-MM-DD HH:mm)
  status: SubmissionStatus;
  fileUrl: string;        // ลิงก์ไฟล์บน Google Drive
  fileName: string;       // ชื่อไฟล์
  remarks: string;        // หมายเหตุจากครู
}

export interface SystemConfig {
  appsScriptUrl: string; // URL ของ Google Apps Script Web App
  isDemoMode: boolean;   // true = ใช้ localStorage, false = เชื่อม Google Sheets จริง
}
