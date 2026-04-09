import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Lookup Codes',
    definition: 'Lookup codes are the list of values for a Lookup Data Type (dropdown) attribute in GRAVTY.',
    example: 'Lookup Code values for Offer Category - Travel, Dining, Entertainment, etc.,',
  },
  {
    term: 'Sponsor',
    definition: '- An entity participating in the program, typically offering products and services for program members to earn loyalty rewards. \n- A sponsor may also serve as an acquisition vehicle for the program to enroll customers into the loyalty program.\n- “Sponsor” is also referred to as “Program Partner” or “Participant” or “Brand”.',
    example: 'A sponsor can be a \n- Brand or Line of Business (e.g. Elite Fashions, Elite Hypermarkets)\n- Partner (e.g. Oilex Petroleum)\n- Supplier (e.g. Levi’s)\n',
  },
  {
    term: 'Sponsor Location',
    definition: 'A place of business of the sponsor. A sponsor location can be a physical location or an online location.',
    example: 'A sponsor location can be \n- Physical Location: Elite Fashions @ Sanata Row, Cupertino, CA\n- Online Location: www.elitefashions.com',
  },
  {
    term: 'Host Sponsor',
    definition: 'The sponsor who operates and/or owns the program. Host Sponsor has the ‘enterprise level’ visibility into the program.',
    example: 'The host sponsor is typically the company that runs the loyalty program. e.g. Starbucks',
  },
  {
    term: 'Acquiring Sponsor',
    definition: 'The sponsor who is responsible for acquiring a new customer into the program.',
    example: 'An acquiring sponsor can be any sponsor that brings in a new customer to the program. e.g. Zara, Aldo, etc.,',
  },
  {
    term: 'Acquiring Sponsor Location',
    definition: 'The sponsor location where a new customer is acquired by the sponsor.',
    example: 'e.g. Aldo City Center Mall, Zara DLF Mall, etc., ',
  },
  {
    term: 'Offer',
    definition: '- An Offer in GRAVTY encapsulates the value proposition delivered to the customer in order to engage. A brand may engage customers to maximize customer’s lifetime value and profitability.\n- Each offer may have specific short-term or long-term business goals that are set and tracked through specific Key Performance Indicators.\n- An “Offer” is also referred to as a  Loyalty “Promotions” or “Campaign”.',
    example: 'e.g.\n- Double Star Days - Earn twice the number of stars (points) on eligible purchases.\n- 10% back in points.\n- Refer a Friend, Get Rewarded!\n- Earn 10x Bonus Points on your Birthday.\n\n',
  },
  {
    term: 'Reward Offer',
    definition: 'Reward Offer is an Offer wherein members earn rewards (points, cash-back, experiential) by fulfilling an underlying call to action for engaging with a participating Brand.',
    example: 'e.g. Double Star Days - Earn twice the number of stars (points) on eligible purchases.',
  },
  {
    term: 'Award Offer',
    definition: 'Award Offer is an Offer wherein members can redeem their Points or other loyalty assets earned for products/services/special moments offered by the Program.',
    example: 'e.g. Redeeming Points for a ticket at AMC Theatres. ',
  },
  {
    term: 'Privilege Offer',
    definition: 'Privilege Offer is an Offer wherein the Program can grant gifts or entitlements to members without any pre-condition or call to action. These could be Surprise & Delight or even Service Recovery strategies.',
    example: 'E.g., Free parking for members who have transacted with Panda Hypermarket at least three times a week for 4 continuous weeks .',
  },
  {
    term: 'Deal Offer',
    definition: 'Deal Offer is applicable to all the targeted Members without any individual privilege assignment. There is no call to action from the Member\'s end to receive the deal. Deal Offers are used for information purposes and can be rendered on 3rd party platforms like Mobile Apps, websites, etc. ',
    example: 'e.g.\n- Flat 50% sale at Aldo stores.\n- Double the Joy: Buy One, Get One Free!\n',
  },
  {
    term: 'BIT',
    definition: '- BIT represents an instance of customer’s engagement with the brand, which may comprise a specific Transaction, Behavior or Influence or a combination of all.\n- BIT” is a modern equivalent of “Transaction” or “Activity”. ',
    example: 'For example, Ms. Martha Summers shops Haircare products and Accessories, online on Luxe Retail’s eCommerce App at 3 PM on Wednesday and pays $360 using her co-branded Finex card, and shares her purchase on Facebook.',
  },
  {
    term: 'BIT Value',
    definition: '- BIT Value: represents 3-dimensional customer value comprising\n  - Behavior value\n  - Influence value\n  - Transaction value\n- “BIT Value®” is a modern equivalent of Customer Value.',
    example: 'e.g.\n- Payment Method is co-branded Finex card: Behaviour Value +50\n- Shares her purchase on Facebook: Influence Value +2000\n- Amount Spent: Transaction Value: BIT Amount x 1 = 360x1 = +360',
  },
  {
    term: 'Loyalty Account',
    definition: 'A Loyalty Account represents a specific program currency. A Loyalty program can have multiple Loyalty Accounts, each belonging to one of the following three types, based on the purpose they are intended to serve:\n- Redemption Account\n- Recognition Account\n- External Account\nEach Loyalty Account definition involves setting up an expiration policy, financial parameters (for liability estimation), escrow duration if applicable, visibility controls, and one or more Tags.',
    example: 'e.g. Redemption Loyalty Account (Terminus Miles), Recognition Loyalty Account (Terminus Credits), etc., ',
  },
  {
    term: 'Redemption Account',
    definition: 'A redemption loyalty account is a designated member account enabling members to accrue points, which can subsequently be redeemed for various benefits, including purchases, privileges (vouchers), and more.',
    example: 'e.g. Terminus Miles or Terminus BizMiles.',
  },
  {
    term: 'Recognition Account',
    definition: 'A recognition loyalty account is a dedicated member account for acknowledging and appreciating members. Member progression between tiers is determined by the points accumulated in the recognition account.',
    example: 'e.g. Terminus Credits',
  },
  {
    term: 'External Account',
    definition: 'An external loyalty account is a dedicated member account that allows members to earn rewards in the program currency of a 3rd Party or partner loyalty program.',
    example: 'e.g. Finex Coins, AirPoints.',
  },
  {
    term: 'Tags',
    definition: 'For each Loyalty Account, program users can setup one or more Tags (e.g. Base, Bonus, Christmas, Experience, Promotional, Event, etc.) to \n- Identify or infer Source, Activity, Timing, Motivation, or anything that the Program wants to ‘Micro-track’\n- Drive customer behavior (RFM) and \n- Have superior control over program liability.\n- Implement differential billing (for partners) by Tags\nEach Tag can follow a specific expiration policy.\n\nNote: Tags are supported only by Redemption and Recognition accounts.',
    example: 'e.g. \n- 90 days Tag - Points earned in this tag expire in 90 days.\n- Birthday Bonus Tag - Points rewarded for Birthdays are issued using this tag.\n- Bonus Tag - Bonus points are rewarded in this tag.',
  },
  {
    term: 'Zero-Party Data',
    definition: 'Information that the member intentionally and proactively shares with the brand or company. This could include preferences, interests, communication consents, or personal details.',
    example: 'Zero Party Data\n- Profile attributes (e.g., Date of Anniversary, Country of Residence, Member Type)\n- Intent-data (e.g., are you planning to travel Europe in the next 3-months?)',
  },
  {
    term: 'First-Party Data',
    definition: 'Data collected directly by the brand or company from its own member interactions. This includes app usage, purchase history, etc.,',
    example: 'First Party Data\n- Loyalty Attributes (e.g., Tier Status, Points balance, Membership Stage, etc.,)\n- Tracked attributes (e.g., Total spend in the week of Christmas 2023, etc.,)        \n- Derived attributes (e.g., Age of the Member, Days since last activity, etc.,)        \n- Analyzed attributes (e.g., Quantum Score, BIT Value®, Influence Value, Relationship Cost, specific Persona or Cluster). These can be natively determined in GRAVTY (using GRAVTY Intelligence) or can be imported from one or more external sources.\n- Transactional attributes (e.g., Tier, Last Accrual Date, Points balance) so on and so forth\n- AI-predicted attributes (e.g., Retention Score etc.)\n',
  },
  {
    term: 'Second-Party Data',
    definition: 'Another company\'s first-party data that is shared or sold directly to the brand or company. It comes from a trusted source and maintains a direct relationship with the original data collector.',
    example: 'Demographic data from a trusted partner, purchase history data from another retailer, or website visitor data from a data exchange.',
  },
  {
    term: 'Third-Party Data',
    definition: 'Data aggregated from numerous sources, often by data brokers, and then sold to businesses. It lacks the direct connection and quality control that first- and second-party data have.',
    example: 'Demographic data, browsing behavior on other websites, or purchase history from unknown sources.',
  },
  {
    term: 'Program Level Attributes',
    definition: 'Captured from a customer at the time of enrollment or throughout the membership lifecycle, available across the programs, for all promotions, marketing campaigns.',
    example: 'e.g. Gender, Name, Date of Birth, Country of Residence, Social ID, etc. ',
  },
  {
    term: 'Offer Level Attributes',
    definition: 'Offer level attributes (MTOs) are configured for an Offer to track specific member behavior and are available only within the context of the Offer.',
    example: 'e.g., Amount spent and paid using the co-brand card, on Cosmetics during Happy Hours at Elite Fashions during Summer Bonanza offer (first party), planning to travel to Europe in the next 3 months (zero parties).',
  },
  {
    term: '1-Dimensional MTO (Member Tracker at Offer Level)',
    definition: '1-Dimensional MTO is a simple counter or flag.',
    example: 'For example: # Amount spent by a member on online shopping on Apparels in 2021.',
  },
  {
    term: '2-Dimensional MTO',
    definition: '2-Dimensional MTO allows behavior tracking across 2-dimensions for each and every member, enabling much deeper and innovative promotional strategies.',
    example: 'For example: #Amount spent at various Aldo Stores by a member:\n- Aldo, Santana Row, Cupertino, CA - $1,200\n- Aldo, Times Square,  Manhattan, NY - $5,000\n- Aldo, Camps Corner, Columbus OH - $2,400\n\nThis allows programs to implement sophisticated promotions/game mechanics, such as\n- Reward members on every $5,000 spent at the same store of Aldo (or across all Accessories brands participating in the Club Apparel loyalty program).\n- Reward members when they have done business with any 3 unique stores of Aldo\n',
  },
  {
    term: 'Activity Level Attributes',
    definition: 'Activity Level Attributes are configured for an Activity to track specific member behavior and are available only within the Activity (Transaction) context.',
    example: 'e.g. Aggregate spend on Lighting and Mirrors, Aggregate points earned from all applicable promotions (offers).',
  },
  {
    term: 'AI Predicted and Analytics “Write-Back” Attributes',
    definition: 'Generated natively or imported from 3rd party source, available across the programs for all promotions and marketing campaigns.',
    example: 'e.g. Persona, Spend Objective, Sentiment Score',
  },
  {
    term: 'Privilege',
    definition: 'A Privilege (Voucher) in GRAVTY is a non-points based value-proposition that can be\n- Earned as a reward\n- Purchased/Redeemed as an Award\n- Granted as a Privilege',
    example: 'A Privilege can be a\n- Product or Package\n- Service\n- Experience\n- Sweepstake Entry\n- Discount\n- Exclusive Access/Membership',
  },
  {
    term: 'External Privilege',
    definition: 'The external Privileges feature in GRAVTY allows program users to source special benefits from any 3rd party and issue it as a Privilege by uploading external codes (sourced from the 3rd party). Qualifying members receive a code, which they can use to avail the Privilege directly with the 3rd party. Code is automatically authorized by the 3rd party (since issued by them).',
    example: 'e.g., 20% off at Jiffy Lube on Oil change, 3-Month Hulu Subscription, Business Class Upgrade on Etihad, Breakfast with the Stars @ Meydan',
  },
];
