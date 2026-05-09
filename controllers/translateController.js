const axios = require('axios');

console.log('Google Key loaded:', process.env.GOOGLE_TRANSLATE_KEY?.slice(0, 10));

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const translateText = async (req, res) => {
  const { texts, targetLang } = req.body;

  if (!texts || !targetLang) {
    return res.status(400).json({ error: 'texts and targetLang are required' });
  }

  try {
    const chunks = chunkArray(texts, 100);
    const allResults = [];

    for (const chunk of chunks) {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_KEY}`,
        {
          q: chunk,
          source: 'en',
          target: targetLang,
          format: 'text'
        }
      );

      const translations = response.data.data.translations.map(t => t.translatedText);
      allResults.push(...translations);
    }

    console.log(`✅ Translated ${allResults.length} texts instantly!`);
    res.json({ translations: allResults });

  } catch (err) {
    console.error('Full error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Translation failed' });
  }
};

module.exports = { translateText };