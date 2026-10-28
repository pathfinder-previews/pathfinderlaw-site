// Wording of the contact form (src/components/ContactForm.astro). English is the default; the Spanish pages pass the Spanish draft from
// src/data/spanish.ts. Only wording changes: the checkbox, the hidden trap field, the minimum
// fill time and the JSON sent to /api/contact are identical in every language.
export interface FormCopy {
  heading: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  hint: string;
  consent: string;
  honeypot: string;
  button: string;
  invalid: string; // browser check failed
  waiting: string; // bot check not finished yet
  sending: string;
  failurePrefix: string; // followed by the phone number link, then failureSuffix
  failureSuffix: string;
  badRequest: string; // the server refused the entry (400)
  previewFallback: string;
  thankYou: string; // address of the confirmation page
}
export const englishCopy: FormCopy = {
  heading: 'Talk With Us',
  name: 'Name',
  email: 'Email',
  phone: 'Phone Number',
  message: 'Message',
  hint: 'Please keep this short. Do not include confidential or sensitive details yet.',
  consent:
    'I understand sending this form does not make me a client or create an attorney-client relationship, and Pathfinder Injury Law has not agreed to represent me.',
  honeypot: 'Company',
  button: 'Send Inquiry',
  invalid: 'Please fill in every field marked with a star, including the acknowledgement.',
  waiting: 'One moment, we are checking your browser. Please press Send Inquiry again.',
  sending: 'Sending...',
  failurePrefix: 'We could not send your message. Please call us at ',
  failureSuffix: ' and we will help you right away.',
  badRequest: 'Please check that every field is filled in correctly and the acknowledgement is checked.',
  previewFallback: 'Preview: nothing was sent.',
  thankYou: '/thank-you/',
};

