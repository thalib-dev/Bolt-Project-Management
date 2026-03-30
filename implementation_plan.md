# [Project Management System - Phase 2: Feature Completeness]

I have audited the system against the 72-hour challenge requirements. While the core dashboard and multi-tenant logic are stable, several specific P1/P2 features (Gantt, Calendar, File Uploads, Exports) need to be implemented to achieve 100% compliance.

## Proposed Changes

### 1. Project & Task Management Enhancements
- [ ] **Task Creation Form**: Add fields for `assigneeId`, `dueDate`, and `priority` in the "Add Task" dialog.
- [ ] **Subtask Management**: Add a "Create Subtask" button within the Task Detail dialog.
- [ ] **Task Dependencies**: Add a "Blockers" selector in the Task Detail dialog to link tasks.
- [ ] **Views**:
    - [ ] **Calendar View**: Implement a full-page or tabbed calendar component in the Project Detail page.
    - [ ] **Gantt Chart**: Implement a basic horizontal bar chart showing task timelines (Start -> End).

### 2. Team Collaboration
- [ ] **File Attachments**: 
    - [ ] **Backend**: Create `/api/tasks/:id/attachments` endpoint with `multer` storage.
    - [ ] **Frontend**: Add a file upload zone in the Task Detail dialog.
- [ ] **In-App Notifications**:
    - [ ] **Backend**: Trigger notifications when a task is assigned or a status changes.
    - [ ] **Frontend**: Add a notification bell/dropdown in the Sidebar with real-time (polling for now) updates.
- [ ] **@Mentions**: Enhance comment parsing to highlight @users (basic implementation).

### 3. Reporting & Analytics
- [ ] **Export Options**:
    - [ ] **CSV/Excel**: Implement a "Download CSV" utility for project tasks.
    - [ ] **PDF/Print**: Add media-print CSS styles to ensure the Dashboard and Report pages look professional when printed (Save to PDF).
- [ ] **Time Utilization**: Add a "Time per Member" chart in the Reports page aggregating `TimeEntry` data.

### 4. Resource Management
- [ ] **Team Availability**: Add a "Busy/Available" status indicator in the Team Resource page based on current task load.

## Verification Plan

### Automated Tests
- Run `npm run build` in both workspaces to ensure type safety.
- Test API endpoints for file uploads and dependency creation using Postman.

### Manual Verification
- **Gantt Chart**: Verify that tasks with start/due dates align correctly in the timeline.
- **File Upload**: Upload a PDF/Image to a task and verify it can be downloaded/viewed.
- **Notifications**: Assign a task to another user and verify they see a notification.
