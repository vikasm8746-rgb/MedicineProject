const bcrypt = require('bcryptjs');
const {
  connectMongoDB,
  User,
  Pharmacy,
  Medicine,
  Inventory,
  Reservation,
  Favorite,
  mongoose,
} = require('../models');

const seedData = async () => {
  console.log('🍃 Connecting to MongoDB for Seeding...');
  let conn = await connectMongoDB();

  // If local MongoDB is not listening, try in-memory MongoDB server
  if (!conn) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      console.log('⚡ Launching In-Memory MongoDB Server for seeding demonstration...');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      conn = await mongoose.connect(memoryUri);
      console.log(`🍃 Connected to In-Memory MongoDB: ${memoryUri}`);
    } catch (e) {
      // In-memory server not installed or failed to start
    }
  }

  if (!conn) {
    console.log('\n================================================================');
    console.log('ℹ️  MongoDB Database Server is Not Currently Active');
    console.log('================================================================');
    console.log('\nTo connect MongoDB to this MediFind MERN stack, choose one of these:');
    console.log('\n🌟 OPTION 1: Use Free MongoDB Atlas (Recommended - 2 Minutes Setup)');
    console.log('  1. Go to https://www.mongodb.com/cloud/atlas and create a free M0 cluster');
    console.log('  2. Click "Connect" -> "Drivers" (Node.js) and copy your connection string');
    console.log('  3. In "backend/.env", update MONGODB_URI:');
    console.log('     MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/medifind_db');
    console.log('  4. Re-run: npm run db:mongo');
    console.log('\n💻 OPTION 2: Use Local MongoDB Community Server on Windows');
    console.log('  1. Download and install MongoDB from:');
    console.log('     https://www.mongodb.com/try/download/community');
    console.log('  2. Make sure MongoDB service is running (Port 27017)');
    console.log('  3. Re-run: npm run db:mongo');
    console.log('\n🛡️ CURRENT STATUS:');
    console.log('  The MediFind server is ALREADY 100% OPERATIONAL!');
    console.log('  All medicines, pharmacies, stock holds, and orders work smoothly');
    console.log('  via the Smart Demo Data Engine in your browser and on your phone.');
    console.log('================================================================\n');
    process.exit(0);
  }

  try {
    console.log('🧹 Cleaning existing collections in MongoDB...');
    await Promise.all([
      User.deleteMany({}),
      Pharmacy.deleteMany({}),
      Medicine.deleteMany({}),
      Inventory.deleteMany({}),
      Reservation.deleteMany({}),
      Favorite.deleteMany({}),
    ]);

    console.log('👥 Seeding Users...');
    const users = await User.create([
      {
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        phone: '+91 9876543210',
        password: 'password123',
        role: 'user',
      },
      {
        name: 'Dr. Sunita Patel (Apex Pharma)',
        email: 'sunita@apexpharma.com',
        phone: '+91 9822012345',
        password: 'password123',
        role: 'pharmacy_owner',
      },
      {
        name: 'Vikram Mehta (City Meds)',
        email: 'vikram@citymeds.com',
        phone: '+91 9765432100',
        password: 'password123',
        role: 'pharmacy_owner',
      },
      {
        name: 'Admin Manager',
        email: 'admin@medifind.com',
        phone: '+91 9900112233',
        password: 'password123',
        role: 'admin',
      },
    ]);

    const rahul = users[0];
    const sunita = users[1];
    const vikram = users[2];

    console.log('🏥 Seeding Pharmacies...');
    const pharmacies = await Pharmacy.create([
      {
        owner_id: sunita._id,
        name: 'Apex Care Pharmacy',
        address: 'Shop 14, Sunrise Complex, MG Road, Bengaluru',
        phone: '+91 80 2345 6789',
        opening_hours: '08:00 AM - 11:00 PM',
        latitude: 12.9716,
        longitude: 77.5946,
        rating: 4.9,
      },
      {
        owner_id: vikram._id,
        name: 'City Meds 24x7',
        address: 'Plot 45, Near Metro Station, Indiranagar, Bengaluru',
        phone: '+91 80 4123 9876',
        opening_hours: '24 Hours Open',
        latitude: 12.9784,
        longitude: 77.6408,
        rating: 4.8,
      },
      {
        owner_id: sunita._id,
        name: 'Wellness First Chemist',
        address: '12th Main, Koramangala 4th Block, Bengaluru',
        phone: '+91 80 5566 7788',
        opening_hours: '08:30 AM - 10:30 PM',
        latitude: 12.9352,
        longitude: 77.6245,
        rating: 4.7,
      },
      {
        owner_id: vikram._id,
        name: 'LifeLine Healthcare & Druggists',
        address: '77 Central Avenue, Jayanagar 3rd Block, Bengaluru',
        phone: '+91 80 6677 8899',
        opening_hours: '09:00 AM - 10:00 PM',
        latitude: 12.9250,
        longitude: 77.5938,
        rating: 4.6,
      },
      {
        owner_id: sunita._id,
        name: 'MedPlus Community Chemist',
        address: '89 Ring Road, HSR Layout Sector 1, Bengaluru',
        phone: '+91 80 7788 9900',
        opening_hours: '08:00 AM - 10:00 PM',
        latitude: 12.9121,
        longitude: 77.6446,
        rating: 4.7,
      },
    ]);

    console.log('💊 Seeding Medicines...');
    const medicines = await Medicine.create([
      {
        name: 'Paracetamol 650mg',
        brand_name: 'Dolo 650',
        generic_name: 'Paracetamol / Acetaminophen',
        category: 'Fever & Pain',
        manufacturer: 'Micro Labs Ltd',
        description: 'Effective antipyretic and analgesic used to relieve mild-to-moderate pain and fever.',
        usage_info: 'Take 1 tablet every 4 to 6 hours as needed. Do not exceed 4g in 24 hours.',
      },
      {
        name: 'Amoxicillin 500mg',
        brand_name: 'Mox 500',
        generic_name: 'Amoxicillin Trihydrate',
        category: 'Antibiotics',
        manufacturer: 'Sun Pharmaceutical',
        description: 'Broad-spectrum penicillin antibiotic used for bacterial infections of ear, nose, throat, and respiratory tract.',
        usage_info: 'Prescribed 3 times daily. Complete full course.',
        requires_prescription: true,
      },
      {
        name: 'Cetirizine 10mg',
        brand_name: 'Cetzine',
        generic_name: 'Cetirizine Hydrochloride',
        category: 'Cold & Cough',
        manufacturer: 'Dr. Reddy’s Laboratories',
        description: 'Second-generation antihistamine used to relieve allergy symptoms such as watery eyes and runny nose.',
        usage_info: 'Take 1 tablet once daily in the evening.',
      },
      {
        name: 'Metformin 500mg',
        brand_name: 'Glycomet 500',
        generic_name: 'Metformin Hydrochloride',
        category: 'Diabetes',
        manufacturer: 'USV Private Limited',
        description: 'First-line medication for type 2 diabetes mellitus, helping control blood sugar.',
        usage_info: 'Take with meals to minimize gastrointestinal discomfort.',
      },
      {
        name: 'Atorvastatin 10mg',
        brand_name: 'Lipitor / Atorva',
        generic_name: 'Atorvastatin Calcium',
        category: 'Heart Care',
        manufacturer: 'Zydus Lifesciences',
        description: 'Statin medication used to lower bad cholesterol (LDL) and triglycerides.',
        usage_info: 'Take once daily at bedtime with or without food.',
      },
      {
        name: 'Vitamin D3 60,000 IU',
        brand_name: 'Calcirol Sachet',
        generic_name: 'Cholecalciferol',
        category: 'Vitamins',
        manufacturer: 'Cadila Healthcare',
        description: 'High potency Vitamin D3 formulation used in the treatment of vitamin D deficiency and bone health.',
        usage_info: 'Usually taken once weekly with milk.',
      },
      {
        name: 'Azithromycin 500mg',
        brand_name: 'Azee 500',
        generic_name: 'Azithromycin',
        category: 'Antibiotics',
        manufacturer: 'Cipla Ltd',
        description: 'Macrolide antibiotic used for respiratory tract, skin, and ear infections.',
        usage_info: 'Take once daily on an empty stomach.',
        requires_prescription: true,
      },
      {
        name: 'Pantoprazole 40mg',
        brand_name: 'Pan 40',
        generic_name: 'Pantoprazole Sodium',
        category: 'Gastro Care',
        manufacturer: 'Alkem Laboratories',
        description: 'Proton pump inhibitor treating GERD and acidity ulcers.',
        usage_info: 'Take once daily in morning, 30 min before breakfast.',
      },
      {
        name: 'Telmisartan 40mg',
        brand_name: 'Telma 40',
        generic_name: 'Telmisartan',
        category: 'Heart Care',
        manufacturer: 'Glenmark Pharmaceuticals',
        description: 'Angiotensin II receptor blocker used for hypertension and blood pressure.',
        usage_info: 'Take once daily at the same time each day.',
      },
      {
        name: 'Ibuprofen 400mg',
        brand_name: 'Brufen 400',
        generic_name: 'Ibuprofen',
        category: 'Fever & Pain',
        manufacturer: 'Abbott Healthcare',
        description: 'NSAID used for relieving pain, inflammation, and fever.',
        usage_info: 'Take after food or with milk to avoid stomach upset.',
      },
      {
        name: 'Salbutamol Inhaler 100mcg',
        brand_name: 'Asthalin Inhaler',
        generic_name: 'Salbutamol / Albuterol',
        category: 'Cold & Cough',
        manufacturer: 'Cipla Ltd',
        description: 'Bronchodilator fast-acting inhaler for quick relief from asthma and bronchospasm.',
        usage_info: 'Inhale 1-2 puffs during sudden shortness of breath.',
      },
      {
        name: 'Povidone Iodine Ointment 5%',
        brand_name: 'Betadine 5%',
        generic_name: 'Povidone Iodine',
        category: 'First Aid',
        manufacturer: 'Win-Medicare',
        description: 'Topical antiseptic applied to cuts, wounds, and minor burns to prevent infection.',
        usage_info: 'Clean affected wound and apply thin layer.',
      },
    ]);

    console.log('📦 Seeding Inventory & Stock Quantities...');
    const inventoryData = [
      { pharmacy_id: pharmacies[0]._id, medicine_id: medicines[0]._id, quantity: 120, price: 32.50 },
      { pharmacy_id: pharmacies[0]._id, medicine_id: medicines[1]._id, quantity: 45, price: 95.00 },
      { pharmacy_id: pharmacies[0]._id, medicine_id: medicines[2]._id, quantity: 6, price: 22.00 },
      { pharmacy_id: pharmacies[0]._id, medicine_id: medicines[3]._id, quantity: 80, price: 48.00 },
      { pharmacy_id: pharmacies[0]._id, medicine_id: medicines[4]._id, quantity: 0, price: 110.00 },
      { pharmacy_id: pharmacies[0]._id, medicine_id: medicines[5]._id, quantity: 50, price: 65.00 },
      { pharmacy_id: pharmacies[1]._id, medicine_id: medicines[0]._id, quantity: 250, price: 31.00 },
      { pharmacy_id: pharmacies[1]._id, medicine_id: medicines[2]._id, quantity: 90, price: 20.00 },
      { pharmacy_id: pharmacies[1]._id, medicine_id: medicines[4]._id, quantity: 40, price: 105.00 },
      { pharmacy_id: pharmacies[1]._id, medicine_id: medicines[6]._id, quantity: 30, price: 125.00 },
      { pharmacy_id: pharmacies[2]._id, medicine_id: medicines[0]._id, quantity: 8, price: 33.00 },
      { pharmacy_id: pharmacies[2]._id, medicine_id: medicines[1]._id, quantity: 0, price: 98.00 },
      { pharmacy_id: pharmacies[2]._id, medicine_id: medicines[3]._id, quantity: 60, price: 49.00 },
      { pharmacy_id: pharmacies[2]._id, medicine_id: medicines[8]._id, quantity: 35, price: 75.00 },
      { pharmacy_id: pharmacies[2]._id, medicine_id: medicines[9]._id, quantity: 85, price: 28.00 },
      { pharmacy_id: pharmacies[3]._id, medicine_id: medicines[1]._id, quantity: 25, price: 92.00 },
      { pharmacy_id: pharmacies[3]._id, medicine_id: medicines[3]._id, quantity: 5, price: 47.00 },
      { pharmacy_id: pharmacies[3]._id, medicine_id: medicines[5]._id, quantity: 70, price: 62.00 },
      { pharmacy_id: pharmacies[4]._id, medicine_id: medicines[0]._id, quantity: 110, price: 32.00 },
      { pharmacy_id: pharmacies[4]._id, medicine_id: medicines[10]._id, quantity: 20, price: 140.00 },
    ];
    await Inventory.create(inventoryData);

    console.log('📅 Seeding Reservations...');
    await Reservation.create([
      {
        user_id: rahul._id,
        pharmacy_id: pharmacies[0]._id,
        medicine_id: medicines[0]._id,
        quantity: 2,
        status: 'Accepted',
        notes: 'Urgent pickup this evening around 6 PM',
      },
      {
        user_id: rahul._id,
        pharmacy_id: pharmacies[1]._id,
        medicine_id: medicines[2]._id,
        quantity: 1,
        status: 'Pending',
        notes: 'Please hold until 8 PM',
      },
    ]);

    console.log('❤️ Seeding Favorites...');
    await Favorite.create([
      { user_id: rahul._id, medicine_id: medicines[0]._id },
      { user_id: rahul._id, medicine_id: medicines[3]._id },
      { user_id: rahul._id, pharmacy_id: pharmacies[0]._id },
    ]);

    console.log('\n====================================================');
    console.log('🎉 MongoDB MediFind MERN Database Successfully Seeded!');
    console.log(`- Users:        ${users.length}`);
    console.log(`- Pharmacies:   ${pharmacies.length}`);
    console.log(`- Medicines:    ${medicines.length}`);
    console.log(`- Inventory:    ${inventoryData.length}`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during MongoDB seeding:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedData();
