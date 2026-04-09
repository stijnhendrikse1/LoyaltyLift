import type { Section } from '../types';

export const paymentDataModelSection: Section = {
  id: 'payment-data-model',
  name: 'Payment Data Model',
  description: 'Payment entity attributes and data model configuration',
  phase: 'design',
  questions: [
    {
      key: 'active',
      label: 'active',
      inputType: 'grid',
      required: false,
      pii: false,
    },
    {
      key: 'bank_code',
      label: 'bank_code',
      inputType: 'grid',
      required: false,
      pii: false,
    },
    {
      key: 'card_type',
      label: 'card_type',
      inputType: 'grid',
      required: false,
      pii: false,
    },
    {
      key: 'valid_for_accrual',
      label: 'valid_for_accrual',
      inputType: 'grid',
      required: false,
      pii: false,
    },
  ],
};
