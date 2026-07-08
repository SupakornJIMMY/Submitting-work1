import React, { useState } from 'react';
import { Copy, Check, FileText, FolderOpen, Code, Settings, Link, HelpCircle } from 'lucide-react';

export default function AppsScriptGuide() {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState<string | null>(null);

  const googleAppsScriptCode = `/**
 * =========================================================================
 * ระบบส่งงานนักเรียนแบบครบชุด (Student Assignment Submission System)
 * ระบบหลังบ้าน Google Apps Script (เชื่อมต่อ Google Sheets & Google Drive)
 * =========================================================================
 * 
 * วิธีการติดตั้งและใช้งาน:
 * 1. สร้าง Google Sheet ใหม่ และเปิด "ตัวเลือกขั้นสูง" > "ส่วนขยาย" > "Apps Script"
 * 2. คัดลอกโค้ดทั้งหมดด้านล่างนี้ไปวางแทนที่โค้ดเดิมในเครื่องมือแก้ไขของ Apps Script
 * 3. หากมีโฟลเดอร์ใน Google Drive ที่ต้องการให้เป็นโฟลเดอร์หลักในการเก็บงาน ให้ใส่ ID ในตัวแปร PARENT_FOLDER_ID ด้านล่าง
 *    (หากเว้นว่างไว้ ระบบจะสร้างโฟลเดอร์ชื่อ "ระบบส่งงานนักเรียน_โฟลเดอร์หลัก" ให้โดยอัตโนมัติ)
 * 4. กดบันทึก และทำการ "ทำให้ใช้งานได้" (Deploy) เป็น "เว็บแอป" (Web App)
 *    - เลือกประเภท: เว็บแอป (Web App)
 *    - ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone)
 * 5. คัดลอก URL ของเว็บแอปที่ได้ มาใส่ในหน้าตั้งค่าเชื่อมต่อระบบบนเว็บไซต์นี้
 */

// ใส่ ID ของโฟลเดอร์ Google Drive หลักที่นี่ (ถ้าต้องการ) หรือปล่อยว่างไว้ให้ระบบสร้างให้เอง
const PARENT_FOLDER_ID = ""; 

function doGet(e) {
  // รองรับการดึงข้อมูลทั้งหมดเพื่อแสดงผล
  try {
    initSheets(); // ตรวจสอบและสร้างชีตเริ่มต้นถ้ายังไม่มี
    const data = getAllData();
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    initSheets();
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    let result = { success: false, message: "ไม่มี Action ที่ต้องการ" };

    if (action === "submitAssignment") {
      result = submitAssignment(requestData);
    } else if (action === "updateSubmission") {
      result = updateSubmission(requestData);
    } else if (action === "manageClasses") {
      result = manageClasses(requestData);
    } else if (action === "manageStudents") {
      result = manageStudents(requestData);
    } else if (action === "manageAssignments") {
      result = manageAssignments(requestData);
    } else if (action === "syncAllData") {
      result = { success: true, data: getAllData() };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันระบุหรือสร้างโฟลเดอร์หลัก
function getParentFolder() {
  if (PARENT_FOLDER_ID && PARENT_FOLDER_ID.trim() !== "") {
    try {
      return DriveApp.getFolderById(PARENT_FOLDER_ID);
    } catch (e) {
      // หากเข้าถึงไม่ได้ ให้ fallback ไปใช้โฟลเดอร์ใหม่
    }
  }
  
  const folderName = "ระบบส่งงานนักเรียน_โฟลเดอร์หลัก";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

// ฟังก์ชันหาหรือสร้างโฟลเดอร์ย่อย (แยกตามห้องและชื่องาน)
function getTargetFolder(className, assignmentTitle) {
  const parentFolder = getParentFolder();
  
  // 1. หาหรือสร้างโฟลเดอร์ห้องเรียน
  let classFolder;
  const classFolders = parentFolder.getFoldersByName(className);
  if (classFolders.hasNext()) {
    classFolder = classFolders.next();
  } else {
    classFolder = parentFolder.createFolder(className);
  }
  
  // 2. หาหรือสร้างโฟลเดอร์งานย่อยภายในโฟลเดอร์ห้องเรียน
  let assignmentFolder;
  const assignmentFolders = classFolder.getFoldersByName(assignmentTitle);
  if (assignmentFolders.hasNext()) {
    assignmentFolder = assignmentFolders.next();
  } else {
    assignmentFolder = classFolder.createFolder(assignmentTitle);
  }
  
  return assignmentFolder;
}

// ฟังก์ชันส่งงานนักเรียนพร้อมอัปโหลดไฟล์
function submitAssignment(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Submissions");
  
  let fileUrl = data.linkUrl || ""; // ใช้ลิงก์ภายนอกที่ส่งมา (ถ้ามี)
  let uploadedFileName = data.fileName || "ลิงก์ส่งงาน";
  
  // อัปโหลดไฟล์ไปยัง Google Drive
  if (data.fileBase64 && data.fileBase64 !== "") {
    try {
      const targetFolder = getTargetFolder(data.className, data.assignmentTitle);
      
      // แปลงข้อมูล Base64 กลับเป็นไฟล์จริง
      const byteCharacters = Utilities.base64Decode(data.fileBase64.split(",")[1] || data.fileBase64);
      const blob = Utilities.newBlob(byteCharacters, data.fileType, data.fileName);
      
      // อัปโหลดไฟล์
      const file = targetFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW); // ตั้งค่าให้ทุกคนที่มีลิงก์สามารถดูได้ เพื่อให้คุณครูกดเปิดดูง่าย
      
      fileUrl = file.getUrl();
      uploadedFileName = file.getName();
    } catch (uploadError) {
      return { success: false, message: "ไม่สามารถอัปโหลดไฟล์ไปยัง Google Drive ได้: " + uploadError.toString() };
    }
  }

  // วันและเวลาปัจจุบัน (เวลาไทย GMT+7)
  const dateStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm");
  const submissionId = "SUB" + new Date().getTime();

  // บันทึกข้อมูลลง Google Sheet
  sheet.appendRow([
    submissionId,
    data.studentNo,
    data.studentName,
    data.className,
    data.assignmentTitle,
    dateStr,
    "รอตรวจ", // สถานะเริ่มต้นเมื่อส่งงาน
    fileUrl,
    uploadedFileName,
    data.remarks || ""
  ]);

  return { 
    success: true, 
    message: "บันทึกข้อมูลการส่งงานสำเร็จ", 
    submissionId: submissionId,
    fileUrl: fileUrl 
  };
}

// ฟังก์ชันปรับปรุงสถานะและหมายเหตุจากคุณครู
function updateSubmission(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Submissions");
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString() === data.submissionId.toString()) {
      sheet.getCell(i + 1, 7).setValue(data.status); // คอลัมน์ G คือสถานะ
      sheet.getCell(i + 1, 10).setValue(data.remarks || ""); // คอลัมน์ J คือหมายเหตุ
      return { success: true, message: "ปรับปรุงสถานะงานสำเร็จ" };
    }
  }
  return { success: false, message: "ไม่พบข้อมูลรหัสส่งงานนี้" };
}

// จัดการข้อมูลห้องเรียน (เพิ่ม / แก้ไข / ลบ)
function manageClasses(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Classes");
  const rows = sheet.getDataRange().getValues();
  
  if (data.operation === "add") {
    const newId = "C" + new Date().getTime();
    sheet.appendRow([newId, data.classData.name]);
    return { success: true, message: "เพิ่มห้องเรียนสำเร็จ", id: newId };
  }
  
  if (data.operation === "edit") {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.classData.id.toString()) {
        sheet.getCell(i + 1, 2).setValue(data.classData.name);
        return { success: true, message: "แก้ไขข้อมูลห้องเรียนสำเร็จ" };
      }
    }
  }
  
  if (data.operation === "delete") {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.classData.id.toString()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "ลบห้องเรียนสำเร็จ" };
      }
    }
  }
  
  return { success: false, message: "ไม่พบการดำเนินงานที่ระบุ" };
}

// จัดการข้อมูลนักเรียน (เพิ่ม / แก้ไข / ลบ)
function manageStudents(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Students");
  const rows = sheet.getDataRange().getValues();
  
  if (data.operation === "add") {
    const newId = "S" + new Date().getTime();
    sheet.appendRow([newId, data.studentData.studentId, data.studentData.name, data.studentData.classId]);
    return { success: true, message: "เพิ่มรายชื่อนักเรียนสำเร็จ", id: newId };
  }
  
  if (data.operation === "edit") {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.studentData.id.toString()) {
        sheet.getCell(i + 1, 2).setValue(data.studentData.studentId);
        sheet.getCell(i + 1, 3).setValue(data.studentData.name);
        sheet.getCell(i + 1, 4).setValue(data.studentData.classId);
        return { success: true, message: "แก้ไขข้อมูลนักเรียนสำเร็จ" };
      }
    }
  }
  
  if (data.operation === "delete") {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.studentData.id.toString()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "ลบรายชื่อนักเรียนสำเร็จ" };
      }
    }
  }
  
  return { success: false, message: "ไม่พบการดำเนินงานที่ระบุ" };
}

// จัดการข้อมูลภาระงาน (เพิ่ม / แก้ไข / ลบ)
function manageAssignments(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Assignments");
  const rows = sheet.getDataRange().getValues();
  
  if (data.operation === "add") {
    const newId = "A" + new Date().getTime();
    sheet.appendRow([newId, data.assignmentData.title, data.assignmentData.description, data.assignmentData.dueDate]);
    return { success: true, message: "เพิ่มรายการงานสำเร็จ", id: newId };
  }
  
  if (data.operation === "edit") {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.assignmentData.id.toString()) {
        sheet.getCell(i + 1, 2).setValue(data.assignmentData.title);
        sheet.getCell(i + 1, 3).setValue(data.assignmentData.description);
        sheet.getCell(i + 1, 4).setValue(data.assignmentData.dueDate);
        return { success: true, message: "แก้ไขข้อมูลงานสำเร็จ" };
      }
    }
  }
  
  if (data.operation === "delete") {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.assignmentData.id.toString()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "ลบงานสำเร็จ" };
      }
    }
  }
  
  return { success: false, message: "ไม่พบการดำเนินงานที่ระบุ" };
}

// ฟังก์ชันดึงข้อมูลทั้งหมดจากชีตเพื่อส่งไปยังหน้าบ้านเว็บแอป
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const classesSheet = ss.getSheetByName("Classes");
  const studentsSheet = ss.getSheetByName("Students");
  const assignmentsSheet = ss.getSheetByName("Assignments");
  const submissionsSheet = ss.getSheetByName("Submissions");
  
  const classesRaw = classesSheet.getDataRange().getValues();
  const studentsRaw = studentsSheet.getDataRange().getValues();
  const assignmentsRaw = assignmentsSheet.getDataRange().getValues();
  const submissionsRaw = submissionsSheet.getDataRange().getValues();
  
  const classes = [];
  for (let i = 1; i < classesRaw.length; i++) {
    classes.push({ id: classesRaw[i][0].toString(), name: classesRaw[i][1] });
  }
  
  const students = [];
  for (let i = 1; i < studentsRaw.length; i++) {
    students.push({ 
      id: studentsRaw[i][0].toString(), 
      studentId: studentsRaw[i][1].toString(), 
      name: studentsRaw[i][2], 
      classId: studentsRaw[i][3].toString() 
    });
  }
  
  const assignments = [];
  for (let i = 1; i < assignmentsRaw.length; i++) {
    assignments.push({ 
      id: assignmentsRaw[i][0].toString(), 
      title: assignmentsRaw[i][1], 
      description: assignmentsRaw[i][2], 
      dueDate: assignmentsRaw[i][3] ? Utilities.formatDate(new Date(assignmentsRaw[i][3]), "GMT+7", "yyyy-MM-dd") : "" 
    });
  }
  
  const submissions = [];
  for (let i = 1; i < submissionsRaw.length; i++) {
    submissions.push({
      id: submissionsRaw[i][0].toString(),
      studentNo: submissionsRaw[i][1].toString(),
      studentName: submissionsRaw[i][2],
      className: submissionsRaw[i][3],
      assignmentTitle: submissionsRaw[i][4],
      submissionDate: submissionsRaw[i][5],
      status: submissionsRaw[i][6],
      fileUrl: submissionsRaw[i][7],
      fileName: submissionsRaw[i][8],
      remarks: submissionsRaw[i][9] || ""
    });
  }
  
  return {
    classes: classes,
    students: students,
    assignments: assignments,
    submissions: submissions
  };
}

// ตรวจสอบและสร้างหน้าชีตที่จำเป็น พร้อมกำหนดหัวคอลัมน์เริ่มต้น
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ชีตห้องเรียน Classes
  let sheet = ss.getSheetByName("Classes");
  if (!sheet) {
    sheet = ss.insertSheet("Classes");
    sheet.appendRow(["ID", "Name"]);
    // เพิ่มข้อมูลห้องเรียนเริ่มต้นตัวอย่าง
    sheet.appendRow(["C1", "มัธยมศึกษาปีที่ 4/1"]);
    sheet.appendRow(["C2", "มัธยมศึกษาปีที่ 4/2"]);
  }
  
  // 2. ชีตรายชื่อนักเรียน Students
  sheet = ss.getSheetByName("Students");
  if (!sheet) {
    sheet = ss.insertSheet("Students");
    sheet.appendRow(["ID", "StudentID_No", "Name", "ClassID"]);
    // เพิ่มรายชื่อเริ่มต้นตัวอย่าง
    sheet.appendRow(["S1", "1", "เด็กชายณภัทร สมบูรณ์ดี", "C1"]);
    sheet.appendRow(["S2", "2", "เด็กชายกิตติภพ รักเรียน", "C1"]);
    sheet.appendRow(["S3", "3", "เด็กหญิงพิมพิกา มีสุขใจ", "C1"]);
    sheet.appendRow(["S4", "1", "เด็กชายอนันต์ แก้วดี", "C2"]);
  }
  
  // 3. ชีตชิ้นงาน Assignments
  sheet = ss.getSheetByName("Assignments");
  if (!sheet) {
    sheet = ss.insertSheet("Assignments");
    sheet.appendRow(["ID", "Title", "Description", "DueDate"]);
    // เพิ่มภาระงานเริ่มต้นตัวอย่าง
    sheet.appendRow(["A1", "ใบงานที่ 1: การเขียนโปรแกรมเบื้องต้นด้วยภาษา Python", "ให้นักเรียนเขียนโปรแกรมคำนวณพื้นที่รูปสามเหลี่ยม โดยแสดงผลออกทางหน้าจอ ส่งงานเป็นไฟล์ .py หรือ .txt", "2026-07-15"]);
    sheet.appendRow(["A2", "โครงงานวิทยาศาสตร์ บทที่ 1-3 (ฉบับร่าง)", "ให้อัปโหลดไฟล์เอกสารบทที่ 1-3 ส่งงานเป็นไฟล์ PDF", "2026-07-20"]);
  }
  
  // 4. ชีตส่งงาน Submissions
  sheet = ss.getSheetByName("Submissions");
  if (!sheet) {
    sheet = ss.insertSheet("Submissions");
    sheet.appendRow(["ID", "StudentNo", "StudentName", "ClassName", "AssignmentTitle", "SubmissionDate", "Status", "FileURL", "FileName", "Remarks"]);
  }
  
  // ลบชีตเริ่มต้นชื่อ "Sheet1" หรือ "แผ่นงาน1" (ถ้าว่างและมีชีตอื่นแล้ว)
  const defaultSheet1 = ss.getSheetByName("Sheet1") || ss.getSheetByName("แผ่นงาน1");
  if (defaultSheet1 && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet1);
    } catch (e) {}
  }
}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedHeaders(type);
      setTimeout(() => setCopiedHeaders(null), 2000);
    }
  };

  return (
    <div id="gas-guide-panel" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-4xl mx-auto my-6 font-sans">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">คู่มือการติดตั้ง Google Sheets และ Apps Script</h2>
          <p className="text-sm text-slate-500">ทำตามทีละขั้นตอนเพื่อเปลี่ยนระบบเป็นออนไลน์ใช้งานได้จริงฟรี 100%</p>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-6">
        {/* Step 1 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold flex items-center justify-center text-sm">
              1
            </div>
            <div className="w-0.5 h-full bg-slate-100"></div>
          </div>
          <div className="pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              สร้าง Google Spreadsheet
            </h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              ไปที่ <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Google Sheets</a> แล้วสร้างสเปรดชีตเปล่าใหม่ 1 ไฟล์ (จะตั้งชื่ออะไรก็ได้ เช่น <span className="font-mono bg-slate-50 px-1 py-0.5 rounded text-xs">"ระบบส่งงานนักเรียน"</span>)
            </p>
            <div className="mt-2 bg-amber-50 border border-amber-100 p-3 rounded-lg text-xs text-amber-800">
              <span className="font-semibold">💡 แนะนำ:</span> คุณสามารถปล่อยให้สเปรดชีตว่างเปล่าได้เลย! เมื่อติดตั้งสคริปต์เสร็จและกดเรียกใช้งานครั้งแรก สคริปต์จะสร้างตารางแผ่นงาน (<span className="font-semibold">Classes, Students, Assignments, Submissions</span>) และโครงสร้างคอลัมน์ให้โดยอัตโนมัติ
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold flex items-center justify-center text-sm">
              2
            </div>
            <div className="w-0.5 h-full bg-slate-100"></div>
          </div>
          <div className="pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Code size={18} className="text-purple-500" />
              ติดตั้ง Google Apps Script
            </h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              ในหน้า Google Spreadsheet ของคุณ ให้กดปุ่มเมนูด้านบน <span className="font-semibold">"ส่วนขยาย" (Extensions)</span> &gt; เลือก <span className="font-semibold">"Apps Script"</span>
              จากนั้นลบโค้ดเดิมทั้งหมดในไฟล์ <span className="font-mono text-xs">Code.gs</span> ออก แล้วคัดลอกสคริปต์แบบเต็มชุดนี้ไปวางแทนที่:
            </p>

            {/* Code Box */}
            <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-slate-900 text-slate-300">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-xs font-mono text-slate-400">Code.gs</span>
                <button
                  onClick={() => copyToClipboard(googleAppsScriptCode, 'script')}
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                  id="btn-copy-script"
                >
                  {copiedScript ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>คัดลอกสคริปต์</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono leading-relaxed max-h-56 overflow-y-auto">
                {googleAppsScriptCode}
              </pre>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-semibold flex items-center justify-center text-sm">
              3
            </div>
            <div className="w-0.5 h-full bg-slate-100"></div>
          </div>
          <div className="pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FolderOpen size={18} className="text-emerald-500" />
              ตั้งค่าโฟลเดอร์สำหรับเก็บไฟล์งาน
            </h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              ไปที่ <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Google Drive</a> ของคุณ
            </p>
            <ul className="list-disc list-inside text-xs text-slate-500 mt-1 space-y-1 ml-1 leading-relaxed">
              <li>สร้างโฟลเดอร์ใหม่ขึ้นมา เช่น ตั้งชื่อว่า <span className="font-semibold">"งานส่งของนักเรียนทั้งหมด"</span></li>
              <li>ดับเบิ้ลคลิกเข้าในโฟลเดอร์นั้น แล้วดูที่แถบ URL บนบราวเซอร์ คัดลอกรหัสอักขระแปลกๆ หลังสุด (นั่นคือ Folder ID เช่น <span className="font-mono bg-slate-50 text-xs px-1 rounded text-pink-600 font-medium">1A2B3C4D5E...</span>)</li>
              <li>นำรหัส Folder ID นั้นไปวางแทนที่ในบรรทัดที่ <span className="font-semibold font-mono">const PARENT_FOLDER_ID = "ใส่รหัสที่นี่";</span> ใน Apps Script</li>
              <li><span className="font-semibold text-emerald-600">จุดเด่นพิเศษ:</span> ถ้าคุณไม่กำหนดรหัสโฟลเดอร์ ระบบจะสร้างโฟลเดอร์ชื่อ <span className="font-semibold">"ระบบส่งงานนักเรียน_โฟลเดอร์หลัก"</span> ไว้ที่หน้าแรกของไดรฟ์ให้เองโดยอัตโนมัติ!</li>
            </ul>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-semibold flex items-center justify-center text-sm">
              4
            </div>
            <div className="w-0.5 h-full bg-slate-100"></div>
          </div>
          <div className="pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Link size={18} className="text-amber-500" />
              การทำการติดตั้งใช้งาน (Deploy Web App)
            </h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              เพื่อให้เว็บสคริปต์นี้เป็นบริการออนไลน์ ให้ทำตามขั้นตอนการ Deploy ดังนี้:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-500 mt-2 space-y-2 ml-1 leading-relaxed">
              <li>ที่มุมขวาบนของหน้า Apps Script กดปุ่ม <span className="bg-blue-600 text-white font-medium px-2 py-0.5 rounded text-[10px]">ทำให้ใช้งานได้ (Deploy)</span> &gt; เลือก <span className="font-semibold text-slate-700">"การทำให้ใช้งานได้ใหม่" (New deployment)</span></li>
              <li>กดสัญลักษณ์ ⚙️ เฟืองหน้ารายการ เลือกประเภทการติดตั้งใช้งานเป็น <span className="font-semibold text-slate-700">"เว็บแอป" (Web app)</span></li>
              <li>ตั้งค่ารายละเอียด:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-500">
                  <li><span className="font-semibold text-slate-700">คำอธิบาย:</span> ระบบส่งงานนักเรียน</li>
                  <li><span className="font-semibold text-slate-700">เรียกใช้งานในฐานะ:</span> ตัวคุณเอง (<span className="text-pink-600">Me - อีเมลของคุณ</span>)</li>
                  <li><span className="font-semibold text-slate-700">ผู้มีสิทธิ์เข้าถึง:</span> ทุกคน (<span className="text-emerald-600 font-semibold">Anyone</span>) &lt;-- <span className="text-amber-600 font-medium">สำคัญมาก! เพื่อให้นักเรียนเข้าส่งข้อมูลได้</span></li>
                </ul>
              </li>
              <li>กดปุ่ม <span className="font-semibold text-slate-700">"ทำให้ใช้งานได้" (Deploy)</span></li>
              <li>ระบบจะขึ้นหน้าต่างให้ <span className="font-semibold">"ให้สิทธิ์เข้าถึง" (Authorize Access)</span> เพื่อให้สคริปต์ทำงานร่วมกับชีตและไดรฟ์ของคุณ:
                <ul className="list-disc list-inside ml-4 mt-1 text-[11px] text-slate-500">
                  <li>เลือกอีเมล Google ของคุณ</li>
                  <li>หากขึ้นหน้าต่างคำเตือนความปลอดภัยสีเทา ให้กดคำว่า <span className="font-semibold">"ขั้นสูง" (Advanced)</span> &gt; กดเลือก <span className="font-semibold">"ไปที่... (ไม่ปลอดภัย)" (Go to ... (unsafe))</span></li>
                  <li>กดปุ่ม <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-medium">อนุญาต (Allow)</span></li>
                </ul>
              </li>
              <li>คัดลอก <span className="font-semibold text-blue-600">"URL ของเว็บแอป" (Web App URL)</span> ที่ได้ (ลิงก์จะลงท้ายด้วย <span className="font-mono bg-slate-50 px-1 py-0.5 rounded text-[10px]">/exec</span>) เพื่อเอามาเชื่อมต่อในเว็บไซต์นี้</li>
            </ol>
          </div>
        </div>

        {/* Step 5 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-semibold flex items-center justify-center text-sm">
              5
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Settings size={18} className="text-pink-500" />
              นำมาเชื่อมต่อกับเว็บนี้
            </h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              นำ URL ที่คัดลอกไว้ไปใส่ในเมนู <span className="font-semibold">"เชื่อมต่อระบบ (Sheets/Drive)"</span> ในหน้าระบบควบคุมของคุณครู จากนั้นกดบันทึก ระบบจะเริ่มทำงานในโหมดเชื่อมต่อจริงทันที!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
