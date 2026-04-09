import type { Section } from '../types';

export const tenancySection: Section = {
  id: 'tenancy',
  name: 'Tenancy Setup',
  description: 'Program tenancy configuration and administrator setup',
  phase: 'discovery',
  questions: [
    {
      key: 'please_provide_the_logo_of_your',
      label: 'Please provide the logo of your program or your company\'s logo in case your program doesn\'t have one yet.',
      inputType: 'file',
      required: true,
      pii: false,
    },
    {
      key: 'please_provide_the_email_addresses_at',
      label: 'Please provide the email addresses (at least one) of the Program Administrators you would like us to invite for GRAVTY loyalty system access.',
      inputType: 'text',
      required: true,
      pii: true,
      validation: {"pattern":"^[^@]+@[^@]+\\.[^@]+$","patternMessage":"Enter a valid email address"},
    },
    {
      key: 'admin_first_name',
      label: 'Program Administrator - First Name',
      inputType: 'text',
      required: true,
      pii: true,
    },
    {
      key: 'admin_last_name',
      label: 'Program Administrator - Last Name',
      inputType: 'text',
      required: true,
      pii: true,
    },
    {
      key: 'admin_email',
      label: 'Program Administrator - Email',
      inputType: 'text',
      required: true,
      pii: true,
      validation: {"pattern":"^[^@]+@[^@]+\\.[^@]+$","patternMessage":"Enter a valid email address"},
    },
  ],
};
