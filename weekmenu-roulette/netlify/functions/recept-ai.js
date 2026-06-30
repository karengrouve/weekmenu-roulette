exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GROQ_API_KEY niet gevonden in environment variables' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ongeldige JSON in request body' }) };
  }

  const { ingredient, gang, personen, categorie } = body;

  if (!ingredient) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Geen ingrediënt meegegeven' }) };
  }

  const prompt = `Je bent een enthousiaste Nederlandse thuiskok. Bedenk een lekker recept voor ${personen} personen met als basis: "${ingredient}". Het is een ${gang}.

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
        max_tokens: 1500,
        temperature: 0.8,
      }),
    });

    const groqData = await response.json();

    if (!response.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Groq fout: ' + JSON.stringify(groqData) }),
      };
    }

    const tekst = groqData.choices?.[0]?.message?.content || '';
    const clean = tekst.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Kon JSON niet parsen: ' + clean.substring(0, 200) }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Fetch fout: ' + err.message }),
    };
  }
};
