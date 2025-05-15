
// This file is maintained for backward compatibility
// It re-exports all functionality from the new modular structure

import {
  fetchUserSettings,
  saveUserSettings,
  uploadProfilePhoto,
  testSmtpConnection
} from './settings';

export {
  fetchUserSettings,
  saveUserSettings,
  uploadProfilePhoto,
  testSmtpConnection
};

// Correctly re-export types
export type { Settings, SettingsFormData } from './settings/types';
