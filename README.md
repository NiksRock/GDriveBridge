# 🌉 GDriveBridge

**GDriveBridge** is a web-based application that allows users to transfer selected folders from one personal Google Drive account to another.

It provides a seamless way to:

✅ Login with two Google accounts  
✅ Select a folder from the source account  
✅ Transfer files into the destination account  
✅ Remove files from the source after successful transfer  

---

## 🚀 Project Overview

The purpose of **GDriveBridge** is to help users migrate folders between two normal Gmail-based Google Drive accounts.

Since Google does not allow direct ownership transfer between personal accounts, this tool performs a safe:

**Copy → Verify → Delete Source**

---

## 🎯 Key Features

- 🔑 Dual Google OAuth Login  
  - Source Account (Account A)  
  - Destination Account (Account B)

- 📂 Folder Selection from Source Drive  
- 🔄 Transfer Files & Subfolders  
- 🗑️ Auto Delete After Transfer  
- 📊 Progress Tracking & Summary Report  
- ⚠️ Error Handling + Retry Support  
- 📄 Supports Google Docs/Sheets/Slides via Export

---

## 🧩 Functional Requirements

### 1. User Authentication

- Two separate Google OAuth login buttons  
- Secure token storage for both accounts

### 2. Folder Selection

- Display all folders from the source account  
- Allow user to select one folder for migration

### 3. Folder Transfer

- Transfer all folder contents from Account A → Account B  
- Preserve folder hierarchy and file metadata where possible  
- Support Google Workspace file exports

### 4. Source Cleanup

- Delete files from the source only after successful upload  
- Ensure safe verification before removal

### 5. Progress & Reporting

- Show live progress percentage  
- Display completion summary with moved files count and errors

---

## 🔐 Non-Functional Requirements

### Security

- OAuth 2.0 authentication only  
- No password storage  
- Tokens encrypted in database/storage  
- Access restricted to authorized users

### Performance

- Supports folders up to 10,000 files  
- Optimized streaming transfer  
- Google API quota monitoring

### Reliability

- No data loss during transfer  
- Files deleted only after successful migration  
- Resume/retry support for failed transfers

### Compatibility

- Works on modern browsers  
- Supports Windows, macOS, and mobile web

---

## 🏗️ System Architecture

### Frontend (React)

UI Components:

- Source Login Button  
- Destination Login Button  
- Folder Picker  
- Transfer Dashboard  
- Progress & Status View  

### Backend (Node.js + Express)

Core Modules:

- OAuth Handler  
- Google Drive API Service  
- Transfer Engine  
- Logging & Error Handler  

---

## 🔄 Transfer Workflow

1. Authenticate Source Account  
2. Authenticate Destination Account  
3. Fetch folder list from Source Drive  
4. User selects folder  
5. Copy files one-by-one or in batches  
6. Verify successful upload  
7. Delete originals from source  
8. Display completion report  

---

## ⚠️ Constraints & Limitations

- Ownership transfer is not supported between personal Gmail accounts  
- Files must be copied + deleted instead of directly moved  
- Google Docs require export conversion  
- Google Drive API quota limits apply  

---

## 🌟 Future Enhancements

- Multi-folder transfer support  
- Scheduled automatic migration  
- Resume transfer after interruption  
- Drag-and-drop folder selection  
- Admin dashboard & analytics  

---

## 📦 Deliverables

- React Frontend UI  
- Node.js Backend API  
- OAuth Integration for Two Accounts  
- Folder Transfer Engine  
- Progress UI  
- Deployment Guide  
- Final Documentation  

---

## ✅ Acceptance Criteria

The project will be considered complete when:

- User can login with two Google accounts  
- Folder can be selected from source  
- Folder is transferred successfully to destination  
- Folder is removed from source  
- Progress + completion summary is displayed  
- Google Docs are transferred correctly  
- Errors do not cause data loss  

---

## 👨‍💻 Project Name

**GDriveBridge**  
*"Bridge your folders across Google Drives seamlessly."*

---

## 📌 License

This project is for educational and personal use.  
Google Drive API usage must comply with Google’s policies.

---

## 🙌 Author

Built with ❤️ by **Nikunj Patel**
