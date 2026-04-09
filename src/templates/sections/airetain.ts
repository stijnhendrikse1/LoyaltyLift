import type { Section } from '../types';

export const airetainSection: Section = {
  id: 'airetain',
  name: 'AiRetain',
  description: 'AiRetain module configuration for member retention',
  phase: 'launch',
  visibleIf: {
    questionKey: 'modules_purchased',
    operator: 'contains',
    value: 'AiRetain',
  },
  questions: [
    {
      key: 'does_the_program_have_at_least',
      label: 'Does the program have at least 1000 members?',
      inputType: 'text',
      required: true,
      pii: false,
    },
    {
      key: 'do_members_accrue_earn_points_only',
      label: 'Do members accrue (earn) points only through "Spend" transactions (BIT type "Spend")? If not, what are the various BIT types that reward points to the members?',
      inputType: 'text',
      required: true,
      pii: false,
    },
    {
      key: 'does_the_program_have_at_least',
      label: 'Does the program have at least 1000 Spend or Spend equivalent BITs?',
      inputType: 'text',
      required: true,
      pii: false,
    },
    {
      key: 'do_you_have_churn_definition_for',
      label: 'Do you have churn definition for your program?',
      inputType: 'text',
      required: true,
      pii: false,
    },
    {
      key: 'do_you_have_any_specific_gravty',
      label: 'Do you have any specific GRAVTY member attributes that will be used in Model training?',
      inputType: 'text',
      required: true,
      pii: false,
    },
  ],
};
