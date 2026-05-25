import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample user
  const user = await prisma.user.upsert({
    where: { email: 'demo@farming.app' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'demo@farming.app',
      password: 'demo-password',
      firstName: 'Demo',
      lastName: 'User',
      phone: '+1 (555) 123-4567',
      streetAddress: '123 Farm Lane',
      city: 'Springfield',
      state: 'IL',
      country: 'USA',
      zipCode: '62701',
    },
  });

  console.log('✓ Created user:', user.email);

  // Create app state
  await prisma.appState.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      id: uuidv4(),
      userId: user.id,
      units: 'imperial',
      theme: 'dark',
      temperatureUnit: 'fahrenheit',
      hasCompletedOnboarding: true,
    },
  });

  console.log('✓ Created app state');

  // Create API config
  const apiConfig = await prisma.apiConfig.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      name: 'Google Gemini (Server)',
      provider: 'gemini',
      apiKey: 'built-in',
      model: 'gemini-2.0-flash',
      isActive: true,
    },
  });

  console.log('✓ Created API configuration');

  // Create sample locations
  const locations = [
    { name: 'Farm North Field', moisture: '45%' },
    { name: 'Farm South Field', moisture: '52%' },
    { name: 'Greenhouse A', moisture: '68%' },
  ];

  for (const loc of locations) {
    await prisma.savedLocation.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        name: loc.name,
        moisture: loc.moisture,
        latitude: 40.7128 + Math.random() * 0.1,
        longitude: -74.006 + Math.random() * 0.1,
      },
    });
  }

  console.log(`✓ Created ${locations.length} sample locations`);

  console.log('\n✨ Database seeding complete!');
  console.log(`\nDemo user email: ${user.email}`);
  console.log(`User ID: ${user.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
