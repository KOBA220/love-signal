const MODEL = 'claude-sonnet-4-6';

function jsonResponse(res, status, body) {
  res.status(status).json(body);
}

function cleanText(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function buildPrompt({ platform, selectedPerson, myName, period, chatText }) {
  return `あなたは恋愛心理の専門家AIです。以下のトーク履歴（${platform}）の内容まで丁寧に読み取り、「${selectedPerson}」が「${myName}」に対してどの程度好意（脈あり）を持っているか、また現在どのような関係性に近いかを診断してください。

【分析観点】
1. 返信速度・頻度：${selectedPerson}の返信時間帯や間隔のパターン
2. 絵文字・スタンプの使い方：使用頻度・種類・感情の豊かさ
3. メッセージの長さ・内容：会話の深さ・具体的な質問・興味の示し方
4. 会話の主導権：どちらが先に話しかけるか、どちらが話題を展開するか
5. 関係性予測：会話内容から、知人・友達・親友・気になる相手・恋愛候補など、どの距離感に近いか
6. 恋愛トークの量と盛り上がり：恋愛、好み、デート、嫉妬、将来、褒め言葉、照れ、駆け引きなどの話題がどれくらいあり、相手がどれだけ乗っているか

【回答形式】必ずJSON形式のみで返してください。余分なテキスト・コードブロック不要：
{"percent":整数(0-100),"verdict":"一言判定（例：脈あり濃厚💕）","score_speed":整数(0-100),"score_emoji":整数(0-100),"score_length":整数(0-100),"score_initiative":整数(0-100),"score_relationship":整数(0-100),"score_romance_talk":整数(0-100),"relationship_stage":"関係性予測を短く（例：友達以上恋人未満）","analysis":"詳細分析250〜350字。内容面・関係性予測・恋愛トークの量と盛り上がりを必ず含める（改行あり）","advice":"次のアクション提案100〜150字"}

【トーク履歴（${platform} / 最新${period}ヶ月 / ${selectedPerson}→${myName}）】
${chatText}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonResponse(res, 405, { error: 'POSTメソッドでアクセスしてください。' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(res, 500, { error: 'サーバーにANTHROPIC_API_KEYが設定されていません。' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return jsonResponse(res, 400, { error: 'リクエストJSONの形式が正しくありません。' });
  }
  const platform = cleanText(body.platform, 30);
  const selectedPerson = cleanText(body.selectedPerson, 80);
  const myName = cleanText(body.myName, 80);
  const period = Number(body.period || 0);
  const chatText = cleanText(body.chatText, 9000);

  if (!platform || !selectedPerson || !myName || !period || chatText.length < 100) {
    return jsonResponse(res, 400, { error: '診断に必要な情報が不足しています。' });
  }

  const prompt = buildPrompt({ platform, selectedPerson, myName, period, chatText });

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      const message = err.error?.message || `APIエラー (${anthropicRes.status})`;
      return jsonResponse(res, anthropicRes.status, { error: message });
    }

    const data = await anthropicRes.json();
    const text = data.content.map((b) => b.text || '').join('');

    let result;
    try {
      result = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return jsonResponse(res, 502, { error: 'AIの回答の解析に失敗しました。再度お試しください。' });
    }

    return jsonResponse(res, 200, result);
  } catch (error) {
    return jsonResponse(res, 500, { error: error.message || '分析中にエラーが発生しました。' });
  }
};
