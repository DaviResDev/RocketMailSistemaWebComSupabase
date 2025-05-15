
import { fetchUserSettings } from './fetchSettings';
import { saveUserSettings } from './saveSettings';
import { uploadProfilePhoto } from './uploadPhoto';
import { testSmtpConnection } from './testSmtp';

export { 
  fetchUserSettings,
  saveUserSettings,
  uploadProfilePhoto,
  testSmtpConnection
};

// Re-export types for convenience
export { Settings, SettingsFormData } from './types';
