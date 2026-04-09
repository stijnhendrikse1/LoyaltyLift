import type { Section } from '../types';

export const aitrustSection: Section = {
  id: 'aitrust',
  name: 'AiTrust',
  description: 'AiTrust module configuration for fraud detection and trust scoring',
  phase: 'launch',
  visibleIf: {
    questionKey: 'modules_purchased',
    operator: 'contains',
    value: 'AiTrust',
  },
  questions: [
    {
      key: 'do_you_have_enough_and_varying',
      label: 'Do you have enough and varying data for model training?',
      inputType: 'text',
      required: true,
      pii: false,
    },
    {
      key: 'do_you_have_labelled_fraud_data',
      label: 'Do you have labelled fraud data for your program?',
      inputType: 'text',
      required: false,
      pii: false,
    },
    {
      key: 'what_will_be_the_period_over',
      label: 'What will be the period over which the data will be evaluated (recent date preferred)?',
      inputType: 'date',
      required: true,
      pii: false,
    },
    {
      key: 'do_you_have_an_operations_team',
      label: 'Do you have an operations team monitoring the "On Hold" BITs and reviewing them?',
      inputType: 'text',
      required: false,
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
      key: 'have_you_identified_fraud_scenarios_for',
      label: 'Have you identified fraud scenarios for various BIT types within the program?',
      inputType: 'text',
      required: true,
      pii: false,
    },
  ],
};
