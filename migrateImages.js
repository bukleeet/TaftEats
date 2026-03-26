require('dotenv').config();
const mongoose = require('mongoose');

// adjusting to point to your establishment model
const Establishment = require('./src/models/establishments'); 

const imageMap = {
  'prelude.jpg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355974/prelude_bsfysd.jpg',
  'barn.jpeg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355966/barn_w3nyn3.jpg',
  'barn.jpg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355966/barn_w3nyn3.jpg',
  'asterisko.png': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355966/asterisko_fhumbz.png',
  'kuhmeal.png': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355973/kuhmeal_pmtnhx.png',
  'laelotes.png': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355974/laelotes_cclthl.png',
  'ganggangchicken.png': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355967/ganggangchicken_uwgdjt.png',
  'callecafe.png': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355967/callecafe_j2paba.png',
  'illo.jpeg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355967/illo_zxpdhl.jpg',
  'illo.jpg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355967/illo_zxpdhl.jpg',
  'angrydobo.jpeg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355966/angrydobo_ouhqvx.jpg',
  'angrydobo.jpg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355966/angrydobo_ouhqvx.jpg',
  'dapithapon.jpeg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355966/dapithapon_f05wor.jpg',
  'dapithapon.jpg': 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355966/dapithapon_f05wor.jpg'
};

async function fixEstablishmentImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const establishments = await Establishment.find({});
    let updatedCount = 0;

    for (const est of establishments) {
      // correctly targeting the image field this time
      if (est.image && imageMap[est.image]) {
        est.image = imageMap[est.image];
        await est.save();
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} establishments.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixEstablishmentImages();