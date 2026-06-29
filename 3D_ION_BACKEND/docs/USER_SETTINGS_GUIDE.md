# User Settings Implementation Guide

## Overview
This guide explains the new user settings page that was added to the ION3D Platform. Users can now manage their personal information and system preferences from a dedicated settings page.

## Features Implemented

### 1. **Settings Page** (`/settings`)
- **Location**: `/app/settings/page.tsx` (Frontend)
- **Access**: Click on the username in the header navigation
- **Features**:
  - Tabs for "Dados Pessoais" (Personal Data) and "Sistema" (System)
  - Responsive design with sidebar tabs on desktop, horizontal tabs on mobile

### 2. **Personal Data Tab** (`/Dados Pessoais`)
Users can edit the following information:
- **Name** (Editable)
- **Institution** (Editable)
- **Email** (Read-only - Cannot be changed)
- **Phone Number** (Editable)
- **Instagram** (Editable - Optional)
- **Password Change** (Optional):
  - Requires the user to enter the current password
  - New password must be at least 8 characters
  - New password must be confirmed with a matching confirmation field

**Important**: 
- All changes require the user to confirm with their password when saving
- Password changes require both the old and new password
- Email cannot be modified for security reasons

### 3. **Sistema (System) Tab**
- **Email Notifications Toggle**: Users can choose whether to receive email notifications
- **Password Confirmation**: All changes require password confirmation

## Backend Endpoints

### User Profile Endpoints

#### 1. Get User Profile
```
GET /api/v1/users/profile
Headers: Authorization: Bearer <JWT_TOKEN>
```
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "John Doe",
    "institution": "University",
    "email": "john@example.com",
    "phone_number": "1234567890",
    "instagram": "@johndoe",
    "email_notifications": true,
    "user_type": "pesquisador"
  }
}
```

#### 2. Update User Profile
```
PUT /api/v1/users/update
Headers: 
  - Authorization: Bearer <JWT_TOKEN>
  - Content-Type: application/json

Body:
{
  "name": "New Name",
  "institution": "New Institution",
  "phone_number": "9876543210",
  "instagram": "@newinstagram",
  "oldPassword": "current_password",  // Optional, only if changing password
  "newPassword": "new_password",      // Optional, must pair with oldPassword
  "confirmPassword": "current_password" // Required
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { /* updated user data */ }
}
```

#### 3. Update User Settings
```
PUT /api/v1/users/settings
Headers:
  - Authorization: Bearer <JWT_TOKEN>
  - Content-Type: application/json

Body:
{
  "email_notifications": true,
  "confirmPassword": "current_password"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": { /* updated user data */ }
}
```

## Database Changes Required

### Add `email_notifications` Column to `researchers` Table

Execute the following SQL in Supabase SQL Editor:

```sql
-- Add email_notifications column to researchers table
ALTER TABLE public.researchers 
ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE;

-- Create index for better performance
CREATE INDEX idx_researchers_email_notifications 
ON public.researchers(email_notifications);

-- Add column documentation
COMMENT ON COLUMN public.researchers.email_notifications IS 'Indicates whether the user wants to receive email notifications';
```

**File Location**: `app/schemas/add_email_notifications.sql`

## Frontend Components

### Component Files Created:

1. **SettingsSidebar.tsx** - Sidebar navigation with tabs
2. **PersonalDataForm.tsx** - Form for editing personal information
3. **SystemSettings.tsx** - System preferences (notifications toggle)
4. **page.tsx** - Main settings page component

### Styling
All components use Tailwind CSS with a green color scheme (`green-600`) matching the rest of the application.

## Header Updates

The header in `src/components/layout/Header.tsx` was updated:
- The username is now a clickable link instead of plain text
- Clicking the username navigates to `/settings`
- Works on both desktop and mobile views

## Authentication

The settings page requires:
1. Valid JWT token (obtained during login)
2. User to be authenticated
3. Password confirmation for all changes (security measure)

### Unauthenticated Access
- If user is not logged in, they will be redirected to `/login`
- The `/settings` route is protected by the `AuthProvider`

## Security Features

1. **Password Confirmation**: All changes require the user to enter their current password
2. **Email Immutability**: Email cannot be changed through the settings interface
3. **Token Validation**: All endpoints require valid JWT authentication
4. **Password Hashing**: Passwords are hashed using bcrypt with salt

## Testing the Implementation

### 1. Test User Profile Fetch
```bash
curl -X GET http://localhost:8000/api/v1/users/profile \
  -H "Authorization: Bearer <your_token>"
```

### 2. Test Profile Update
```bash
curl -X PUT http://localhost:8000/api/v1/users/update \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Name",
    "confirmPassword": "current_password"
  }'
```

### 3. Test Settings Update
```bash
curl -X PUT http://localhost:8000/api/v1/users/settings \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": true,
    "confirmPassword": "current_password"
  }'
```

## Frontend Testing

1. **Log in** as a user
2. **Click on your username** in the header (top right)
3. **You should be redirected** to `/settings`
4. **Edit your information** in the "Dados Pessoais" tab
5. **Toggle notifications** in the "Sistema" tab
6. **Confirm all changes** with your password

## File Structure

```
Frontend:
- src/components/settings/
  ├── SettingsSidebar.tsx
  ├── PersonalDataForm.tsx
  └── SystemSettings.tsx
- app/settings/
  └── page.tsx

Backend:
- app/routers/
  └── users.py (NEW)
- app/schemas/
  └── add_email_notifications.sql (NEW)
```

## Notes

- The settings page uses `useAuthStore` from Zustand for state management
- The PersonalDataForm component uses a prompt dialog for password confirmation (can be improved with a modal component)
- Email notifications are currently stored in the database but not yet integrated with the email sending system
- Consider adding email verification when users change their email addresses in future updates

## Future Enhancements

1. **Email Change Verification**: Send verification email when user changes email
2. **Two-Factor Authentication**: Add optional 2FA
3. **Session Management**: Show active sessions and allow logout from other devices
4. **Activity Log**: Display account activity history
5. **Export Data**: Allow users to download their data
6. **Delete Account**: Add account deletion functionality
