# 📘 GDriveBridge — DEFT Document

**Design, Engineering, and Functional Requirements**
Version 1.0

---

## 1. Overview

GDriveBridge is a cloud-to-cloud Google Drive migration platform that allows users to transfer files and folders between two separate Google Drive accounts.

The core purpose of the product is to solve a very common real-world problem:

> “I have data in one Google Drive account, and I need to move or copy it into another account without downloading anything locally, without keeping my browser open, and with full visibility into transfer progress.”

The system must provide a seamless, reliable, and enterprise-grade transfer experience that works even for large folder structures, thousands of files, and long-running transfers.

---

## 2. Product Vision

A user should be able to:

- Connect two Google accounts
- Select folders/files from the source drive
- Choose a destination folder
- Start a transfer job
- Close the browser
- Come back later
- And still see the transfer completed successfully

The experience should feel like:

> “Google Drive migration made as simple as dragging a folder from one drive into another.”

---

## 3. User Story Narrative

Imagine a user named John.

John has two Google accounts:

- A personal Gmail account where he has years of data
- A company Google Workspace account where he needs to move everything

John opens GDriveBridge.

He connects his personal drive as the **Source Account**
and his work drive as the **Destination Account**.

He selects an entire folder called:

> “Marketing Assets 2024”

John wants the folder moved completely into:

> Work Drive → Q3 Imports

He clicks **Start Transfer**.

The system begins transferring files in the background.

John closes his laptop.

Later that night, the transfer continues.

The next morning, John logs back in and sees:

- 100% completed
- All files present in the destination
- Source deleted because he enabled “Move Mode”
- Full logs showing what happened

That is the expected product experience.

---

## 4. Core Functional Requirements

---

# 4.1 Account Connection & Identity

## Requirement

The application must allow users to securely connect two Google Drive accounts:

- Source Drive Account
- Destination Drive Account

This connection must be performed via Google OAuth 2.0.

---

## UI Expectations

Once connected, the UI must display clearly:

- Account email
- Profile avatar
- Storage usage (used/total)
- Connection status (verified/expired)
- Option to disconnect or change account

---

## Functional Rules

- Source and destination accounts must always remain distinct
- The same Google account cannot be connected in both roles
- Tokens must refresh automatically when expired

---

## Edge Conditions

- If the user revokes permissions, transfer must pause and request reconnection
- If OAuth fails, user must see a retry option

---

# 4.2 Source Drive Exploration & Selection

## Requirement

Users must be able to browse the complete folder/file structure of the source drive.

The system must support:

- Individual file selection
- Multi-file selection
- Entire folder selection
- Nested folder inclusion automatically

---

## UI Requirements

Source panel must provide:

- Search bar
- Folder/file name
- Size indicators
- Multi-select checkboxes
- Clear distinction between files vs folders

---

## Key Functional Rule: Folder Selection Hierarchy

To prevent duplication and deletion conflicts:

- If a parent folder is selected, none of its children may be selected separately
- Child items must become disabled automatically

Example:

User selects:

📁 Marketing Assets 2024

Then:

- Logos/
- Ads/
- Campaign.pdf

Become non-selectable.

This ensures only one transfer job exists per folder subtree.

---

## Edge Case Handling

- Selecting child first, then selecting parent → child auto-unselects
- Selecting parent first → children lock automatically
- Prevents parent deletion before child completion

---

# 4.3 Destination Path Targeting

## Requirement

Users must choose an exact destination folder where transferred content will be placed.

Destination browser must support:

- Folder tree navigation
- Breadcrumb path display
- Folder creation before transfer

---

## Rules

- Transfers cannot begin without a valid destination folder
- Destination folder must have write access
- Destination must remain valid during transfer execution

---

## Edge Conditions

- If destination folder is deleted mid-transfer, job must fail safely with clear message
- If user lacks permission, transfer cannot start

---

# 4.4 True Cloud-to-Cloud Transfer Execution

## Requirement

All transfers must occur directly between Google Drive accounts through Google Drive APIs.

At no point should files be downloaded locally.

Strictly forbidden:

- Browser downloads
- Temporary server disk storage
- User device caching

The system must function as a pure cloud bridge.

---

## Transfer Behaviors

- Files copied using Drive API copy operations
- Folder structures recreated recursively
- Metadata preserved when possible

---

## Constraints

Ownership transfer may not always be possible across Workspace domains.

System must warn users when metadata cannot be preserved fully.

---

# 4.5 Persistent Background Job Execution

## Requirement

Transfers must execute asynchronously via a backend job queue system.

Transfers must continue even if:

- User closes tab
- Browser crashes
- User logs out
- User disconnects temporarily

Transfers must not depend on client session.

---

## Engineering Expectations

- Transfer jobs must run inside persistent workers
- Job state stored in database
- Job queue handles retries and resume

---

# 4.6 Transfer Progress & Status Tracking

## Requirement

Users must see real-time transfer progress.

UI must display:

- Overall % completion
- Current file being transferred
- Files completed / total
- Estimated time remaining
- Transfer state:
  - Pending
  - In Progress
  - Paused
  - Completed
  - Failed
  - Retrying

---

## User Controls

Users must be able to:

- Pause transfer
- Resume transfer
- Cancel transfer safely

Cancel must stop future operations without deleting partial source data.

---

# 4.7 Transfer Options & Modes

## Preserve Metadata & Permissions

System should retain:

- Folder hierarchy
- File timestamps
- Sharing permissions (when supported)

---

## Move Mode: Delete Source After Transfer

If enabled:

1. Transfer must complete successfully
2. Destination must be verified
3. Only then source files/folders are deleted

No deletion is allowed if transfer fails partially.

---

## Edge Case Protection

Parent-child selection rule is mandatory here:

- Parent deletion must never break child transfers
- Only one deletion event per folder subtree

---

# 4.8 Reliability, Resume, and Fault Tolerance

Transfers must support:

- Retry on transient failures
- Resume from last completed file
- No duplicate transfers
- Failure isolation per file

---

## Common Failure Scenarios

- Google API quota exceeded
- Rate limit 429
- Network interruptions
- Permission revoked mid-transfer

System must respond gracefully with retry/backoff.

---

# 4.9 Security & Compliance

## Requirements

- OAuth tokens encrypted at rest
- User isolation enforced
- No cross-user access possible
- API usage compliant with Google policies

---

## Audit Requirements

Every transfer must generate logs:

- What was transferred
- What failed
- What was deleted
- Timestamped actions

---

# 4.10 Transfer History & Reporting

Users should have access to:

- Previous transfer sessions
- Completion status
- File-level logs
- Downloadable reports

This is essential for enterprise migration trust.

---

## 5. Non-Functional Requirements

- Must scale to drives with 100k+ files
- Must support long-running transfers (hours/days)
- UI must remain responsive always
- System must prevent duplicate job creation
- Transfers must be resumable after server restart

---

## 6. Final Development Roadmap

| Phase | Deliverable                      |
| ----- | -------------------------------- |
| 1     | OAuth + Account UI               |
| 2     | Source Browser + Selection Rules |
| 3     | Destination Picker               |
| 4     | Core Transfer Engine             |
| 5     | Persistent Queue + Workers       |
| 6     | Progress UI + Controls           |
| 7     | Move Mode + Safe Delete          |
| 8     | Retry/Resume + Fault Tolerance   |
| 9     | Security Hardening               |
| 10    | History + Logs                   |

---

# ✅ Conclusion

GDriveBridge must deliver a secure, reliable, background-capable, cloud-only Google Drive migration experience.

The system must ensure:

- No duplication
- No hierarchy selection conflicts
- No accidental deletions
- No browser dependency
- Full visibility and trust

---
