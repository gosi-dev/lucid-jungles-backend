/**
 * Seed script — Lucid Jungles OG backend
 * Run: node seed.js  (from OG/original-backend/)
 *
 * Creates / repairs:
 *  - 1 Fanbase: "Jungle Fight Club" (fitness, free)
 *  - 1 Event:   "Lucid Jungles: The Gathering" (~3 weeks out) — full mock payload:
 *               4 ticket tiers, cover image, tags, attendees, talents, exhibitors, sessions
 *  - 1 Store + 3 Products: Book pre-order, LCJ Tee, Jungle Kit
 *
 * The event step updates the existing record rather than skipping it, so re-running
 * this file upgrades a thinly-seeded event in place. Every step is safe to repeat.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

// Load models
const { Fanbase }  = require('./src/models/fanbase');
const { Event }    = require('./src/models/event');
const { Store }    = require('./src/models/store');
const { Product }  = require('./src/models/products');
const { User }     = require('./src/models/user');

// Credentials must come from the environment. A hardcoded Atlas URI used to live
// here, which put live database credentials in a file that was about to be
// committed. The application reads DATABASE_URL, so accept either name and fail
// loudly rather than silently connecting somewhere unexpected.
const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error('Missing MONGODB_URI (or DATABASE_URL) — add it to OG/original-backend/.env');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // ── 1. Find or create a seed admin user ─────────────────────────────────────
  let adminUser = await User.findOne({ username: 'lcj_seed_admin' });
  if (!adminUser) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('SeedAdmin@2024!', salt);
    adminUser = await User.create({
      username:  'lcj_seed_admin',
      email:     'seed@lucidcityjungles.com',
      password:  hashedPassword,
      verified:  true,
      user_type: 'dreamer',
    });
    console.log('Created seed admin user:', adminUser._id);
  } else {
    console.log('Seed admin user already exists:', adminUser._id);
  }

  const creatorId = adminUser._id;

  // ── 2. Fanbase: Jungle Fight Club ───────────────────────────────────────────
  const existingFanbase = await Fanbase.findOne({ name: 'Jungle Fight Club' });
  let fanbase = existingFanbase;
  if (!existingFanbase) {
    fanbase = await Fanbase.create({
      creator:      creatorId,
      name:         'Jungle Fight Club',
      description:  'A training ground for people who want to move better, feel sharper, and build discipline the jungle way. No gym required.',
      fanbaseType:  'fitness',
      isPaid:       false,
      total_members: 0,
      community_goals: [
        {
          goal_name:        '100 Active Members',
          goal_description: 'Grow the JFC community to 100 committed members',
          progress:         { current: '1', goal: '100' },
        },
        {
          goal_name:        '30-Day Movement Challenge',
          goal_description: 'Complete 30 consecutive days of movement logging',
          progress:         { current: '0', goal: '30' },
        },
      ],
    });
    console.log('Created fanbase:', fanbase._id, fanbase.name);
  } else {
    console.log('Fanbase already exists:', existingFanbase._id, existingFanbase.name);
  }

  // ── 3. Event: Lucid Jungles: The Gathering ──────────────────────────────────
  //
  // This step repairs as well as creates. It used to run only when the event was
  // missing, so a record seeded before tickets existed stayed thin forever — which is
  // exactly why the live "Gathering" event rendered "No tickets available" on the
  // purchase screen while this file appeared to seed three tiers. The full mock payload
  // is now applied on every run: `node seed.js` is idempotent *and* self-healing.
  //
  // Prices are NGN because the ticket UI hardcodes ₦ (TicketCard, checkout and the
  // tickets page all print the sign) — a USD price of 15 would render as "₦15".
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 21); // ~3 weeks out, never reads as past
  eventDate.setHours(18, 0, 0, 0);

  const eventMock = {
    creator:     creatorId,
    fanbaseId:   fanbase._id,
    title:       'Lucid Jungles: The Gathering',
    description: 'The first Lucid Jungles live event. One rooftop above the cloud layer, '
      + 'with the city swallowed beneath it.\n\n'
      + 'Live sets from the Lucid High Club sound, a movement workshop from Jungle Fight Club, '
      + 'and a market of print, ceramics and gear from the artists we build with. Doors open as '
      + 'the cloud layer settles below the roof; the room is built for people who already belong here.\n\n'
      + 'Tiered access: come early for the free jungle allocation, stay late for the closing set. '
      + 'The address is sent to ticket holders 24 hours before doors.',
    date:        eventDate,
    location:    'The Roof — Lekki Phase 1, Lagos',
    latitude:    '6.4417',
    longitude:   '3.4723',
    isVirtual:   false,
    coverImage:  '/assets/mock/gathering-cover.svg',
    tags:        ['Music', 'Art', 'Culture'],

    // Four tiers, so the tickets page exercises every render path: a free tier
    // (confirms server-side, no Flutterwave round-trip), two paid tiers, and a
    // bulk tier. `sold` is pre-filled so "N left" / sold-out styling is visible.
    tickets: [
      { name: 'Early Jungle — Free', price: 0,      currency: 'NGN', quantity: 100, sold: 42 },
      { name: 'General Admission',   price: 15000,  currency: 'NGN', quantity: 300, sold: 128 },
      { name: 'VIP — Front Row',     price: 50000,  currency: 'NGN', quantity: 60,  sold: 21 },
      { name: 'Table for 4',         price: 250000, currency: 'NGN', quantity: 15,  sold: 4 },
    ],

    // Entities below come from the Lucid Jungles canon rather than invented third
    // parties — the event page has a deliberate "no fabricated people" rule, and
    // every name here already appears in the production docs.
    attendees: [
      { userId: creatorId, name: 'Bonzo', avatar: '/assets/mock/portrait-1.svg' },
      { name: 'Xi',    avatar: '/assets/mock/portrait-4.svg' },
      { name: 'Jukia', avatar: '/assets/mock/portrait-3.svg' },
      { name: 'Psyu',  avatar: '/assets/mock/portrait-2.svg' },
    ],

    // `email` is what the talent invitation form collects
    // (pages/invitation/[inviteId]/talent/form.js) and what the entity profile's CONTACT
    // action needs. These are demo routing addresses on a domain the project owns — the
    // personas themselves are canon, and nothing here invents a person.
    talents: [
      {
        name: 'Bonzo', role: 'Host — Founder',
        bio: 'Founder of Lucid Jungles. Hosts The Gathering and opens the room.',
        email: 'host@lucidjungles.io',
        avatar: '/assets/mock/portrait-1.svg',
      },
      {
        name: 'Psyu', role: 'Live Set — Lucid High Club',
        bio: 'Long-form jungle sets. Half of the Lucid High Club sound.',
        email: 'bookings@lucidjungles.io',
        avatar: '/assets/mock/portrait-2.svg',
      },
      {
        name: 'Jukia', role: 'Movement Workshop',
        bio: 'Leads the 30-day movement practice behind Jungle Fight Club.',
        email: 'workshops@lucidjungles.io',
        avatar: '/assets/mock/portrait-3.svg',
      },
      {
        name: 'Xi', role: 'Visuals & Atmosphere',
        bio: 'Builds the room: lighting, projection, and the map you move through.',
        email: 'visuals@lucidjungles.io',
        avatar: '/assets/mock/portrait-4.svg',
      },
    ],

    // `image` + `products[]` were only added to the Event model this session — before
    // that the page rendered these vendors as grey boxes no matter what was seeded.
    exhibitors: [
      {
        name: 'Kura Soundworks',
        description: 'Sound and studio gear',
        services: 'Field recording, studio hire, gear repairs',
        website: 'https://app.lucidjungles.io/stores/kura-soundworks',
        email: 'studio@lucidjungles.io',
        image: '/assets/mock/exhibitor-1.svg',
        products: [
          { name: 'Field Recorder', image: '/assets/mock/product-3.svg' },
          { name: 'Studio Headphones', image: '/assets/mock/product-1.svg' },
        ],
      },
      {
        name: 'Jungle Press',
        description: 'Books, prints and zines',
        services: 'Risograph printing, binding, type',
        website: 'https://app.lucidjungles.io/stores/jungle-press',
        email: 'press@lucidjungles.io',
        image: '/assets/mock/exhibitor-2.svg',
        products: [
          { name: 'Enter The Jungle — Book', image: '/assets/mock/product-2.svg' },
        ],
      },
      {
        name: 'Eko Provisions',
        description: 'Food, drink and ceramics',
        services: 'Small-batch kitchen, ceramics, cold bar',
        website: 'https://app.lucidjungles.io/stores/eko-provisions',
        email: 'kitchen@lucidjungles.io',
        image: '/assets/mock/exhibitor-3.svg',
        products: [
          { name: 'Jungle Kit', image: '/assets/mock/product-2.svg' },
          { name: 'Ceramic Cup', image: '/assets/mock/product-3.svg' },
        ],
      },
    ],

    sessions: [
      { title: 'Doors & Arrival',   time: '6:00 PM',  speaker: 'The Gathering',  description: 'Rooftop opens as the cloud layer settles below the building.' },
      { title: 'Opening Set',       time: '7:30 PM',  speaker: 'Psyu',           description: 'Long-form warm-up. No schedule, no phones on the deck.' },
      { title: 'Movement Workshop', time: '8:30 PM',  speaker: 'Jukia',          description: 'Thirty minutes of the JFC practice, open to every tier.' },
      { title: 'Closing Set',       time: '10:00 PM', speaker: 'Psyu b2b guest', description: 'Until the mist comes up over the roof edge.' },
    ],
  };

  const existingEvent = await Event.findOne({ title: eventMock.title });
  const event = await Event.findOneAndUpdate(
    { title: eventMock.title },
    { $set: eventMock },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  console.log(
    `${existingEvent ? 'Refreshed' : 'Created'} event:`,
    event._id, event.title,
    `(${event.tickets.length} tiers, ${event.talents.length} talents, ${event.exhibitors.length} exhibitors)`
  );

  // ── 4. Store + Products ──────────────────────────────────────────────────────
  let store = await Store.findOne({ name: 'Lucid City Jungles Store' });
  if (!store) {
    store = await Store.create({
      name:     'Lucid City Jungles Store',
      location: 'Online',
    });
    console.log('Created store:', store._id);
  } else {
    console.log('Store already exists:', store._id);
  }

  const productDefs = [
    {
      name:        'Enter The Jungle — Book Pre-Order',
      description: 'Pre-order the Lucid City Jungles definitive guide. Ships when ready. A book about the mindset, the culture, and the map.',
      price:       20,
      currency:    'USD',
      item_type:   'physical',
      quantity:    999,
      instock:     true,
    },
    {
      name:        'LCJ Tee',
      description: 'The jungle tee. Heavy cotton, oversized, Kura logo front. Available in black.',
      price:       35,
      currency:    'USD',
      item_type:   'physical',
      quantity:    100,
      instock:     true,
    },
    {
      name:        'Jungle Kit — Digital',
      description: 'A digital starter kit: the LCJ onboarding guide, 30-day movement plan, and the Dream Log framework PDF.',
      price:       10,
      currency:    'USD',
      item_type:   'virtual',
      quantity:    9999,
      instock:     true,
    },
  ];

  for (const def of productDefs) {
    const existing = await Product.findOne({ name: def.name, store: store._id });
    if (!existing) {
      const product = await Product.create({ ...def, store: store._id });
      await Store.findByIdAndUpdate(store._id, { $addToSet: { products: product._id } });
      console.log('Created product:', product.name);
    } else {
      console.log('Product already exists:', existing.name);
    }
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
