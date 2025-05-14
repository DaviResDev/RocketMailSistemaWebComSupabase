
# RocketMail

RocketMail is an email marketing platform built to make communication with your customers simple and effective.

## Features

- **Contact Management**: Create, import, and organize your contacts with custom tags
- **Email Templates**: Create reusable templates with variable placeholders
- **File Attachments**: Attach files and signatures to your templates
- **Scheduling**: Schedule emails for future delivery
- **Analytics**: Track opens, clicks, and other metrics
- **Custom SMTP**: Use your own SMTP server for improved deliverability

## Technology Stack

- React with TypeScript
- Supabase for backend and database
- Edge functions for email processing
- Tailwind CSS for styling
- ShadCN UI component library

## Getting Started

1. Sign up for an account
2. Configure your email settings
3. Import or add your contacts
4. Create templates
5. Send or schedule emails

## Contact Import

RocketMail supports importing contacts via CSV or Excel files with the following column mappings:

- Name: `nome`, `name`, `Nome`
- Email: `email`, `Email`, `e-mail`, `E-mail`
- Phone: `telefone`, `phone`, `Telefone`, `tel`, `Tel`
- Company: `cliente`, `client`, `Cliente`, `Client`
- Business Name: `razao_social`, `razão social`, `empresa`, `Empresa`, `company`, `Company`

## Email Variables

Templates support the following variables:

- `{nome}` - Contact name
- `{email}` - Contact email
- `{telefone}` - Contact phone number
- `{cliente}` - Contact company/client
- `{razao_social}` - Contact business name
- `{data}` - Current date 
- `{hora}` - Current time

## License

All rights reserved.
