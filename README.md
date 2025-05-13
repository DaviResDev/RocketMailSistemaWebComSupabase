
# DisparoPro - Email Marketing Platform

## Email Sending System

DisparoPro uses a dual system for sending emails:

1. **SMTP with Nodemailer**: Send emails directly through your own SMTP server
   - Allows sending from your domain
   - Complete control over email delivery
   - Supports all major email providers: Gmail, Outlook, Zoho, etc.

2. **Resend API**: Fallback service for when SMTP isn't configured
   - Easy to set up
   - High deliverability
   - Domain verification available

## Configuration

Users can configure their email sending preferences in the Settings page:

- Toggle between SMTP and Resend service
- Configure SMTP settings:
  - SMTP Server
  - Port
  - Security type (TLS/SSL)
  - Username/Password

## Technical Implementation

- Backend uses Nodemailer for SMTP connections
- Resend API integration for fallback or when SMTP isn't configured
- Automatic error handling and connection timeout settings
- Built with security and reliability in mind

## Error Handling

The system features comprehensive error handling:

- Connection timeouts with appropriate messages
- Authentication failure handling
- Port auto-correction for common typos (584 → 587)
- Fallback to Resend if SMTP fails
