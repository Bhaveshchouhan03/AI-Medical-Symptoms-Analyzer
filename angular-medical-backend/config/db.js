const mongoose = require('mongoose');

const seedDoctors = async () => {
  try {
    const Hospital = require('../hospital/hospital.model');
    const Doctor = require('../doctor/doctor.model');
    const Review = require('../review/review.model');
    const bcrypt = require('bcryptjs');

    // Check count first to avoid duplicate seeds
    const docCount = await Doctor.countDocuments();
    if (docCount >= 90) {
      console.log('ℹ️ Doctors and Hospitals already exist in MongoDB. Skipping seed.');
      return;
    }

    console.log('🧹 Cleaning existing review/hospital/doctor collections for seeding...');
    await Hospital.deleteMany({});
    await Doctor.deleteMany({});
    await Review.deleteMany({});

    // 1. Seed Hospitals
    const hospitals = [
      { name: 'Metro General Hospital', city: 'New York', address: '120 Broadway, New York, NY' },
      { name: 'Care & Wellness Hospital', city: 'Chicago', address: '450 Michigan Ave, Chicago, IL' },
      { name: 'Heart & Vascular Institute', city: 'Houston', address: '980 Fannin St, Houston, TX' }
    ];
    const seededHospitals = await Hospital.insertMany(hospitals);
    console.log(`✅ Seeded ${seededHospitals.length} Hospital Clinics.`);

    // 2. Seed Doctors (10 per specialization = 90 doctors)
    const salt = bcrypt.genSaltSync(12);
    const password = bcrypt.hashSync('doctor123', salt);

    const specs = [
      'General Physician',
      'Dermatologist',
      'Neurologist',
      'Ophthalmologist',
      'Orthopedic',
      'Cardiologist',
      'Psychiatrist',
      'Dentist',
      'ENT Specialist'
    ];

    const firstNames = [
      'James', 'Sarah', 'Robert', 'Allison', 'Eric', 'Lisa', 'Gregory', 'Mary', 
      'David', 'Patricia', 'John', 'Linda', 'Thomas', 'Nancy', 'William', 'Elizabeth',
      'Michael', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Charles', 'Karen',
      'Christopher', 'Jennifer', 'Matthew', 'Sandra', 'Daniel', 'Dorothy', 'Mark', 'Ashley',
      'Donald', 'Kimberly', 'Anthony', 'Emily', 'Paul', 'Donna', 'Steven', 'Michelle',
      'Andrew', 'Carol', 'Kenneth', 'Amanda', 'Joshua', 'Melissa', 'Kevin', 'Deborah'
    ];
    const lastNames = [
      'Wilson', 'Connor', 'Chase', 'Cameron', 'Foreman', 'Cuddy', 'House', 'Miller', 
      'Davis', 'Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Smith', 'Johnson',
      'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor',
      'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
      'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
      'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
    ];

    const seededDoctors = [];
    let docIdCounter = 1;

    for (const spec of specs) {
      for (let i = 1; i <= 10; i++) {
        const hospIndex = (docIdCounter - 1) % 3;
        const hosp = seededHospitals[hospIndex];

        const firstName = firstNames[(docIdCounter - 1) % firstNames.length];
        const lastName = lastNames[(docIdCounter - 1) % lastNames.length];
        const fullName = `Dr. ${firstName} ${lastName}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${docIdCounter}@medical.com`;

        const experience = 4 + (docIdCounter % 15); // 4 to 18 years
        const fee = 45 + (docIdCounter % 9) * 15; // $45 to $165

        const doc = {
          fullName,
          specialization: spec,
          qualification: (i % 3 === 0) ? 'DDS/DNB Specialist' : (i % 2 === 0) ? 'MS - Board Certified' : 'MD - Specialist',
          experience,
          hospitalId: hosp._id,
          hospitalName: hosp.name,
          city: hosp.city,
          languages: hospIndex === 0 ? ['English', 'Spanish'] : hospIndex === 1 ? ['English', 'French'] : ['English'],
          consultationFee: fee,
          rating: 4.0 + (docIdCounter % 10) * 0.1, // 4.0 to 4.9
          profileImage: '',
          about: `Highly dedicated medical professional specializing in ${spec}. Committed to patient wellness.`,
          availableDays: hospIndex === 0 ? ['Monday', 'Wednesday', 'Friday'] : hospIndex === 1 ? ['Tuesday', 'Thursday'] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          availableTimeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'],
          email,
          phone: `+1 555-01${10 + docIdCounter}`,
          password,
          status: 'Active'
        };

        seededDoctors.push(doc);
        docIdCounter++;
      }
    }

    const savedDoctors = await Doctor.insertMany(seededDoctors);
    console.log(`✅ Seeded ${savedDoctors.length} Doctors.`);

    // 3. Seed mock reviews (2 per doctor)
    const mockReviews = [];
    const reviewTexts = [
      'Very professional doctor, listened carefully to all my issues and suggested a detailed plan.',
      'Excellent consultation. The hospital branch was very clean and staff were cooperative.',
      'Highly recommend this doctor. Very supportive, friendly, and answered all queries.',
      'Extremely satisfied with the service and practical medical advice given.'
    ];
    const patientNames = ['Alice Green', 'Bob White', 'Charlie Brown', 'Diana Ross'];

    for (const doc of savedDoctors) {
      for (let r = 0; r < 2; r++) {
        const rating = 4 + (r % 2); // 4 or 5 star rating
        const text = reviewTexts[(doc.fullName.length + r) % reviewTexts.length];
        const patientName = patientNames[(doc.fullName.length + r) % patientNames.length];

        mockReviews.push({
          doctorId: doc._id,
          patientName,
          rating,
          reviewText: text
        });
      }
    }

    await Review.insertMany(mockReviews);
    console.log(`✅ Seeded ${mockReviews.length} Mock Patient Reviews.`);
  } catch (err) {
    console.error('❌ Failed to seed database:', err.message);
  }
};

const seedMedicines = async () => {
  try {
    const Medicine = require('../medicine/medicine.model');

    const medCount = await Medicine.countDocuments();
    if (medCount >= 17) {
      console.log('ℹ️ Medicines already exist in MongoDB. Skipping seed.');
      return;
    }

    console.log('🧹 Cleaning existing medicine collection for seeding...');
    await Medicine.deleteMany({});

    const medicines = [
      {
        medicineName: 'Paracetamol 650mg',
        genericName: 'Paracetamol / Acetaminophen',
        brandName: 'Dolo 650',
        category: 'Pain Relief',
        description: 'Paracetamol is a widely used analgesic (pain reliever) and antipyretic (fever reducer) drug.',
        uses: ['Fever', 'Pain Relief', 'Headache', 'Mild Arthritis', 'Toothache'],
        sideEffects: ['Nausea', 'Skin Rash', 'Allergic reactions (rare)'],
        warnings: ['Avoid taking with other paracetamol-containing products.', 'Consult doctor for liver issues.'],
        precautions: ['Take after food', 'Do not exceed 4g per day', 'Avoid alcohol'],
        howItWorks: 'It works by blocking chemical messengers in the brain that tell us we have pain, and regulates body temperature in the brain.',
        pregnancySafety: 'Generally considered safe, but consult a doctor first.',
        breastfeedingSafety: 'Safe in recommended doses, consult healthcare provider.',
        drivingWarning: 'No influence on driving capacity.',
        alcoholWarning: 'Avoid alcohol as it increases risk of liver damage.',
        foodInteractions: 'No significant food interactions.',
        drugInteractions: 'Interaction with warfarin (blood thinners) and other cold/flu remedies.',
        storageInstructions: 'Store below 30°C in a dry place.',
        expiryInfo: '24 months from manufacturing date.',
        prescriptionRequired: false,
        manufacturer: 'Micro Labs Ltd',
        availableStrengths: ['500mg', '650mg', '1000mg'],
        availableForms: ['Tablet', 'Syrup', 'Suspension'],
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Ibuprofen 400mg',
        genericName: 'Ibuprofen',
        brandName: 'Advil',
        category: 'Pain Relief',
        description: 'Ibuprofen is a nonsteroidal anti-inflammatory drug (NSAID) used for treating pain, fever, and inflammation.',
        uses: ['Pain Relief', 'Headache', 'Back Pain', 'Muscle Stiffness', 'Joint Pain'],
        sideEffects: ['Nausea', 'Vomiting', 'Dizziness', 'Stomach upset'],
        warnings: ['May increase risk of stomach ulcers.', 'Avoid if you have active asthma or heart conditions.'],
        precautions: ['Take after food', 'Drink enough water', 'Avoid overdose'],
        howItWorks: 'It works by blocking the production of prostaglandins, which are chemicals that cause pain and inflammation in the body.',
        pregnancySafety: 'Avoid in the third trimester of pregnancy.',
        breastfeedingSafety: 'Considered safe, but consult doctor first.',
        drivingWarning: 'May cause mild dizziness in some patients.',
        alcoholWarning: 'Avoid alcohol as it increases stomach bleeding risk.',
        foodInteractions: 'Take with food or milk to avoid stomach irritation.',
        drugInteractions: 'Interacts with aspirin, other NSAIDs, and blood pressure medications.',
        storageInstructions: 'Store at room temperature (15-30°C).',
        expiryInfo: '36 months from manufacturing date.',
        prescriptionRequired: false,
        manufacturer: 'Pfizer Inc',
        availableStrengths: ['200mg', '400mg', '600mg'],
        availableForms: ['Tablet', 'Capsule', 'Liquid Gel'],
        image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin',
        brandName: 'Amoxil',
        category: 'Antibiotics',
        description: 'Amoxicillin is a penicillin-type antibiotic used to treat a wide variety of bacterial infections.',
        uses: ['Bacterial Infections', 'Sore Throat', 'Ear Pain', 'Sinusitis', 'Pneumonia'],
        sideEffects: ['Nausea', 'Diarrhea', 'Skin Rash', 'Vomiting'],
        warnings: ['Finish the full course of treatment.', 'Do not use if allergic to penicillin.'],
        precautions: ['Do not stop suddenly', 'Drink enough water', 'Take at fixed times'],
        howItWorks: 'It prevents bacteria from forming their protective cell wall, which is essential for their survival.',
        pregnancySafety: 'Generally considered safe, consult doctor first.',
        breastfeedingSafety: 'Passes into breast milk in small amounts, consult physician.',
        drivingWarning: 'No known effects on driving capacity.',
        alcoholWarning: 'Avoid alcohol to support immune recovery.',
        foodInteractions: 'Can be taken with or without food.',
        drugInteractions: 'Interaction with birth control pills and methotrexate.',
        storageInstructions: 'Store below 25°C in a dry place.',
        expiryInfo: '24 months from manufacturing date.',
        prescriptionRequired: true,
        manufacturer: 'GlaxoSmithKline',
        availableStrengths: ['250mg', '500mg'],
        availableForms: ['Capsule', 'Tablet', 'Suspension'],
        image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Vitamin C 500mg',
        genericName: 'Ascorbic Acid (Vitamin C)',
        brandName: 'Limcee',
        category: 'Vitamins',
        description: 'Vitamin C is an essential vitamin and antioxidant that helps build immunity, skin health, and blood vessels.',
        uses: ['Immunity', 'Cold', 'Fatigue', 'Skin Care', 'Scurvy prevention'],
        sideEffects: ['Heartburn', 'Nausea (in high doses)', 'Diarrhea (in high doses)'],
        warnings: ['Do not exceed the daily recommended dosage.', 'Consult doctor for kidney stones.'],
        precautions: ['Take after food', 'Drink enough water'],
        howItWorks: 'Acts as an antioxidant, helping protect cells from damage caused by free radicals, and supports immune cell function.',
        pregnancySafety: 'Safe during pregnancy in recommended daily limits.',
        breastfeedingSafety: 'Safe when taken within recommended dietary allowance.',
        drivingWarning: 'No effect on driving ability.',
        alcoholWarning: 'No known interactions.',
        foodInteractions: 'Improves absorption of iron from vegetable sources.',
        drugInteractions: 'High doses may interact with blood thinners like warfarin.',
        storageInstructions: 'Store in a dry place below 25°C.',
        expiryInfo: '18 months from manufacturing.',
        prescriptionRequired: false,
        manufacturer: 'Abbott Healthcare',
        availableStrengths: ['500mg', '1000mg'],
        availableForms: ['Chewable Tablet', 'Effervescent Tablet'],
        image: 'https://images.unsplash.com/photo-1616679911721-fe6eec10fcd8?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Metformin 500mg',
        genericName: 'Metformin Hydrochloride',
        brandName: 'Glucophage',
        category: 'Diabetes',
        description: 'Metformin is an oral diabetes medicine that helps control blood sugar levels for people with type 2 diabetes.',
        uses: ['Diabetes', 'Insulin Resistance', 'PCOS management'],
        sideEffects: ['Nausea', 'Vomiting', 'Diarrhea', 'Metallic taste in mouth'],
        warnings: ['Risk of lactic acidosis (rare but serious).', 'Monitor kidney function regularly.'],
        precautions: ['Take after food', 'Do not stop suddenly', 'Avoid alcohol'],
        howItWorks: 'It works by reducing glucose production in the liver, increasing insulin sensitivity in muscle tissue, and delaying glucose absorption in intestines.',
        pregnancySafety: 'Consult doctor; insulin is often preferred.',
        breastfeedingSafety: 'Consult healthcare provider before use.',
        drivingWarning: 'May cause low blood sugar if combined with other diabetes drugs.',
        alcoholWarning: 'Avoid alcohol as it increases risk of lactic acidosis.',
        foodInteractions: 'Take with meals to reduce gastrointestinal side effects.',
        drugInteractions: 'Interacts with contrast dyes, diuretics, and cimetidine.',
        storageInstructions: 'Store below 25°C.',
        expiryInfo: '36 months.',
        prescriptionRequired: true,
        manufacturer: 'Merck KGaA',
        availableStrengths: ['500mg', '850mg', '1000mg'],
        availableForms: ['Tablet', 'Extended Release Tablet'],
        image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Amlodipine 5mg',
        genericName: 'Amlodipine Besylate',
        brandName: 'Norvasc',
        category: 'Blood Pressure',
        description: 'Amlodipine is a calcium channel blocker that dilates blood vessels, lowering blood pressure and improving blood flow.',
        uses: ['Hypertension', 'Angina (Chest Pain)'],
        sideEffects: ['Dizziness', 'Ankle swelling (edema)', 'Headache', 'Sleepiness'],
        warnings: ['May cause low blood pressure (hypotension).', 'Monitor blood pressure regularly.'],
        precautions: ['Drink enough water', 'Do not stop suddenly', 'Avoid sudden posture changes'],
        howItWorks: 'It relaxes the blood vessels, making it easier for the heart to pump blood around the body.',
        pregnancySafety: 'Not recommended unless benefit outweighs risk; consult doctor.',
        breastfeedingSafety: 'Consult physician before use.',
        drivingWarning: 'May cause dizziness. Use caution when driving.',
        alcoholWarning: 'Avoid alcohol as it can further lower blood pressure.',
        foodInteractions: 'Avoid grapefruit juice as it increases drug concentration.',
        drugInteractions: 'Interacts with other blood pressure medicines and sildenafil.',
        storageInstructions: 'Store in a dry place at room temperature.',
        expiryInfo: '24 months.',
        prescriptionRequired: true,
        manufacturer: 'Viatris Inc',
        availableStrengths: ['2.5mg', '5mg', '10mg'],
        availableForms: ['Tablet'],
        image: 'https://images.unsplash.com/photo-1628771065518-0d82f15d8562?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Cetirizine 10mg',
        genericName: 'Cetirizine Hydrochloride',
        brandName: 'Zyrtec',
        category: 'Cold & Flu',
        description: 'Cetirizine is an antihistamine that reduces the natural chemical histamine in the body, treating allergy symptoms.',
        uses: ['Allergy', 'Cold', 'Cough', 'Skin Rash', 'Itching', 'Runny nose'],
        sideEffects: ['Sleepiness', 'Dry Mouth', 'Dizziness', 'Fatigue'],
        warnings: ['Avoid activities requiring alertness until you know how it affects you.', 'Limit sedative use.'],
        precautions: ['Take after food', 'Avoid alcohol', 'Do not exceed dose'],
        howItWorks: 'It works by blocking histamine receptors, which stops allergic reactions like sneezing, runny nose, and itching.',
        pregnancySafety: 'Generally safe, consult doctor before use.',
        breastfeedingSafety: 'Excreted in breast milk, consult doctor.',
        drivingWarning: 'May cause drowsiness. Avoid driving if feeling sleepy.',
        alcoholWarning: 'Avoid alcohol as it worsens drowsiness.',
        foodInteractions: 'No major food interactions.',
        drugInteractions: 'Interacts with muscle relaxants and sleeping pills.',
        storageInstructions: 'Store in cool place.',
        expiryInfo: '36 months.',
        prescriptionRequired: false,
        manufacturer: 'Johnson & Johnson',
        availableStrengths: ['5mg', '10mg'],
        availableForms: ['Tablet', 'Syrup'],
        image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Pantoprazole 40mg',
        genericName: 'Pantoprazole Sodium',
        brandName: 'Protonix',
        category: 'Digestive Health',
        description: 'Pantoprazole is a proton pump inhibitor (PPI) that decreases the amount of acid produced in the stomach.',
        uses: ['Acidity', 'Stomach Ulcers', 'Acid Reflux (GERD)'],
        sideEffects: ['Headache', 'Diarrhea', 'Nausea', 'Dry Mouth'],
        warnings: ['Long-term use may cause magnesium deficiency.', 'Do not crush or chew tablets.'],
        precautions: ['Take 30 mins before food', 'Avoid spicy food', 'Drink enough water'],
        howItWorks: 'It works by turning off the acid-producing pumps (proton pumps) in the cells lining your stomach.',
        pregnancySafety: 'Consult doctor before taking.',
        breastfeedingSafety: 'Passes into breast milk, consult doctor.',
        drivingWarning: 'No restriction.',
        alcoholWarning: 'Avoid alcohol as it stimulates stomach acid production.',
        foodInteractions: 'Take on empty stomach, preferably in the morning.',
        drugInteractions: 'Interacts with ketoconazole and iron supplements.',
        storageInstructions: 'Store below 25°C.',
        expiryInfo: '24 months.',
        prescriptionRequired: true,
        manufacturer: 'Takeda Pharmaceutical',
        availableStrengths: ['20mg', '40mg'],
        availableForms: ['Tablet', 'Injection'],
        image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Atorvastatin 10mg',
        genericName: 'Atorvastatin Calcium',
        brandName: 'Lipitor',
        category: 'Heart Medicines',
        description: 'Atorvastatin is a statin that lowers "bad" cholesterol and triglycerides in the blood, reducing heart disease risk.',
        uses: ['High Cholesterol', 'Heart attack prevention'],
        sideEffects: ['Muscle aches (myalgia)', 'Diarrhea', 'Nausea', 'Joint Pain'],
        warnings: ['Avoid if you have liver disease.', 'Report unexplained muscle pain immediately.'],
        precautions: ['Take at fixed times', 'Follow low-cholesterol diet', 'Avoid alcohol'],
        howItWorks: 'It blocks an enzyme in the liver that is responsible for producing cholesterol.',
        pregnancySafety: 'Strictly prohibited during pregnancy. Causes birth defects.',
        breastfeedingSafety: 'Contraindicated during breastfeeding.',
        drivingWarning: 'No known influence.',
        alcoholWarning: 'Limit alcohol consumption to protect liver.',
        foodInteractions: 'Avoid large amounts of grapefruit juice.',
        drugInteractions: 'Interacts with erythromycin, ketoconazole, and cyclosporine.',
        storageInstructions: 'Store at room temperature.',
        expiryInfo: '24 months.',
        prescriptionRequired: true,
        manufacturer: 'Viatris Inc',
        availableStrengths: ['10mg', '20mg', '40mg', '80mg'],
        availableForms: ['Tablet'],
        image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Montelukast 10mg',
        genericName: 'Montelukast Sodium',
        brandName: 'Singulair',
        category: 'Respiratory',
        description: 'Montelukast is a leukotriene receptor antagonist used to prevent asthma attacks and treat seasonal allergies.',
        uses: ['Asthma prevention', 'Allergy', 'Cold', 'Cough', 'Wheezing'],
        sideEffects: ['Headache', 'Dizziness', 'Sleepiness', 'Nasal congestion'],
        warnings: ['Not for treating acute asthma attacks.', 'Monitor for mood or behavioral changes.'],
        precautions: ['Take night', 'Do not stop suddenly', 'Drink enough water'],
        howItWorks: 'It blocks leukotrienes, which are substances in the body that cause inflammation and tightening of airways.',
        pregnancySafety: 'Generally considered safe, consult doctor.',
        breastfeedingSafety: 'Consult physician before use.',
        drivingWarning: 'May cause drowsiness or dizziness in rare cases.',
        alcoholWarning: 'Avoid alcohol to prevent increased drowsiness.',
        foodInteractions: 'Can be taken with or without food.',
        drugInteractions: 'Interacts with phenobarbital and rifampin.',
        storageInstructions: 'Store away from light and moisture.',
        expiryInfo: '36 months.',
        prescriptionRequired: true,
        manufacturer: 'Organon & Co.',
        availableStrengths: ['4mg', '5mg', '10mg'],
        availableForms: ['Chewable Tablet', 'Tablet', 'Granules'],
        image: 'https://images.unsplash.com/photo-1628771065518-0d82f15d8562?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Carboxymethylcellulose 0.5%',
        genericName: 'Carboxymethylcellulose Sodium',
        brandName: 'Refresh Tears',
        category: 'Eye Care',
        description: 'Carboxymethylcellulose is a lubricating eye drop used to relieve dry, irritated eyes.',
        uses: ['Dry Eyes', 'Eye itching', 'Eye irritation'],
        sideEffects: ['Temporary blurred vision', 'Mild eye burning', 'Eye itching'],
        warnings: ['Remove contact lenses before applying.', 'Do not touch dropper tip to any surface.'],
        precautions: ['Wash hands before use', 'Discard open bottles after 30 days'],
        howItWorks: 'It acts as an artificial tear to wet and lubricate the surface of the eye.',
        pregnancySafety: 'Safe to use as it acts locally in the eye.',
        breastfeedingSafety: 'Safe to use.',
        drivingWarning: 'May cause temporary blurred vision right after application.',
        alcoholWarning: 'No known interactions.',
        foodInteractions: 'No food interactions.',
        drugInteractions: 'Allow 10 minutes between using other eye medications.',
        storageInstructions: 'Store below 25°C. Do not freeze.',
        expiryInfo: '18 months (but discard 1 month after opening).',
        prescriptionRequired: false,
        manufacturer: 'Allergan Inc.',
        availableStrengths: ['0.5%', '1%'],
        availableForms: ['Eye Drops'],
        image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Salicylic Acid 2% Gel',
        genericName: 'Salicylic Acid',
        brandName: 'Sebogel',
        category: 'Skin Care',
        description: 'Salicylic acid is a beta-hydroxy acid (BHA) that exfoliates the skin, unclogs pores, and treats acne.',
        uses: ['Acne', 'Pimples', 'Skin Care', 'Blackheads'],
        sideEffects: ['Skin peeling', 'Mild skin burning', 'Dry skin', 'Redness'],
        warnings: ['For external use only.', 'Avoid contact with eyes, mouth, and broken skin.'],
        precautions: ['Apply thin layer', 'Use sunscreen during daytime', 'Avoid overdose'],
        howItWorks: 'It works by helping the skin to shed dead cells from the top layer and by decreasing redness and swelling.',
        pregnancySafety: 'Consult dermatologist; high concentrations are not recommended.',
        breastfeedingSafety: 'Consult physician; do not apply to chest area.',
        drivingWarning: 'No influence.',
        alcoholWarning: 'No interactions.',
        foodInteractions: 'No interactions.',
        drugInteractions: 'Interacts with other peeling agents like benzoyl peroxide or retinoids (may cause excessive dryness).',
        storageInstructions: 'Store below 25°C. Do not freeze.',
        expiryInfo: '24 months.',
        prescriptionRequired: false,
        manufacturer: 'Cipla Ltd',
        availableStrengths: ['1%', '2%'],
        availableForms: ['Gel', 'Ointment', 'Face Wash'],
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Hydrocortisone Cream 1%',
        genericName: 'Hydrocortisone',
        brandName: 'Cortizone-10',
        category: 'Skin Care',
        description: 'Hydrocortisone is a topical corticosteroid that reduces swelling, itching, and redness associated with various skin conditions.',
        uses: ['Skin Rash', 'Itching', 'Allergy', 'Eczema', 'Insect bites'],
        sideEffects: ['Skin irritation', 'Dryness', 'Redness', 'Thinning of skin (long-term)'],
        warnings: ['Do not use on open wounds or infected skin.', 'Do not use for more than 7 days without consulting a doctor.'],
        precautions: ['Apply thin layer', 'Wash hands before and after application', 'Avoid contact with eyes'],
        howItWorks: 'It works by activating natural substances in the skin to reduce swelling, redness, and itching.',
        pregnancySafety: 'Consult physician; use only if clearly needed.',
        breastfeedingSafety: 'Consult physician; do not apply to breast area before feeding.',
        drivingWarning: 'No influence on driving.',
        alcoholWarning: 'No known interactions.',
        foodInteractions: 'No interactions.',
        drugInteractions: 'No major topical interactions, but consult doctor if using other corticosteroids.',
        storageInstructions: 'Store between 20-25°C.',
        expiryInfo: '24 months.',
        prescriptionRequired: false,
        manufacturer: 'Chattem Inc.',
        availableStrengths: ['0.5%', '1%', '2.5%'],
        availableForms: ['Cream', 'Ointment'],
        image: 'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Ketoconazole Cream 2%',
        genericName: 'Ketoconazole',
        brandName: 'Nizoral Cream',
        category: 'Skin Care',
        description: 'Ketoconazole is a topical antifungal medication used to treat fungal skin infections like ringworm, athlete\'s foot, and jock itch.',
        uses: ['Fungal Infections', 'Ringworm', 'Athlete\'s foot', 'Jock itch', 'Seborrheic dermatitis'],
        sideEffects: ['Skin burning', 'Irritation', 'Redness', 'Dry skin'],
        warnings: ['For external dermatological use only.', 'Avoid contact with eyes, nose, or mouth.'],
        precautions: ['Apply to clean and dry area', 'Wash hands after use', 'Complete full course'],
        howItWorks: 'It prevents the growth of fungi by inhibiting the synthesis of ergosterol, a vital component of fungal cell membranes.',
        pregnancySafety: 'Consult physician before use.',
        breastfeedingSafety: 'Consult doctor; ensure baby does not come in contact with treated areas.',
        drivingWarning: 'No influence.',
        alcoholWarning: 'No known interactions.',
        foodInteractions: 'No interactions.',
        drugInteractions: 'No major topical interactions.',
        storageInstructions: 'Store below 25°C. Do not freeze.',
        expiryInfo: '36 months.',
        prescriptionRequired: true,
        manufacturer: 'Janssen Pharmaceuticals',
        availableStrengths: ['2%'],
        availableForms: ['Cream', 'Gel'],
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Benzoyl Peroxide 5% Gel',
        genericName: 'Benzoyl Peroxide',
        brandName: 'Persa-Gel 5',
        category: 'Skin Care',
        description: 'Benzoyl peroxide is an antibacterial gel used to treat acne vulgaris by reducing acne-causing bacteria and drying out pimples.',
        uses: ['Acne', 'Pimples', 'Blackheads', 'Oily skin'],
        sideEffects: ['Skin peeling', 'Redness', 'Severe dryness', 'Burning sensation'],
        warnings: ['Avoid contact with hair or colored fabrics as it may bleach them.', 'Limit sun exposure and use sunscreen.'],
        precautions: ['Start with once daily application', 'Apply moisturizer to avoid dryness', 'Avoid contact with eyes and lips'],
        howItWorks: 'It works by releasing oxygen that kills Cutibacterium acnes bacteria, and helps peel away dead skin cells to unclog pores.',
        pregnancySafety: 'Consult dermatologist before using.',
        breastfeedingSafety: 'Consult physician; do not apply to breast area.',
        drivingWarning: 'No influence.',
        alcoholWarning: 'No interactions.',
        foodInteractions: 'No interactions.',
        drugInteractions: 'May cause excessive irritation if used with topical retinoids or salicylic acid.',
        storageInstructions: 'Store at 15-30°C.',
        expiryInfo: '24 months.',
        prescriptionRequired: false,
        manufacturer: 'Johnson & Johnson',
        availableStrengths: ['2.5%', '5%', '10%'],
        availableForms: ['Gel', 'Wash'],
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Mupirocin Ointment 2%',
        genericName: 'Mupirocin',
        brandName: 'Bactroban',
        category: 'Skin Care',
        description: 'Mupirocin is a topical antibiotic ointment used to treat bacterial skin infections, such as impetigo or folliculitis.',
        uses: ['Bacterial Infections', 'Impetigo', 'Folliculitis', 'Infected wounds'],
        sideEffects: ['Burning sensation', 'Stinging', 'Pain at application site', 'Itching'],
        warnings: ['Do not use over large areas of open skin.', 'Stop use if sensitization or severe local irritation occurs.'],
        precautions: ['Apply 2-3 times daily', 'Cover with sterile dressing if needed', 'Wash hands after use'],
        howItWorks: 'It specifically blocks bacterial protein synthesis by binding to bacterial isoleucyl transfer-RNA synthetase, preventing growth.',
        pregnancySafety: 'Consult doctor; use only if clearly required.',
        breastfeedingSafety: 'Consult physician; breast milk feeding should be temporarily paused if applying near the breast.',
        drivingWarning: 'No known influence.',
        alcoholWarning: 'No interactions.',
        foodInteractions: 'No food interactions.',
        drugInteractions: 'Do not mix with other topical preparations on the same skin area.',
        storageInstructions: 'Store below 25°C. Do not freeze.',
        expiryInfo: '24 months.',
        prescriptionRequired: true,
        manufacturer: 'GlaxoSmithKline',
        availableStrengths: ['2%'],
        availableForms: ['Ointment', 'Cream'],
        image: 'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=400&q=80'
      },
      {
        medicineName: 'Calamine Lotion',
        genericName: 'Calamine / Zinc Oxide',
        brandName: 'Caladryl Lotion',
        category: 'Skin Care',
        description: 'Calamine lotion is an anti-pruritic (anti-itching) agent used to soothe mild skin irritations, sunburn, and rashes.',
        uses: ['Skin Rash', 'Itching', 'Sunburn', 'Poison ivy irritation', 'Chickenpox itch'],
        sideEffects: ['Mild skin irritation (rare)', 'Redness (rare)'],
        warnings: ['For external use only. Shake well before use.', 'Do not apply to eyes, mucous membranes, or open weeping wounds.'],
        precautions: ['Apply with cotton pad', 'Allow to dry on skin', 'Store out of reach of children'],
        howItWorks: 'Calamine acts as a mild astringent and Zinc Oxide acts as a skin protectant, providing a cooling and soothing sensation on the skin.',
        pregnancySafety: 'Considered safe for topical use during pregnancy.',
        breastfeedingSafety: 'Considered safe, avoid applying to breast area before feeding.',
        drivingWarning: 'No influence.',
        alcoholWarning: 'No interactions.',
        foodInteractions: 'No interactions.',
        drugInteractions: 'No known topical drug interactions.',
        storageInstructions: 'Store below 30°C. Protect from freezing.',
        expiryInfo: '36 months.',
        prescriptionRequired: false,
        manufacturer: 'Piramal Enterprises',
        availableStrengths: ['Standard Formulation'],
        availableForms: ['Lotion'],
        image: 'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=400&q=80'
      }
    ];

    await Medicine.insertMany(medicines);
    console.log(`✅ Seeded ${medicines.length} Medicines.`);
  } catch (err) {
    console.error('❌ Failed to seed medicines database:', err.message);
  }
};

const seedFitnessData = async () => {
  try {
    const YogaSession = require('../fitness/yoga.model');
    const MeditationSession = require('../fitness/meditation.model');

    const yogaCount = await YogaSession.countDocuments();
    if (yogaCount === 0) {
      console.log('🧹 Seeding Yoga Poses database...');
      const yogaData = [
        {
          yogaName: 'Balasana (Child Pose)',
          category: 'Beginner Yoga',
          difficulty: 'Beginner',
          duration: 5,
          calories: 15,
          benefits: ['Stretches lower spine', 'Relaxes mind', 'Calms breath'],
          equipment: ['Yoga Mat'],
          videoUrl: '2n0S-mK3v3U',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Surya Namaskar (Sun Salutation)',
          category: 'Morning Yoga',
          difficulty: 'Intermediate',
          duration: 12,
          calories: 70,
          benefits: ['Full body warmup', 'Improves circulation', 'Boosts energy'],
          equipment: ['Yoga Mat'],
          videoUrl: 's2S3B_UaC-g',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Viparita Karani (Legs Up Wall)',
          category: 'Evening Yoga',
          difficulty: 'Beginner',
          duration: 10,
          calories: 20,
          benefits: ['Improves lymphatic drainage', 'Relieves leg fatigue', 'Promotes deep sleep'],
          equipment: ['Yoga Mat', 'Wall'],
          videoUrl: '8mZkbGjL5tA',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Marjaryasana-Bitilasana (Cat-Cow)',
          category: 'Back Pain Yoga',
          difficulty: 'Beginner',
          duration: 8,
          calories: 25,
          benefits: ['Stretches cervical and lumbar spine', 'Relieves core stiffness'],
          equipment: ['Yoga Mat'],
          videoUrl: 'wz_K2J5r5Xg',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Phalakasana (Plank Pose)',
          category: 'Weight Loss Yoga',
          difficulty: 'Intermediate',
          duration: 5,
          calories: 45,
          benefits: ['Tones abdominal muscle', 'Strengthens shoulder girdle'],
          equipment: ['Yoga Mat'],
          videoUrl: 'pvI5y1QzOUI',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Anjaneyasana (Crescent Lunge)',
          category: 'Flexibility Yoga',
          difficulty: 'Intermediate',
          duration: 6,
          calories: 30,
          benefits: ['Opens tight hip flexors', 'Stretches quadriceps'],
          equipment: ['Yoga Mat'],
          videoUrl: 'U4q8d4WpB3Y',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Savasana (Corpse Pose)',
          category: 'Stress Relief Yoga',
          difficulty: 'Beginner',
          duration: 10,
          calories: 10,
          benefits: ['Reduces neurological fatigue', 'Lowers blood pressure'],
          equipment: ['Yoga Mat'],
          videoUrl: '1v6K-uR4v1M',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Bhujangasana (Cobra Pose)',
          category: 'Neck Pain Yoga',
          difficulty: 'Beginner',
          duration: 5,
          calories: 22,
          benefits: ['Strengthens spine', 'Relieves neck tension'],
          equipment: ['Yoga Mat'],
          videoUrl: 'fOdrW7nF2Qo',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Seated Spinal Twist',
          category: 'Office Yoga',
          difficulty: 'Beginner',
          duration: 4,
          calories: 15,
          benefits: ['Relieves sitting compression', 'Aids abdominal digestion'],
          equipment: ['Office Chair'],
          videoUrl: 'gL-y1YvTz1U',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Chair Warrior I Pose',
          category: 'Chair Yoga',
          difficulty: 'Beginner',
          duration: 5,
          calories: 18,
          benefits: ['Safe stretching for seniors', 'Improves upper back posture'],
          equipment: ['Chair'],
          videoUrl: 'vN1o6VwR-l0',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Baddha Konasana (Bound Angle)',
          category: 'Pregnancy Yoga (Educational)',
          difficulty: 'Beginner',
          duration: 8,
          calories: 15,
          benefits: ['Opens pelvic floor', 'Relieves hip tightness'],
          equipment: ['Yoga Block', 'Mat'],
          videoUrl: 'Kk4d5lWvP0c',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        },
        {
          yogaName: 'Vrikshasana (Tree Pose)',
          category: 'Senior Citizen Yoga',
          difficulty: 'Beginner',
          duration: 5,
          calories: 12,
          benefits: ['Improves balance', 'Strengthens ankles and knees'],
          equipment: ['Mat', 'Wall for balance'],
          videoUrl: 'Jp4wO8B-n8Y',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80'
        }
      ];
      await YogaSession.insertMany(yogaData);
      console.log('✅ Yoga Sessions Seeded.');
    }

    const medCount = await MeditationSession.countDocuments();
    if (medCount === 0) {
      console.log('🧹 Seeding Meditation guides database...');
      const medData = [
        {
          title: '5 Minute Morning Grounding',
          category: '5 Minute Meditation',
          duration: 5,
          benefits: ['Quick morning centering', 'Calms early day rush'],
          difficulty: 'Beginner',
          audioUrl: '',
          videoUrl: 'inpok4MKVLM'
        },
        {
          title: '10 Minute Body Scan Mindfulness',
          category: '10 Minute Meditation',
          duration: 10,
          benefits: ['Increases physical awareness', 'Relieves muscle tension'],
          difficulty: 'Beginner',
          audioUrl: '',
          videoUrl: '6p_yaNFSYao'
        },
        {
          title: 'Deep Sleep Guided Relaxation',
          category: 'Sleep Meditation',
          duration: 20,
          benefits: ['Prepares brain for deep sleep', 'Lowers racing thoughts'],
          difficulty: 'Beginner',
          audioUrl: '',
          videoUrl: 'aEqlQvczMJ0'
        },
        {
          title: 'Workplace Stress Relief Meditation',
          category: 'Stress Relief',
          duration: 12,
          benefits: ['Reduces cortisol stress response', 'Restores focus'],
          difficulty: 'Beginner',
          audioUrl: '',
          videoUrl: 'z6X5oEIg6Ak'
        },
        {
          title: 'Mindful Breathing and Present Living',
          category: 'Mindfulness',
          duration: 15,
          benefits: ['Promotes positive self-talk', 'Increases emotional stability'],
          difficulty: 'Intermediate',
          audioUrl: '',
          videoUrl: 'ssss7V1_eyA'
        },
        {
          title: 'Anxiety Release guided session',
          category: 'Anxiety Relief',
          duration: 15,
          benefits: ['Soothes nervous system', 'Stops panic loops'],
          difficulty: 'Beginner',
          audioUrl: '',
          videoUrl: 'O-6f5wQXSu8'
        },
        {
          title: 'Laser Focus & Cognitive Centering',
          category: 'Focus Meditation',
          duration: 10,
          benefits: ['Improves attention span', 'Increases memory retention'],
          difficulty: 'Intermediate',
          audioUrl: '',
          videoUrl: '4pLUleLg5ts'
        },
        {
          title: 'Deep Relaxation & Yoga Nidra Preview',
          category: 'Deep Relaxation',
          duration: 25,
          benefits: ['Triggers parasympathetic state', 'Soothes nerves'],
          difficulty: 'Advanced',
          audioUrl: '',
          videoUrl: '7H0FKzeuVVs'
        },
        {
          title: 'Pranayama & Alternate Nostril Breathwork',
          category: 'Breathing Exercises',
          duration: 8,
          benefits: ['Balances left and right brain hemisphere', 'Oxygenates tissues'],
          difficulty: 'Beginner',
          audioUrl: '',
          videoUrl: 'Y9jG6X-z-w4'
        }
      ];
      await MeditationSession.insertMany(medData);
      console.log('✅ Meditation Sessions Seeded.');
    }
  } catch (err) {
    console.error('❌ Failed to seed fitness data:', err.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host} — DB: ${conn.connection.name}`);
    await seedDoctors();
    await seedMedicines();
    await seedFitnessData();
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
