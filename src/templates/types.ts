// ─────────────────────────────────────────────────────────────
// LoyaltyLift Template Type Definitions
// ─────────────────────────────────────────────────────────────

export interface ConditionalRule {
  questionKey: string;
  operator: 'eq' | 'neq' | 'in' | 'contains';
  value: string | string[];
}

export interface Question {
  key: string;
  label: string;
  helpText?: string;
  inputType:
    | 'text'
    | 'number'
    | 'date'
    | 'select'
    | 'multi_select'
    | 'boolean'
    | 'file'
    | 'textarea'
    | 'grid'
    | 'currency';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required: boolean;
  requiredIf?: ConditionalRule;
  visibleIf?: ConditionalRule;
  pii: boolean;
  industryRelevance?: string[];
  glossaryTerm?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    patternMessage?: string;
  };
}

export interface Section {
  id: string;
  name: string;
  description: string;
  phase: 'discovery' | 'design' | 'launch';
  visibleIf?: ConditionalRule;
  questions: Question[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  example?: string;
}

export interface DataModelAttribute {
  businessName: string;
  attributeName: string;
  description: string;
  sampleValue?: string;
  dataType: string;
  lookupType?: string;
  lovType?: string;
  allowMultiple?: boolean;
  pii?: boolean;
  unique?: boolean;
  length?: number;
  group?: string;
  updatable?: boolean;
  mandatory?: boolean;
  attributeType?: string;
  instructions?: string;
  industryRelevance?: string;
  attributeRequired?: string;
  lineLevel?: boolean;
}
