import { ClassRoom, Student, Assignment, Submission } from '../types';

export const initialClasses: ClassRoom[] = [
  { id: 'c1', name: 'มัธยมศึกษาปีที่ 4/1' },
  { id: 'c2', name: 'มัธยมศึกษาปีที่ 4/2' },
  { id: 'c3', name: 'มัธยมศึกษาปีที่ 4/3' }
];

export const initialStudents: Student[] = [
  // Class 4/1
  { id: 's1', studentId: '1', name: 'เด็กชายณภัทร สมบูรณ์ดี', classId: 'c1' },
  { id: 's2', studentId: '2', name: 'เด็กชายกิตติภพ รักเรียน', classId: 'c1' },
  { id: 's3', studentId: '3', name: 'เด็กหญิงพิมพิกา มีสุขใจ', classId: 'c1' },
  { id: 's4', studentId: '4', name: 'เด็กหญิงศิริพร บุญส่ง', classId: 'c1' },
  { id: 's5', studentId: '5', name: 'เด็กหญิงกานต์พิชชา เลิศรัตน์', classId: 'c1' },

  // Class 4/2
  { id: 's6', studentId: '1', name: 'เด็กชายอนันต์ แก้วดี', classId: 'c2' },
  { id: 's7', studentId: '2', name: 'เด็กชายสุรชัย เลิศศิลป์', classId: 'c2' },
  { id: 's8', studentId: '3', name: 'เด็กหญิงวรรณิภา ใจงาม', classId: 'c2' },
  { id: 's9', studentId: '4', name: 'เด็กหญิงชลลดา รุ่งเรือง', classId: 'c2' },

  // Class 4/3
  { id: 's10', studentId: '1', name: 'เด็กชายธนวัฒน์ พรพนา', classId: 'c3' },
  { id: 's11', studentId: '2', name: 'เด็กชายพีรพล เจริญสกุล', classId: 'c3' },
  { id: 's12', studentId: '3', name: 'เด็กหญิงนภัสสร อรุณวิจิตร', classId: 'c3' }
];

export const initialAssignments: Assignment[] = [
  {
    id: 'a1',
    title: 'ใบงานที่ 1: การเขียนโปรแกรมเบื้องต้นด้วยภาษา Python',
    description: 'ให้นักเรียนเขียนโปรแกรมคำนวณพื้นที่รูปสามเหลี่ยม โดยรับค่าฐานและสูงจากผู้ใช้ พร้อมแสดงผลลัพธ์ออกทางหน้าจอ ส่งงานในรูปแบบไฟล์ .py หรือ .txt',
    dueDate: '2026-07-15'
  },
  {
    id: 'a2',
    title: 'โครงงานวิทยาศาสตร์ บทที่ 1-3 (ฉบับร่าง)',
    description: 'ให้อัปโหลดไฟล์เอกสารโครงงานวิทยาศาสตร์ที่ผ่านการแก้ไขรอบแรก ประกอบด้วย บทนำ เอกสารที่เกี่ยวข้อง และวิธีการดำเนินงาน ส่งงานเป็นไฟล์ PDF เท่านั้น',
    dueDate: '2026-07-20'
  },
  {
    id: 'a3',
    title: 'รายงานการค้นคว้าเรื่อง เทคโนโลยีคลาวด์คอมพิวติ้ง (Cloud Computing)',
    description: 'ให้ศึกษาค้นคว้าหัวข้อที่ได้รับมอบหมายเกี่ยวกับคลาวด์ จัดทำสไลด์นำเสนอความยาว 8-10 หน้า ส่งงานเป็นไฟล์ PDF, PowerPoint (.pptx) หรือลิงก์ Canva',
    dueDate: '2026-07-25'
  }
];

export const initialSubmissions: Submission[] = [
  {
    id: 'sub1',
    studentNo: '1',
    studentName: 'เด็กชายณภัทร สมบูรณ์ดี',
    className: 'มัธยมศึกษาปีที่ 4/1',
    assignmentTitle: 'ใบงานที่ 1: การเขียนโปรแกรมเบื้องต้นด้วยภาษา Python',
    submissionDate: '2026-07-05 14:32',
    status: 'ตรวจแล้ว',
    fileUrl: 'https://drive.google.com/open?id=mock_file_id_1',
    fileName: 'ม4-1_ณภัทร_Pythonเบื้องต้น.py',
    remarks: 'โค้ดเขียนได้ถูกต้อง มีการคอมเมนต์อธิบายตัวแปรชัดเจนมาก เยี่ยมมาก!'
  },
  {
    id: 'sub2',
    studentNo: '2',
    studentName: 'เด็กชายกิตติภพ รักเรียน',
    className: 'มัธยมศึกษาปีที่ 4/1',
    assignmentTitle: 'ใบงานที่ 1: การเขียนโปรแกรมเบื้องต้นด้วยภาษา Python',
    submissionDate: '2026-07-06 09:15',
    status: 'รอตรวจ',
    fileUrl: 'https://drive.google.com/open?id=mock_file_id_2',
    fileName: 'ม4-1_กิตติภพ_ใบงานที่1.py',
    remarks: ''
  },
  {
    id: 'sub3',
    studentNo: '3',
    studentName: 'เด็กหญิงพิมพิกา มีสุขใจ',
    className: 'มัธยมศึกษาปีที่ 4/1',
    assignmentTitle: 'ใบงานที่ 1: การเขียนโปรแกรมเบื้องต้นด้วยภาษา Python',
    submissionDate: '2026-07-06 18:40',
    status: 'ต้องแก้ไข',
    fileUrl: 'https://drive.google.com/open?id=mock_file_id_3',
    fileName: 'ม4-1_พิมพิกา_Python.py',
    remarks: 'สูตรการคำนวณผิดพลาดเล็กน้อย (สูตรพื้นที่สามเหลี่ยมคือ 0.5 * ฐาน * สูง หนูสลับเป็นบวก) รบกวนแก้ไขส่งใหม่นะคะ'
  },
  {
    id: 'sub4',
    studentNo: '1',
    studentName: 'เด็กชายอนันต์ แก้วดี',
    className: 'มัธยมศึกษาปีที่ 4/2',
    assignmentTitle: 'โครงงานวิทยาศาสตร์ บทที่ 1-3 (ฉบับร่าง)',
    submissionDate: '2026-07-07 11:20',
    status: 'ส่งแล้ว',
    fileUrl: 'https://drive.google.com/open?id=mock_file_id_4',
    fileName: 'ม4-2_อนันต์_โครงงานวิทย์_บท1-3.pdf',
    remarks: ''
  }
];
