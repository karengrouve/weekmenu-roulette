exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key niet geconfigureerd' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ongeldige request' }) };
  }

  const { ingredient, gang, personen, categorie } = body;

  const prompt = `Je bent een enthousiaste thuiskok. Bedenk een lekker recept voor ${personen} personen met als basis: "${ingredient}". Het is een ${gang}.

Geef je antwoord ALLEEN als geldig JSON, zonder uitleg, geen markdown, geen codeblok. Exact dit formaat:
{
  "naam": "naam van het recept",
  "ingredienten": ["hoeveelheid + ingrediënt", "..."],
  "bereiding": ["Stap 1 beschrijving", "Stap 2 beschrijving", "..."],
  "tip": "een handige kooktip (of lege string)"
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const tekst = data.choices?.[0]?.message?.content || '';
    const clean = tekst.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Recept genereren mislukt: ' + err.message }),
    };
  }
};
