export type { Section, Question, ConditionalRule, GlossaryEntry, DataModelAttribute } from './types';
export { glossary } from './glossary';

import { tenancySection } from './sections/tenancy';
import { programSection } from './sections/program';
import { loyaltyAccountsSection } from './sections/loyalty-accounts';
import { policiesSection } from './sections/policies';
import { sponsorMgmtSection } from './sections/sponsor-mgmt';
import { memberEnrollmentSection } from './sections/member-enrollment';
import { dataModelQuestionsSection } from './sections/data-model-questions';
import { tierMgmtSection } from './sections/tier-mgmt';
import { accrualRedemptionSection } from './sections/accrual-redemption';
import { offersOverviewSection } from './sections/offers-overview';
import { dataMigrationSection } from './sections/data-migration';
import { marketingConnectSection } from './sections/marketing-connect';
import { memberDataModelSection } from './sections/member-data-model';
import { sponsorDataModelSection } from './sections/sponsor-data-model';
import { sponsorDetailsSection } from './sections/sponsor-details';
import { locationDataModelSection } from './sections/location-data-model';
import { locationDetailsSection } from './sections/location-details';
import { productDataModelSection } from './sections/product-data-model';
import { productDetailsSection } from './sections/product-details';
import { bitDataModelSection } from './sections/bit-data-model';
import { paymentDataModelSection } from './sections/payment-data-model';
import { offerDataModelSection } from './sections/offer-data-model';
import { offerKpiSection } from './sections/offer-kpi';
import { customAttributesSection } from './sections/custom-attributes';
import { batchesSection } from './sections/batches';
import { roleMgmtSection } from './sections/role-mgmt';
import { userMgmtSection } from './sections/user-mgmt';
import { memberServicesSection } from './sections/member-services';
import { marketingUseCasesSection } from './sections/marketing-use-cases';
import { financeSection } from './sections/finance';
import { dwhSection } from './sections/dwh';
import { verticalEntitiesSection } from './sections/vertical-entities';
import { aisenseSection } from './sections/aisense';
import { airecommendSection } from './sections/airecommend';
import { airetainSection } from './sections/airetain';
import { aitrustSection } from './sections/aitrust';
import { airportEntitySection } from './sections/airport-entity';
import { distanceTableSection } from './sections/distance-table';
import { cobrandedCardsSection } from './sections/cobranded-cards';
import { subscriptionSection } from './sections/subscription';
import { retroRequestSection } from './sections/retro-request';
import { airlineRedemptionSection } from './sections/airline-redemption';

import type { Section } from './types';

export const allSections: Section[] = [
  tenancySection,
  programSection,
  loyaltyAccountsSection,
  policiesSection,
  sponsorMgmtSection,
  memberEnrollmentSection,
  dataModelQuestionsSection,
  tierMgmtSection,
  accrualRedemptionSection,
  offersOverviewSection,
  dataMigrationSection,
  marketingConnectSection,
  memberDataModelSection,
  sponsorDataModelSection,
  sponsorDetailsSection,
  locationDataModelSection,
  locationDetailsSection,
  productDataModelSection,
  productDetailsSection,
  bitDataModelSection,
  paymentDataModelSection,
  offerDataModelSection,
  offerKpiSection,
  customAttributesSection,
  batchesSection,
  roleMgmtSection,
  userMgmtSection,
  memberServicesSection,
  marketingUseCasesSection,
  financeSection,
  dwhSection,
  verticalEntitiesSection,
  aisenseSection,
  airecommendSection,
  airetainSection,
  aitrustSection,
  airportEntitySection,
  distanceTableSection,
  cobrandedCardsSection,
  subscriptionSection,
  retroRequestSection,
  airlineRedemptionSection,
];

export const discoverySections: Section[] = allSections.filter(s => s.phase === 'discovery');
export const designSections: Section[] = allSections.filter(s => s.phase === 'design');
export const launchSections: Section[] = allSections.filter(s => s.phase === 'launch');

export { tenancySection };
export { programSection };
export { loyaltyAccountsSection };
export { policiesSection };
export { sponsorMgmtSection };
export { memberEnrollmentSection };
export { dataModelQuestionsSection };
export { tierMgmtSection };
export { accrualRedemptionSection };
export { offersOverviewSection };
export { dataMigrationSection };
export { marketingConnectSection };
export { memberDataModelSection };
export { sponsorDataModelSection };
export { sponsorDetailsSection };
export { locationDataModelSection };
export { locationDetailsSection };
export { productDataModelSection };
export { productDetailsSection };
export { bitDataModelSection };
export { paymentDataModelSection };
export { offerDataModelSection };
export { offerKpiSection };
export { customAttributesSection };
export { batchesSection };
export { roleMgmtSection };
export { userMgmtSection };
export { memberServicesSection };
export { marketingUseCasesSection };
export { financeSection };
export { dwhSection };
export { verticalEntitiesSection };
export { aisenseSection };
export { airecommendSection };
export { airetainSection };
export { aitrustSection };
export { airportEntitySection };
export { distanceTableSection };
export { cobrandedCardsSection };
export { subscriptionSection };
export { retroRequestSection };
export { airlineRedemptionSection };

// Data Model Attributes
export { memberAttributes } from './data-models/member-attributes';
export { sponsorAttributes } from './data-models/sponsor-attributes';
export { locationAttributes } from './data-models/location-attributes';
export { productAttributes } from './data-models/product-attributes';
export { bitAttributes } from './data-models/bit-attributes';
export { paymentAttributes } from './data-models/payment-attributes';
export { offerAttributes } from './data-models/offer-attributes';
